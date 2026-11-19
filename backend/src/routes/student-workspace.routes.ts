import { Router } from 'express';
import {
  createStudyTask,
  deleteStudyTask,
  getWorkspaceState,
  updateAcademicGoal,
  updateStudyTask
} from '../controllers/student-workspace.controller';

const router = Router();

router.get('/state', getWorkspaceState);
router.post('/todos', createStudyTask);
router.patch('/todos/:id', updateStudyTask);
router.delete('/todos/:id', deleteStudyTask);
router.put('/goal', updateAcademicGoal);

export default router;
