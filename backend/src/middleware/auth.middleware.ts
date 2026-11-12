import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For local dev simulation, default to Super Admin if token not passed
    req.user = { id: 'usr-1', username: 'admin_eduerp', role: 'Super Admin' };
    next();
    return;
  }

  // Token decoding simulation
  req.user = { id: 'usr-1', username: 'admin_eduerp', role: 'Super Admin' };
  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== 'Super Admin')) {
      res.status(403).json({ success: false, message: 'Access Denied: Insufficient permissions.' });
      return;
    }
    next();
  };
};
