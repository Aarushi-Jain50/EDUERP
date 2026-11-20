export type DocumentVerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface VerificationDocument {
  key: string;
  label: string;
  status: DocumentVerificationStatus;
  verifiedBy?: string;
  updatedAt?: string;
}

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
  batchName?: string;
  academicYear?: string;
  admissionDate: string;
  status: 'Active' | 'Inactive' | 'Passed Out';
  guardian: GuardianInfo;
  documents?: VerificationDocument[];
  remarks?: string;
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
  documents?: VerificationDocument[];
  reviewNotes?: string;
}

export interface BulkStudentImportRow {
  enrollmentNo?: string;
  name: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  email: string;
  phone: string;
  address?: string;
  course: string;
  semester?: string;
  section?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}
