import { Router } from 'express';
import { getStudents, getFaculty, getParents } from '../controllers/people.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/students', getStudents);
router.get('/faculty', getFaculty);
router.get('/parents', getParents);

export default router;
