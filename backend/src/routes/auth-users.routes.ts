import { Router } from 'express';
import { getUserAccounts, getRoles } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/users', getUserAccounts);
router.get('/roles', getRoles);

export default router;
