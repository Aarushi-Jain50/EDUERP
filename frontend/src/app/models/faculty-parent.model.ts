export type DesignationType = 'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Lecturer';
export type FacultyStatus = 'Active' | 'On Leave' | 'Inactive';

export interface Faculty {
  id: string;
  employeeId: string;
  name: string;
  initials: string;
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  phone: string;
  departmentId: string;
  department: string;
  designation: DesignationType;
  qualification: string;
  experienceYears: number;
  experience: string;
  joiningDate: string;
  status: FacultyStatus;
  isHod?: boolean;
}

export type ParentRelation = 'Father' | 'Mother' | 'Guardian';

export interface Parent {
  id: string;
  name: string;
  initials: string;
  relation: ParentRelation;
  phone: string;
  email: string;
  occupation: string;
  address: string;
  studentIds: string[];
  studentNames: string[];
  status: 'Active' | 'Inactive';
}
