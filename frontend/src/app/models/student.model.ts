export interface GuardianInfo {
  name: string;
  relation: string;
  phone: string;
}

export interface Student {
  id: string;
  enrollmentNo: string;
  name: string;
  initials: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  email: string;
  phone: string;
  address: string;
  courseId: string;
  course: string;
  departmentId: string;
  department: string;
  semester: string;
  sectionId: string;
  section: string;
  admissionDate: string;
  status: 'Active' | 'Inactive' | 'Passed Out';
  guardian: GuardianInfo;
}

export type AdmissionStatus = 'Applied' | 'Under Review' | 'Approved' | 'Rejected' | 'Enrolled';

export interface StudentAdmission {
  id: string;
  applicationNo: string;
  applicantName: string;
  initials: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  email: string;
  phone: string;
  address: string;
  courseId: string;
  courseApplied: string;
  departmentId: string;
  department: string;
  appliedOn: string;
  previousQualification: string;
  percentage: number;
  status: AdmissionStatus;
  guardian: GuardianInfo;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}
