import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  getAcademicYearsList,
  getCoursesList,
  getDepartmentsList
} from '../../../src/db/users.ts';

export const getAcademicYears = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await getAcademicYearsList();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch academic years:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch academic years' });
  }
};

export const getDepartments = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await getDepartmentsList();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch departments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

export const getCourses = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await getCoursesList();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};
