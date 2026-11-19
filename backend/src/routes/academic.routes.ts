import { Router } from 'express';
import { getAcademicYears, getDepartments, getCourses } from '../controllers/academic.controller';
import { RbacRole } from '../db/auth-store';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get(
  '/academic-years',
  requireRole([RbacRole.ADMIN, RbacRole.FACULTY, RbacRole.STUDENT, RbacRole.PARENT]),
  getAcademicYears
);
router.get(
  '/departments',
  requireRole([RbacRole.ADMIN, RbacRole.FACULTY, RbacRole.STUDENT, RbacRole.PARENT]),
  getDepartments
);
router.get(
  '/courses',
  requireRole([RbacRole.ADMIN, RbacRole.FACULTY, RbacRole.STUDENT, RbacRole.PARENT]),
  getCourses
);

export default router;
