import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getUserAccounts = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: [
      { id: 'usr-1', name: 'System Administrator', email: 'admin@eduerp.edu', username: 'admin_eduerp', role: 'Super Admin', profileType: 'Staff', lastLogin: '10 mins ago', status: 'Active' },
      { id: 'usr-2', name: 'Dr. S. N. Roy', email: 'sn.roy@eduerp.edu', username: 'sn_roy', role: 'Faculty', profileType: 'Faculty', lastLogin: '1 hour ago', status: 'Active' },
      { id: 'usr-4', name: 'Rahul Verma', email: 'rahul.verma@eduerp.edu', username: 'rahul_v', role: 'Student', profileType: 'Student', lastLogin: '25 mins ago', status: 'Active' }
    ]
  });
};

export const getRoles = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: [
      { id: 'role-super-admin', name: 'Super Admin', description: 'Unrestricted full administrative access', isSystem: true, userCount: 1 },
      { id: 'role-admin', name: 'Admin', description: 'Administrative access for academic operations', isSystem: true, userCount: 2 },
      { id: 'role-faculty', name: 'Faculty', description: 'Teaching portal access', isSystem: true, userCount: 18 },
      { id: 'role-student', name: 'Student', description: 'Student self-service portal', isSystem: true, userCount: 420 }
    ]
  });
};
