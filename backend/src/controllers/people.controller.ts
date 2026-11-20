import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getStudents = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const getFaculty = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const getParents = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};
