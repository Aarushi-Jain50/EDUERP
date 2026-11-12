import { Injectable, signal } from '@angular/core';

export interface StudentRecord {
  rollNo: string;
  name: string;
  program: string;
  semester: string;
  department: string;
  section: string;
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  cgpa: number;
  attendancePct: number;
  lectureAttended: number;
  lectureTotal: number;
  feeStatus: 'Paid' | 'Pending' | 'Partial';
  feePaidAmount: string;
  challanNo: string;
  fatherName: string;
  contact: string;
  email: string;
  admissionDate: string;
  hostelStatus: 'Hosteller' | 'Day Scholar';
}

export interface MajorProjectRecord {
  rollNo: string;
  studentName: string;
  projectTitle: string;
  guideName: string;
  synopsisStatus: 'Approved' | 'Revision Required' | 'Pending Review';
  midTermReview: string;
  plagiarismPct: number;
  gitRepo: string;
  hardboundCopies: number;
  vivaReadiness: 'Ready for External Board' | 'Report Pending' | 'Code Verification Pending';
}

export interface BiometricLog {
  id: string;
  rollNo: string;
  studentName: string;
  punchTime: string;
  deviceLocation: string;
  rfidTag: string;
  status: 'Present' | 'Late Entry' | 'Absent';
}

export interface ExamSchedule {
  courseCode: string;
  subject: string;
  program: string;
  date: string;
  time: string;
  hall: string;
  invigilator: string;
  totalStudents: number;
  maxMarks: number;
}

export interface AttendanceDefaulter {
  rollNo: string;
  name: string;
  program: string;
  department: string;
  attendancePct: number;
  shortfallLectures: number;
  parentContact: string;
  lastAbsentDate: string;
  alertSent: boolean;
  medicalCertSubmitted: boolean;
}

export interface FeeTransaction {
  txnId: string;
  rollNo: string;
  studentName: string;
  amount: string;
  date: string;
  mode: 'SBI i-Collect' | 'HDFC NetBanking' | 'UPI / QR' | 'Treasury Challan';
  receiptNo: string;
  status: 'Verified' | 'Pending Bank Sync';
}

export interface InstitutionalNotice {
  id: string;
  circularRef: string;
  title: string;
  date: string;
  category: 'Examination' | 'Academic' | 'Placement' | 'Administration';
  issuedBy: string;
  priority: 'High' | 'Normal';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  readonly institutionalInfo = signal({
    collegeName: 'University Institute of Computer Applications & Technology',
    universityAffiliation: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU) / State Tech Univ',
    collegeCode: 'INST-CODE: 133',
    session: 'Academic Session 2025-2026 (Even Semester)',
    currentTerm: 'MCA Semester IV & Final Year Engineering',
    adminName: 'Prof. Rajesh K. Sharma',
    adminRole: 'Dean (Academics & ERP Administrator)',
    adminEmail: 'admin@eduerp.edu',
    adminId: 'FAC-ADMIN-2026-MCA-001'
  });

  readonly students = signal<StudentRecord[]>([
    {
      rollNo: '22MCA042',
      name: 'Aarushi Jain',
      program: 'Master of Computer Applications',
      semester: 'Semester IV',
      department: 'Computer Applications',
      section: 'MCA-IV A',
      category: 'General',
      cgpa: 9.35,
      attendancePct: 96.4,
      lectureAttended: 162,
      lectureTotal: 168,
      feeStatus: 'Paid',
      feePaidAmount: '₹47,500',
      challanNo: 'SBI-DU68492014',
      fatherName: 'Mr. R. C. Jain',
      contact: '+91 98102 34567',
      email: 'aarushi.jain@eduerp.edu',
      admissionDate: '18 Aug 2024',
      hostelStatus: 'Day Scholar'
    },
    {
      rollNo: '22MCA018',
      name: 'Rohan Sharma',
      program: 'Master of Computer Applications',
      semester: 'Semester IV',
      department: 'Computer Applications',
      section: 'MCA-IV A',
      category: 'General',
      cgpa: 8.64,
      attendancePct: 68.2,
      lectureAttended: 114,
      lectureTotal: 168,
      feeStatus: 'Pending',
      feePaidAmount: '₹22,500',
      challanNo: 'HDFC-RTGS-99014',
      fatherName: 'Mr. Vivek Sharma',
      contact: '+91 98450 11234',
      email: 'rohan.sharma@eduerp.edu',
      admissionDate: '19 Aug 2024',
      hostelStatus: 'Hosteller'
    },
    {
      rollNo: '23BCS104',
      name: 'Priya Verma',
      program: 'B.Tech Computer Science & Engg',
      semester: 'Semester VI',
      department: 'Computer Science',
      section: 'CSE-VI B',
      category: 'OBC',
      cgpa: 9.12,
      attendancePct: 92.5,
      lectureAttended: 148,
      lectureTotal: 160,
      feeStatus: 'Paid',
      feePaidAmount: '₹62,000',
      challanNo: 'SBI-DU77492110',
      fatherName: 'Mr. Alok Verma',
      contact: '+91 98231 77654',
      email: 'priya.verma@eduerp.edu',
      admissionDate: '10 Aug 2023',
      hostelStatus: 'Day Scholar'
    },
    {
      rollNo: '23BCA022',
      name: 'Aditya Malhotra',
      program: 'Bachelor of Computer Applications',
      semester: 'Semester IV',
      department: 'Computer Applications',
      section: 'BCA-IV A',
      category: 'General',
      cgpa: 7.95,
      attendancePct: 71.8,
      lectureAttended: 112,
      lectureTotal: 156,
      feeStatus: 'Partial',
      feePaidAmount: '₹25,000',
      challanNo: 'UPI-RAZOR-88219',
      fatherName: 'Mr. Sanjay Malhotra',
      contact: '+91 97118 44321',
      email: 'aditya.malhotra@eduerp.edu',
      admissionDate: '22 Aug 2023',
      hostelStatus: 'Day Scholar'
    },
    {
      rollNo: '24MIT009',
      name: 'Neha Sen',
      program: 'M.Sc Information Technology',
      semester: 'Semester II',
      department: 'Information Technology',
      section: 'IT-II A',
      category: 'General',
      cgpa: 8.88,
      attendancePct: 94.0,
      lectureAttended: 139,
      lectureTotal: 148,
      feeStatus: 'Paid',
      feePaidAmount: '₹42,000',
      challanNo: 'SBI-DU88231004',
      fatherName: 'Mr. P. K. Sen',
      contact: '+91 98115 66789',
      email: 'neha.sen@eduerp.edu',
      admissionDate: '05 Aug 2024',
      hostelStatus: 'Hosteller'
    },
    {
      rollNo: '22MCA031',
      name: 'Karan Mehra',
      program: 'Master of Computer Applications',
      semester: 'Semester IV',
      department: 'Computer Applications',
      section: 'MCA-IV B',
      category: 'EWS',
      cgpa: 8.42,
      attendancePct: 88.6,
      lectureAttended: 149,
      lectureTotal: 168,
      feeStatus: 'Paid',
      feePaidAmount: '₹47,500',
      challanNo: 'SBI-DU55198231',
      fatherName: 'Mr. Dinesh Mehra',
      contact: '+91 98221 44556',
      email: 'karan.mehra@eduerp.edu',
      admissionDate: '18 Aug 2024',
      hostelStatus: 'Day Scholar'
    }
  ]);

  readonly majorProjects = signal<MajorProjectRecord[]>([
    {
      rollNo: '22MCA042',
      studentName: 'Aarushi Jain',
      projectTitle: 'EduERP v2.0: Cloud-Based Academic Management & Analytics Portal',
      guideName: 'Dr. Sunita Rao (Assoc. Prof, Dept of Computer Applications)',
      synopsisStatus: 'Approved',
      midTermReview: 'Grade A+ (28/30)',
      plagiarismPct: 6.8,
      gitRepo: 'github.com/aarushi-jain/eduerp-v2-mca-project',
      hardboundCopies: 3,
      vivaReadiness: 'Ready for External Board'
    },
    {
      rollNo: '22MCA018',
      studentName: 'Rohan Sharma',
      projectTitle: 'Deep Learning Based Plant Leaf Disease Detection Using CNN',
      guideName: 'Prof. Amitav Sen (Sr. Faculty, AI Lab)',
      synopsisStatus: 'Approved',
      midTermReview: 'Grade A (26/30)',
      plagiarismPct: 11.2,
      gitRepo: 'github.com/rohan-sharma/plant-disease-cnn',
      hardboundCopies: 2,
      vivaReadiness: 'Report Pending'
    },
    {
      rollNo: '22MCA031',
      studentName: 'Karan Mehra',
      projectTitle: 'Automated Hospital Bed Allocation & Patient Health Monitoring via IoT',
      guideName: 'Dr. Manoj Saxena (HOD Computer Applications)',
      synopsisStatus: 'Approved',
      midTermReview: 'Grade A (25/30)',
      plagiarismPct: 8.4,
      gitRepo: 'github.com/karan-mehra/iot-hospital-mgmt',
      hardboundCopies: 3,
      vivaReadiness: 'Ready for External Board'
    }
  ]);

  readonly biometricLogs = signal<BiometricLog[]>([
    {
      id: 'BIO-101',
      rollNo: '22MCA042',
      studentName: 'Aarushi Jain',
      punchTime: '09:12 AM',
      deviceLocation: 'Gate 2 (IT Block Scanner)',
      rfidTag: 'RFID-MCA-4028',
      status: 'Present'
    },
    {
      id: 'BIO-102',
      rollNo: '22MCA031',
      studentName: 'Karan Mehra',
      punchTime: '09:24 AM',
      deviceLocation: 'Gate 2 (IT Block Scanner)',
      rfidTag: 'RFID-MCA-4019',
      status: 'Present'
    },
    {
      id: 'BIO-103',
      rollNo: '23BCS104',
      studentName: 'Priya Verma',
      punchTime: '08:58 AM',
      deviceLocation: 'Main Gate (Academic Complex)',
      rfidTag: 'RFID-BCS-1044',
      status: 'Present'
    },
    {
      id: 'BIO-104',
      rollNo: '22MCA018',
      studentName: 'Rohan Sharma',
      punchTime: '--:--',
      deviceLocation: 'Scanner Not Triggered',
      rfidTag: 'RFID-MCA-4011',
      status: 'Absent'
    }
  ]);

  readonly examSchedules = signal<ExamSchedule[]>([
    {
      courseCode: 'KCA-401',
      subject: 'Cloud Computing Architecture & DevOps',
      program: 'MCA Semester IV',
      date: '18 May 2026',
      time: '10:00 AM – 01:00 PM',
      hall: 'Hall A (Ramanujan Block)',
      invigilator: 'Dr. Sunita Rao (Assoc. Prof)',
      totalStudents: 64,
      maxMarks: 70
    },
    {
      courseCode: 'KCA-402',
      subject: 'Artificial Intelligence & Deep Learning',
      program: 'MCA Semester IV',
      date: '20 May 2026',
      time: '10:00 AM – 01:00 PM',
      hall: 'Lab 4 (Central Computer Center)',
      invigilator: 'Prof. Amitav Sen (Sr. Faculty)',
      totalStudents: 64,
      maxMarks: 70
    },
    {
      courseCode: 'KCA-451',
      subject: 'Distributed Systems & Microservices Lab',
      program: 'MCA Semester IV',
      date: '23 May 2026',
      time: '09:00 AM – 01:00 PM',
      hall: 'Software Engineering Lab 2',
      invigilator: 'Prof. R. P. Singh (Lab Incharge)',
      totalStudents: 64,
      maxMarks: 50
    },
    {
      courseCode: 'KCA-452',
      subject: 'Major Project Dissertation & Final Viva Voce',
      program: 'MCA Semester IV',
      date: '28 May 2026',
      time: '09:00 AM – 05:00 PM',
      hall: 'Department Conference Hall (IT Wing)',
      invigilator: 'External University Board & HOD',
      totalStudents: 64,
      maxMarks: 200
    }
  ]);

  readonly defaulters = signal<AttendanceDefaulter[]>([
    {
      rollNo: '22MCA018',
      name: 'Rohan Sharma',
      program: 'MCA Sem IV (Sec A)',
      department: 'Computer Applications',
      attendancePct: 68.2,
      shortfallLectures: 12,
      parentContact: '+91 98450 11234',
      lastAbsentDate: '10 Nov 2026',
      alertSent: false,
      medicalCertSubmitted: false
    },
    {
      rollNo: '23BCA022',
      name: 'Aditya Malhotra',
      program: 'BCA Sem IV (Sec B)',
      department: 'Computer Applications',
      attendancePct: 71.8,
      shortfallLectures: 5,
      parentContact: '+91 97118 44321',
      lastAbsentDate: '09 Nov 2026',
      alertSent: true,
      medicalCertSubmitted: true
    },
    {
      rollNo: '23BCS089',
      name: 'Vikram Joshi',
      program: 'B.Tech CSE Sem VI (Sec A)',
      department: 'Computer Science',
      attendancePct: 64.5,
      shortfallLectures: 18,
      parentContact: '+91 99103 88765',
      lastAbsentDate: '11 Nov 2026',
      alertSent: false,
      medicalCertSubmitted: false
    }
  ]);

  readonly notices = signal<InstitutionalNotice[]>([
    {
      id: 'NOT-2026-088',
      circularRef: 'AKTU/COE/EVEN-2026/1842',
      title: 'End-Term Theory & Practical Examination Schedule (Even Semester 2025-26)',
      date: '10 Nov 2026',
      category: 'Examination',
      issuedBy: 'Controller of Examinations',
      priority: 'High',
      content: 'Final semester examinations for MCA, B.Tech, and BCA commence from 18 May 2026. Hall tickets available on portal for students with >=75% attendance.'
    },
    {
      id: 'NOT-2026-085',
      circularRef: 'MCA/PROJ/2026/04',
      title: 'Submission Guidelines for MCA-452 Major Project Hardbound Report & Defense',
      date: '08 Nov 2026',
      category: 'Academic',
      issuedBy: 'Dean & HOD, Dept of Computer Applications',
      priority: 'High',
      content: 'All Semester IV MCA students must submit 3 hardbound spiral copies signed by their allotted faculty guide along with digital repository link before 15 May 2026.'
    },
    {
      id: 'NOT-2026-081',
      circularRef: 'T&P/CAMPUS/2026/92',
      title: 'TCS Digital & Infosys Specialist Programmer Campus Drive (Batch 2026)',
      date: '05 Nov 2026',
      category: 'Placement',
      issuedBy: 'Central Training & Placement Cell',
      priority: 'Normal',
      content: 'Shortlisted final year MCA & B.Tech candidates must report to Computer Center Lab 1 with updated resumes at 09:30 AM.'
    }
  ]);

  addStudent(student: StudentRecord): void {
    this.students.update(prev => [student, ...prev]);
  }

  sendDefaulterAlert(rollNo: string): void {
    this.defaulters.update(prev =>
      prev.map(d => d.rollNo === rollNo ? { ...d, alertSent: true } : d)
    );
  }

  addNotice(notice: InstitutionalNotice): void {
    this.notices.update(prev => [notice, ...prev]);
  }
}
