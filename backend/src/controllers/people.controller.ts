import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  getFacultyList,
  getParentsList,
  getStudentsList
} from '../../../src/db/users.ts';

export const getStudents = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await getStudentsList();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

export const getFaculty = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await getFacultyList();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch faculty:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculty' });
  }
};

export const getParents = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await getParentsList();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch parents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch parents' });
  }
};
