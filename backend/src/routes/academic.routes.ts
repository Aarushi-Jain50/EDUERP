import { Router } from 'express';
import { getAcademicYears, getDepartments, getCourses } from '../controllers/academic.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/academic-years', getAcademicYears);
router.get('/departments', getDepartments);
router.get('/courses', getCourses);

export default router;
