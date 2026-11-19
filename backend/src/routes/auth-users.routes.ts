import { Router } from 'express';
import {
  adminForgotPassword,
  adminLoginStep1,
  adminResend2FA,
  adminResetPassword,
  adminVerify2FA,
  createAdminAccount,
  firebaseSyncUser,
  getAdmin2FASetup,
  getAuthAuditLogs,
  getRoles,
  getSession,
  getUserAccounts,
  logoutSession,
  registerPublicUser
} from '../controllers/auth.controller';
import { RbacRole } from '../db/auth-store';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public Admin Secure Login & 2FA Verification Endpoints
router.post('/admin/login', adminLoginStep1);
router.post('/admin/verify-2fa', adminVerify2FA);
router.post('/admin/resend-2fa', adminResend2FA);
router.post('/admin/forgot-password', adminForgotPassword);
router.post('/admin/reset-password', adminResetPassword);

// Public Non-Admin Registration & Firebase User Sync
router.post('/register', registerPublicUser);
router.post('/firebase-sync', firebaseSyncUser);

// Session Management
router.post('/logout', logoutSession);
router.get('/session', authenticateToken, getSession);

// Strictly Protected Admin-Only Endpoints
router.get('/users', authenticateToken, requireRole([RbacRole.ADMIN]), getUserAccounts);
router.get('/roles', authenticateToken, requireRole([RbacRole.ADMIN]), getRoles);
router.post('/admin/accounts', authenticateToken, requireRole([RbacRole.ADMIN]), createAdminAccount);
router.get('/admin/2fa/setup', authenticateToken, requireRole([RbacRole.ADMIN]), getAdmin2FASetup);
router.get('/admin/audit-logs', authenticateToken, requireRole([RbacRole.ADMIN]), getAuthAuditLogs);

export default router;
