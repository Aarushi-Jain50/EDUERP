import { Router } from 'express';
import { getStudents, getFaculty, getParents } from '../controllers/people.controller';
import { RbacRole } from '../db/auth-store';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/students', requireRole([RbacRole.ADMIN, RbacRole.FACULTY]), getStudents);
router.get('/faculty', requireRole([RbacRole.ADMIN, RbacRole.FACULTY]), getFaculty);
router.get('/parents', requireRole([RbacRole.ADMIN]), getParents);

export default router;
