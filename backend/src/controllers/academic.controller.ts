import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getAcademicYears = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const getDepartments = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const getCourses = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};
