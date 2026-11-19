import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import {
  RbacRole,
  ensureAuthReady,
  findAuthUserById,
  isSessionActive,
  verifyJwt
} from '../db/auth-store';
import { adminAuth } from '../../../src/lib/firebase-admin.ts';
import { getOrCreateUser } from '../../../src/db/users.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    uid?: string;
    email: string;
    username: string;
    name: string;
    role: RbacRole;
    isSuperAdmin: boolean;
    jti: string;
  };
  firebaseUser?: DecodedIdToken;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function extractRequestToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers['cookie']);
  if (cookies['eduerp_token']) {
    return cookies['eduerp_token'];
  }
  return null;
}

function toRbacRole(rawRole: string | undefined): RbacRole {
  const upper = (rawRole ?? '').toUpperCase();
  if (upper === RbacRole.ADMIN) return RbacRole.ADMIN;
  if (upper === RbacRole.FACULTY) return RbacRole.FACULTY;
  if (upper === RbacRole.PARENT) return RbacRole.PARENT;
  return RbacRole.STUDENT;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractRequestToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required. Please sign in.'
    });
    return;
  }

  try {
    await ensureAuthReady();
  } catch (err) {
    console.error('Failed to initialize Cloud SQL auth store:', err);
    res.status(503).json({
      success: false,
      code: 'DB_UNAVAILABLE',
      message: 'Database service temporarily unavailable.'
    });
    return;
  }

  // 1. Check signed internal Admin/Session JWT first
  const verified = verifyJwt(token);
  if (verified.valid) {
    const { payload } = verified;

    const active = await isSessionActive(payload.jti, payload.sub);
    if (!active) {
      res.status(401).json({
        success: false,
        code: 'SESSION_REVOKED',
        message: 'Session has been terminated or revoked. Please sign in again.'
      });
      return;
    }

    const user = await findAuthUserById(payload.sub);

    if (!user || user.status !== 'Active') {
      res.status(401).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'Account is inactive or unavailable.'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      jti: payload.jti
    };
    next();
    return;
  }

  // 2. Fall back to Firebase Auth ID Token verification + Cloud SQL PostgreSQL user sync
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = (decodedToken.email ?? '').trim().toLowerCase();
    const displayName = typeof decodedToken['name'] === 'string' ? decodedToken['name'] : '';
    const syncedUser = await getOrCreateUser(decodedToken.uid, email || `${decodedToken.uid}@eduerp.local`, displayName);

    req.firebaseUser = decodedToken;
    req.user = {
      id: `fb-${decodedToken.uid}`,
      uid: decodedToken.uid,
      email: syncedUser.email,
      username: email ? email.split('@')[0] : decodedToken.uid,
      name: syncedUser.name || displayName || email || 'EduERP User',
      role: toRbacRole(syncedUser.role),
      isSuperAdmin: false,
      jti: decodedToken.uid
    };
    next();
    return;
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    res.status(401).json({
      success: false,
      code: verified.reason === 'EXPIRED' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message:
        verified.reason === 'EXPIRED'
          ? 'Your session has expired. Please authenticate again.'
          : 'Invalid authentication token.'
    });
  }
};

export const requireRole = (allowedRoles: readonly RbacRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Access Denied: You do not have permission to access this resource.'
      });
      return;
    }

    next();
  };
};
