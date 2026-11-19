import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { AuthenticatedRequest, extractRequestToken } from '../middleware/auth.middleware';
import {
  RbacRole,
  buildTotpUri,
  createAdminUserInDb,
  createSession,
  ensureAuthReady,
  findActiveAdminByEmail,
  findAuthUserByEmail,
  findAuthUserById,
  findAuthUserByUsername,
  findChallengeByIdAndUser,
  findLatestActivePasswordResetChallenge,
  hashPassword,
  insertPublicAuthUser,
  issueOtpChallenge,
  listAuthAuditLogs,
  listAuthUsers,
  logAudit,
  markChallengeUsed,
  maskEmail,
  recordFailedAdminAttempt,
  resetAdminFailedAttempts,
  revokeAllUserSessions,
  revokeSession,
  toSafeUser,
  updateAdminPassword,
  validateStrongPassword,
  verifyChallengeToken,
  verifyJwt,
  verifyOtpChallengeCode,
  verifyPassword,
  verifyTotpCode
} from '../db/auth-store';
import { adminAuth } from '../../../src/lib/firebase-admin.ts';
import { getOrCreateUser, getUserByUid, upsertPortalUserAccount } from '../../../src/db/users.ts';

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || '127.0.0.1';
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie('eduerp_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60 * 1000
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie('eduerp_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

export const adminLoginStep1 = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const ip = getClientIp(req);

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both administrator email and password.'
      });
      return;
    }

    const user = await findAuthUserByEmail(email);

    if (!user || user.role !== RbacRole.ADMIN) {
      await logAudit({
        email,
        role: 'ADMIN',
        event: 'ADMIN_LOGIN_PRIMARY',
        status: 'FAILURE',
        ip,
        details: 'Invalid email or non-admin account rejected.'
      });
      res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.'
      });
      return;
    }

    if (user.status !== 'Active') {
      await logAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        event: 'ADMIN_LOGIN_PRIMARY',
        status: 'BLOCKED',
        ip,
        details: `Account status is ${user.status}.`
      });
      res.status(403).json({
        success: false,
        message: 'This administrator account is currently suspended or inactive.'
      });
      return;
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
      await logAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        event: 'ADMIN_LOGIN_LOCKED',
        status: 'BLOCKED',
        ip,
        details: `Lockout active for ${minutesLeft} more minute(s).`
      });
      res.status(429).json({
        success: false,
        message: `Too many failed attempts. Account temporarily locked for ${minutesLeft} minute(s).`
      });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      const attemptResult = await recordFailedAdminAttempt(user);
      await logAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        event: 'ADMIN_LOGIN_PRIMARY',
        status: 'FAILURE',
        ip,
        details: attemptResult.locked
          ? 'Account locked after maximum failed password attempts.'
          : `Incorrect password. ${attemptResult.remaining} attempt(s) remaining.`
      });
      res.status(attemptResult.locked ? 429 : 401).json({
        success: false,
        message: attemptResult.locked
          ? 'Too many failed attempts. Administrator access temporarily locked for 15 minutes.'
          : 'Invalid administrator credentials.'
      });
      return;
    }

    await resetAdminFailedAttempts(user.id);
    const challenge = await issueOtpChallenge(user, 'LOGIN_2FA');

    await logAudit({
      userId: user.id,
      email: user.email,
      role: user.role,
      event: 'ADMIN_2FA_ISSUED',
      status: 'SUCCESS',
      ip,
      details: 'Primary password verified; awaiting 2FA verification.'
    });

    res.json({
      success: true,
      requires2FA: true,
      challengeToken: challenge.challengeToken,
      expiresInSeconds: challenge.expiresInSeconds,
      maskedEmail: maskEmail(user.email),
      methods: user.totpSecret ? ['email_otp', 'totp'] : ['email_otp'],
      message: 'Primary credentials verified. Enter your 6-digit verification code to continue.'
    });
  } catch (error) {
    console.error('Error in adminLoginStep1:', error);
    res.status(500).json({ success: false, message: 'Internal server error during sign-in.' });
  }
};

export const adminVerify2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAuthReady();
    const body = (req.body ?? {}) as { challengeToken?: unknown; code?: unknown; method?: unknown };
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const method = body.method === 'totp' ? 'totp' : 'email_otp';
    const ip = getClientIp(req);

    if (!challengeToken || !/^\d{6}$/.test(code)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit security verification code.'
      });
      return;
    }

    const verifiedToken = verifyChallengeToken(challengeToken, 'LOGIN_2FA');
    if (!verifiedToken) {
      res.status(401).json({
        success: false,
        message: '2FA verification session has expired. Please sign in again.'
      });
      return;
    }

    const user = await findAuthUserById(verifiedToken.uid);

    if (!user || user.role !== RbacRole.ADMIN || user.status !== 'Active') {
      res.status(403).json({
        success: false,
        message: 'Administrator account is not authorized.'
      });
      return;
    }

    if (method === 'totp') {
      const challengeRow = await findChallengeByIdAndUser(verifiedToken.cid, user.id);

      if (!challengeRow || challengeRow.used || challengeRow.expiresAt <= Date.now()) {
        res.status(401).json({
          success: false,
          message: '2FA challenge is no longer valid. Please sign in again.'
        });
        return;
      }

      if (!verifyTotpCode(user.totpSecret, code)) {
        await logAudit({
          userId: user.id,
          email: user.email,
          role: user.role,
          event: 'ADMIN_2FA_VERIFY_TOTP',
          status: 'FAILURE',
          ip,
          details: 'Invalid Authenticator TOTP code.'
        });
        res.status(401).json({
          success: false,
          message: 'Invalid Authenticator App code. Check your device clock and try again.'
        });
        return;
      }

      await markChallengeUsed(verifiedToken.cid);
    } else {
      const check = await verifyOtpChallengeCode(verifiedToken.cid, user.id, 'LOGIN_2FA', code);
      if (!check.ok) {
        await logAudit({
          userId: user.id,
          email: user.email,
          role: user.role,
          event: 'ADMIN_2FA_VERIFY_EMAIL_OTP',
          status: 'FAILURE',
          ip,
          details: check.message
        });
        res.status(401).json({
          success: false,
          message: check.message
        });
        return;
      }
    }

    const session = await createSession(user, String(req.headers['user-agent'] || ''));
    setAuthCookie(res, session.token);

    await logAudit({
      userId: user.id,
      email: user.email,
      role: user.role,
      event: 'ADMIN_LOGIN_COMPLETE',
      status: 'SUCCESS',
      ip,
      details: `Authenticated via 2FA (${method}).`
    });

    res.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: toSafeUser(user)
    });
  } catch (error) {
    console.error('Error in adminVerify2FA:', error);
    res.status(500).json({ success: false, message: 'Internal server error during 2FA verification.' });
  }
};

export const adminResend2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAuthReady();
    const body = (req.body ?? {}) as { challengeToken?: unknown };
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken.trim() : '';

    const verifiedToken = verifyChallengeToken(challengeToken, 'LOGIN_2FA');
    if (!verifiedToken) {
      res.status(401).json({
        success: false,
        message: 'Your sign-in session expired. Please enter your credentials again.'
      });
      return;
    }

    const user = await findAuthUserById(verifiedToken.uid);

    if (!user || user.role !== RbacRole.ADMIN || user.status !== 'Active') {
      res.status(403).json({
        success: false,
        message: 'Account not eligible for administrator 2FA.'
      });
      return;
    }

    const nextChallenge = await issueOtpChallenge(user, 'LOGIN_2FA');
    await logAudit({
      userId: user.id,
      email: user.email,
      role: user.role,
      event: 'ADMIN_2FA_RESENT',
      status: 'SUCCESS',
      ip: getClientIp(req),
      details: 'Issued new Email OTP challenge.'
    });

    res.json({
      success: true,
      challengeToken: nextChallenge.challengeToken,
      expiresInSeconds: nextChallenge.expiresInSeconds,
      maskedEmail: maskEmail(user.email),
      message: 'A fresh 6-digit verification code has been dispatched.'
    });
  } catch (error) {
    console.error('Error in adminResend2FA:', error);
    res.status(500).json({ success: false, message: 'Internal server error while resending 2FA code.' });
  }
};

export const adminForgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const ip = getClientIp(req);

    if (!email || !email.includes('@')) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
      return;
    }

    const user = await findActiveAdminByEmail(email);

    if (user) {
      await issueOtpChallenge(user, 'PASSWORD_RESET');
      await logAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        event: 'ADMIN_PASSWORD_RESET_REQUEST',
        status: 'SUCCESS',
        ip,
        details: 'Recovery verification code dispatched.'
      });
    } else {
      await logAudit({
        email,
        role: 'ADMIN',
        event: 'ADMIN_PASSWORD_RESET_REQUEST',
        status: 'FAILURE',
        ip,
        details: 'Requested recovery for unknown or non-admin email.'
      });
    }

    res.json({
      success: true,
      message: 'If an authorized administrator account matches that email, a 6-digit recovery code has been dispatched.'
    });
  } catch (error) {
    console.error('Error in adminForgotPassword:', error);
    res.status(500).json({ success: false, message: 'Internal server error during password recovery.' });
  }
};

export const adminResetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as { email?: unknown; code?: unknown; newPassword?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const ip = getClientIp(req);

    if (!email || !/^\d{6}$/.test(code) || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Email, 6-digit recovery code, and new password are required.'
      });
      return;
    }

    const strengthErr = validateStrongPassword(newPassword);
    if (strengthErr) {
      res.status(400).json({
        success: false,
        message: strengthErr
      });
      return;
    }

    const user = await findActiveAdminByEmail(email);

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired password recovery code.'
      });
      return;
    }

    const latestChallenge = await findLatestActivePasswordResetChallenge(user.id);

    if (!latestChallenge) {
      res.status(400).json({
        success: false,
        message: 'No active recovery challenge found. Please request a new code.'
      });
      return;
    }

    const check = await verifyOtpChallengeCode(latestChallenge.id, user.id, 'PASSWORD_RESET', code);
    if (!check.ok) {
      await logAudit({
        userId: user.id,
        email: user.email,
        role: user.role,
        event: 'ADMIN_PASSWORD_RESET_CONFIRM',
        status: 'FAILURE',
        ip,
        details: check.message
      });
      res.status(400).json({
        success: false,
        message: check.message
      });
      return;
    }

    await updateAdminPassword(user.id, hashPassword(newPassword));
    await revokeAllUserSessions(user.id);

    await logAudit({
      userId: user.id,
      email: user.email,
      role: user.role,
      event: 'ADMIN_PASSWORD_RESET_CONFIRM',
      status: 'SUCCESS',
      ip,
      details: 'Password updated and all active sessions revoked.'
    });

    res.json({
      success: true,
      message: 'Administrator password updated successfully. You may now sign in.'
    });
  } catch (error) {
    console.error('Error in adminResetPassword:', error);
    res.status(500).json({ success: false, message: 'Internal server error while resetting password.' });
  }
};

export const getSession = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No active session.' });
    return;
  }
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      isSuperAdmin: req.user.isSuperAdmin
    }
  });
};

export const logoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAuthReady();
    const token = extractRequestToken(req);
    if (token) {
      const verified = verifyJwt(token);
      if (verified.valid) {
        await revokeSession(verified.payload.jti);
        await logAudit({
          userId: verified.payload.sub,
          email: verified.payload.email,
          role: verified.payload.role,
          event: 'LOGOUT',
          status: 'SUCCESS',
          ip: getClientIp(req),
          details: 'Session revoked cleanly on logout.'
        });
      }
    }
  } catch (error) {
    console.error('Error during logoutSession:', error);
  }
  clearAuthCookie(res);
  res.json({ success: true, message: 'Signed out cleanly.' });
};

export const registerPublicUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as {
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
      identifierCode?: unknown;
      departmentOrProgram?: unknown;
    };
    const ip = getClientIp(req);

    const rawRole = typeof body.role === 'string' ? body.role.trim().toUpperCase() : '';
    if (rawRole === 'ADMIN' || rawRole === 'SUPERADMIN' || rawRole === 'SUPER ADMIN') {
      await logAudit({
        email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
        role: rawRole,
        event: 'PUBLIC_REGISTER',
        status: 'BLOCKED',
        ip,
        details: 'Rejected public registration attempt for privileged ADMIN role.'
      });
      res.status(403).json({
        success: false,
        message: 'Public registration for Administrator accounts is strictly prohibited.'
      });
      return;
    }

    if (rawRole !== RbacRole.STUDENT && rawRole !== RbacRole.FACULTY && rawRole !== RbacRole.PARENT) {
      res.status(400).json({
        success: false,
        message: 'Registration role must be Student, Faculty, or Parent.'
      });
      return;
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const identifierCode = typeof body.identifierCode === 'string' ? body.identifierCode.trim() : '';
    const departmentOrProgram =
      typeof body.departmentOrProgram === 'string' ? body.departmentOrProgram.trim() : '';

    if (firstName.length < 2 || lastName.length < 2) {
      res.status(400).json({
        success: false,
        message: 'First name and last name must each be at least 2 characters.'
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid institutional email address.'
      });
      return;
    }

    if (password.trim().length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }

    const existing = await findAuthUserByEmail(email);
    if (existing) {
      await logAudit({
        email,
        role: rawRole,
        event: 'PUBLIC_REGISTER',
        status: 'FAILURE',
        ip,
        details: 'Email address already registered.'
      });
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
      return;
    }

    const baseHandle = `${firstName}_${lastName}`.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
    let username = `${baseHandle}_${crypto.randomInt(100, 999)}`;
    while (await findAuthUserByUsername(username)) {
      username = `${baseHandle}_${crypto.randomInt(1000, 9999)}`;
    }

    const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const fullName = `${firstName} ${lastName}`;
    const createdAt = new Date().toISOString();
    const passwordHash = hashPassword(password);

    await insertPublicAuthUser({
      id,
      name: fullName,
      username,
      email,
      passwordHash,
      role: rawRole,
      createdAt
    });

    const profileType =
      rawRole === RbacRole.FACULTY ? 'Faculty' : rawRole === RbacRole.PARENT ? 'Parent' : 'Student';

    await upsertPortalUserAccount({
      id,
      name: fullName,
      username,
      email,
      passwordHash,
      role: rawRole,
      profileType
    });

    const metaParts = [
      identifierCode ? `id=${identifierCode}` : '',
      departmentOrProgram ? `unit=${departmentOrProgram}` : ''
    ].filter(Boolean);

    await logAudit({
      userId: id,
      email,
      role: rawRole,
      event: 'PUBLIC_REGISTER',
      status: 'SUCCESS',
      ip,
      details: metaParts.length > 0 ? `Registered via portal (${metaParts.join(', ')})` : 'Registered via portal'
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      user: {
        id,
        name: fullName,
        username,
        email,
        role: rawRole
      }
    });
  } catch (error) {
    console.error('Error in registerPublicUser:', error);
    res.status(500).json({ success: false, message: 'Failed to register account in Cloud SQL.' });
  }
};

export const firebaseSyncUser = async (req: Request, res: Response): Promise<void> => {
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Unauthorized: Missing Firebase ID token.' });
    return;
  }

  const body = (req.body ?? {}) as { role?: unknown };
  const requestedRaw = typeof body.role === 'string' ? body.role.trim().toUpperCase() : '';
  const safeRequestedRole =
    requestedRaw === RbacRole.FACULTY || requestedRaw === RbacRole.STUDENT || requestedRaw === RbacRole.PARENT
      ? requestedRaw
      : RbacRole.STUDENT;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email ?? '').trim().toLowerCase();
    if (!email) {
      res.status(400).json({ success: false, message: 'Authenticated Google account must include an email.' });
      return;
    }

    const displayName =
      typeof decoded['name'] === 'string' && decoded['name'].trim()
        ? decoded['name'].trim()
        : email.split('@')[0];

    const existingUser = await getUserByUid(decoded.uid);
    const effectiveRole = existingUser?.role === RbacRole.ADMIN ? RbacRole.ADMIN : safeRequestedRole;
    const synced = await getOrCreateUser(decoded.uid, email, displayName, effectiveRole);

    const profileType =
      effectiveRole === RbacRole.ADMIN
        ? 'Staff'
        : effectiveRole === RbacRole.FACULTY
          ? 'Faculty'
          : effectiveRole === RbacRole.PARENT
            ? 'Parent'
            : 'Student';

    const cleanHandle = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'user';
    await upsertPortalUserAccount({
      id: `usr-${decoded.uid.slice(0, 12)}`,
      firebaseUid: decoded.uid,
      name: displayName,
      username: `${cleanHandle}_${decoded.uid.slice(0, 4)}`.slice(0, 40),
      email,
      passwordHash: 'firebase-oauth',
      role: effectiveRole,
      profileType
    });

    res.json({
      success: true,
      user: {
        uid: synced.uid,
        email: synced.email,
        name: synced.name || displayName,
        role: effectiveRole
      }
    });
  } catch (error) {
    console.error('Failed to verify Firebase token or sync Cloud SQL user:', error);
    res.status(401).json({
      success: false,
      message: 'Failed to authenticate Google session.'
    });
  }
};

export const createAdminAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as {
      name?: unknown;
      email?: unknown;
      username?: unknown;
      password?: unknown;
      isSuperAdmin?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name : '';
    const email = typeof body.email === 'string' ? body.email : '';
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const isSuperAdmin = Boolean(body.isSuperAdmin);

    const created = await createAdminUserInDb({
      name,
      email,
      username,
      password,
      isSuperAdmin,
      createdBy: req.user?.email || 'admin'
    });

    if (!created.ok) {
      res.status(400).json({ success: false, message: created.error });
      return;
    }

    await logAudit({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      event: 'ADMIN_ACCOUNT_CREATED',
      status: 'SUCCESS',
      ip: getClientIp(req),
      details: `Provisioned admin account for ${created.user.email}`
    });

    res.status(201).json({
      success: true,
      user: created.user,
      totpUri: created.totpUri
    });
  } catch (error) {
    console.error('Error in createAdminAccount:', error);
    res.status(500).json({ success: false, message: 'Failed to create administrator account.' });
  }
};

export const getAdmin2FASetup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }
    const user = await findAuthUserById(req.user.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'Administrator account not found.' });
      return;
    }

    res.json({
      success: true,
      totpEnabled: user.totpEnabled,
      secret: user.totpSecret,
      otpauthUri: buildTotpUri(user.email, user.totpSecret)
    });
  } catch (error) {
    console.error('Error in getAdmin2FASetup:', error);
    res.status(500).json({ success: false, message: 'Failed to load 2FA configuration.' });
  }
};

export const getUserAccounts = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await listAuthUsers();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getUserAccounts:', error);
    res.status(500).json({ success: false, message: 'Failed to load user accounts from Cloud SQL.' });
  }
};

export const getRoles = (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: [
      { id: RbacRole.ADMIN, name: 'ADMIN', description: 'Restricted administrative access with mandatory 2FA', isSystem: true },
      { id: RbacRole.FACULTY, name: 'FACULTY', description: 'Teaching portal access', isSystem: true },
      { id: RbacRole.STUDENT, name: 'STUDENT', description: 'Student self-service portal', isSystem: true },
      { id: RbacRole.PARENT, name: 'PARENT', description: 'Parent & guardian ward monitoring portal', isSystem: true }
    ]
  });
};

export const getAuthAuditLogs = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rows = await listAuthAuditLogs(100);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getAuthAuditLogs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs from Cloud SQL.' });
  }
};
