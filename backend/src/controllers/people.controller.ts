import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getStudents = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: [
      { id: 'stu-1', name: 'Rahul Verma', enrollmentNo: 'MCA-2025-001', courseName: 'MCA', semester: 2, sectionName: 'Section A', phone: '9876543210', email: 'rahul.verma@eduerp.edu', status: 'Active' },
      { id: 'stu-2', name: 'Ananya Sharma', enrollmentNo: 'MCA-2025-002', courseName: 'MCA', semester: 2, sectionName: 'Section A', phone: '9876543211', email: 'ananya.sharma@eduerp.edu', status: 'Active' },
      { id: 'stu-3', name: 'Priyanshu Das', enrollmentNo: 'BCA-2025-014', courseName: 'BCA', semester: 4, sectionName: 'Section B', phone: '9876543212', email: 'priyanshu.das@eduerp.edu', status: 'Active' }
    ]
  });
};

export const getFaculty = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: [
      { id: 'fac-1', name: 'Dr. S. N. Roy', employeeId: 'FAC-0001', departmentName: 'Computer Applications', designation: 'Professor & HOD', qualification: 'Ph.D in AI/ML', experienceYears: 18, email: 'sn.roy@eduerp.edu', status: 'Active' },
      { id: 'fac-2', name: 'Dr. Amit Joshi', employeeId: 'FAC-0002', departmentName: 'Computer Applications', designation: 'Associate Professor', qualification: 'Ph.D in Data Science', experienceYears: 12, email: 'amit.joshi@eduerp.edu', status: 'Active' },
      { id: 'fac-3', name: 'Prof. Meena Sharma', employeeId: 'FAC-0003', departmentName: 'Computer Applications', designation: 'Assistant Professor', qualification: 'M.Tech in CSE', experienceYears: 8, email: 'meena.sharma@eduerp.edu', status: 'Active' }
    ]
  });
};

export const getParents = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: [
      { id: 'par-1', name: 'Sanjay Verma', relation: 'Father', phone: '9812345678', email: 'sanjay.verma@gmail.com', linkedStudentNames: ['Rahul Verma'], status: 'Active' },
      { id: 'par-2', name: 'Sunita Sharma', relation: 'Mother', phone: '9812345679', email: 'sunita.sharma@gmail.com', linkedStudentNames: ['Ananya Sharma'], status: 'Active' }
    ]
  });
};
