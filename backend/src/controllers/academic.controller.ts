import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import pool from '../db/db.connection';

export const getAcademicYears = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, year_code AS year, start_date AS startDate, end_date AS endDate, status FROM academic_years ORDER BY start_date DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch academic years' });
  }
};

export const getDepartments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT d.id, d.name, d.code, f.name AS hodName, (SELECT COUNT(*) FROM faculty WHERE department_id = d.id) AS facultyCount, (SELECT COUNT(*) FROM students WHERE course_id IN (SELECT id FROM courses WHERE department_id = d.id)) AS studentCount, (SELECT COUNT(*) FROM courses WHERE department_id = d.id) AS coursesCount, d.status FROM departments d LEFT JOIN faculty f ON d.hod_id = f.id');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

export const getCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT c.id, c.name, c.code, d.name AS departmentName, c.level, c.duration_years AS durationYears, c.total_semesters AS totalSemesters, c.intake_capacity AS intakeCapacity, c.status FROM courses c JOIN departments d ON c.department_id = d.id');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};
