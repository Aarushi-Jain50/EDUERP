import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Student,
  StudentAdmission,
  AdmissionStatus,
  ToastMessage,
  DocumentVerificationStatus,
  VerificationDocument,
  BulkStudentImportRow
} from '../models/student.model';
import { AcademicService } from './academic.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

export function buildDefaultDocuments(allVerified = false): VerificationDocument[] {
  const defaultStatus: DocumentVerificationStatus = allVerified ? 'Verified' : 'Pending';
  const today = new Date().toISOString().split('T')[0];
  const labels: { key: string; label: string }[] = [
    { key: 'marksheet_10', label: '10th / Secondary Marksheet' },
    { key: 'marksheet_12', label: '12th / Qualifying Degree Marksheet' },
    { key: 'tc', label: 'Transfer / Migration Certificate' },
    { key: 'photo_id', label: 'Government Photo ID (Aadhaar / Passport)' },
    { key: 'category_cert', label: 'Category / Domicile Certificate' }
  ];
  return labels.map(item => ({
    key: item.key,
    label: item.label,
    status: defaultStatus,
    verifiedBy: allVerified ? 'Registrar Office' : undefined,
    updatedAt: allVerified ? today : undefined
  }));
}

const SEED_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    enrollmentNo: 'MCA-2025-001',
    name: 'Rahul Verma',
    initials: 'RV',
    gender: 'Male',
    dob: '2002-05-14',
    email: 'rahul.verma@eduerp.edu',
    phone: '9876543210',
    address: 'Flat 402, Green Park Apartments, New Delhi',
    courseId: 'course-mca',
    course: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    batchName: '2025-2027',
    academicYear: '2025-26',
    admissionDate: '2025-07-15',
    status: 'Active',
    guardian: { name: 'Sanjay Verma', relation: 'Father', phone: '9811223344' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-2',
    enrollmentNo: 'MCA-2025-002',
    name: 'Ananya Sharma',
    initials: 'AS',
    gender: 'Female',
    dob: '2003-01-22',
    email: 'ananya.sharma@eduerp.edu',
    phone: '9812345678',
    address: 'House No 45, Sector 15, Chandigarh',
    courseId: 'course-mca',
    course: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    batchName: '2025-2027',
    academicYear: '2025-26',
    admissionDate: '2025-07-16',
    status: 'Active',
    guardian: { name: 'Rakesh Sharma', relation: 'Father', phone: '9812300000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-3',
    enrollmentNo: 'BCA-2025-014',
    name: 'Priyanshu Das',
    initials: 'PD',
    gender: 'Male',
    dob: '2004-11-05',
    email: 'priyanshu.das@eduerp.edu',
    phone: '9765432109',
    address: 'B-12, Salt Lake City, Kolkata',
    courseId: 'course-bca',
    course: 'Bachelor of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    section: 'Section A',
    batchName: '2025-2028',
    academicYear: '2025-26',
    admissionDate: '2025-07-20',
    status: 'Active',
    guardian: { name: 'Subhash Das', relation: 'Father', phone: '9765400000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-4',
    enrollmentNo: 'CSE-2023-088',
    name: 'Meera Patel',
    initials: 'MP',
    gender: 'Female',
    dob: '2003-04-18',
    email: 'meera.patel@eduerp.edu',
    phone: '9898765432',
    address: 'Plot 108, CG Road, Ahmedabad',
    courseId: 'course-btech-cse',
    course: 'B.Tech Computer Science & Engineering',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    semester: 'Semester 2',
    sectionId: 'sec-4',
    section: 'Section A',
    batchName: '2023-2027',
    academicYear: '2025-26',
    admissionDate: '2023-08-01',
    status: 'Active',
    guardian: { name: 'Kirit Patel', relation: 'Father', phone: '9898700000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-5',
    enrollmentNo: 'MCA-2025-005',
    name: 'Rohan Kulkarni',
    initials: 'RK',
    gender: 'Male',
    dob: '2002-09-12',
    email: 'rohan.kulkarni@eduerp.edu',
    phone: '9822011223',
    address: 'Flat 12, FC Road, Pune',
    courseId: 'course-mca',
    course: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-2',
    section: 'Section B',
    batchName: '2025-2027',
    academicYear: '2025-26',
    admissionDate: '2025-07-18',
    status: 'Active',
    guardian: { name: 'Vijay Kulkarni', relation: 'Father', phone: '9822000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-6',
    enrollmentNo: 'IT-2024-031',
    name: 'Sneha Nair',
    initials: 'SN',
    gender: 'Female',
    dob: '2004-02-28',
    email: 'sneha.nair@eduerp.edu',
    phone: '9447012345',
    address: 'TC 14/200, Kowdiar, Thiruvananthapuram',
    courseId: 'course-btech-it',
    course: 'B.Tech Information Technology',
    departmentId: 'dept-it',
    department: 'Information Technology',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2024-07-25',
    status: 'Active',
    guardian: { name: 'Gopalakrishnan Nair', relation: 'Father', phone: '9447000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-7',
    enrollmentNo: 'MBA-2025-010',
    name: 'Aditya Joshi',
    initials: 'AJ',
    gender: 'Male',
    dob: '2001-08-14',
    email: 'aditya.joshi@eduerp.edu',
    phone: '9988776655',
    address: '14, Civil Lines, Jaipur',
    courseId: 'course-mba',
    course: 'Master of Business Administration',
    departmentId: 'dept-mgmt',
    department: 'Management Studies',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2025-07-10',
    status: 'Active',
    guardian: { name: 'Dinesh Joshi', relation: 'Father', phone: '9988700000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-8',
    enrollmentNo: 'BCOM-2024-055',
    name: 'Pooja Saxena',
    initials: 'PS',
    gender: 'Female',
    dob: '2004-06-30',
    email: 'pooja.saxena@eduerp.edu',
    phone: '9839012345',
    address: '22, Hazratganj, Lucknow',
    courseId: 'course-bcom',
    course: 'Bachelor of Commerce (Honours)',
    departmentId: 'dept-comm',
    department: 'Commerce & Finance',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2024-07-12',
    status: 'Active',
    guardian: { name: 'Alok Saxena', relation: 'Father', phone: '9839000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-9',
    enrollmentNo: 'MCA-2025-009',
    name: 'Vikramaditya Roy',
    initials: 'VR',
    gender: 'Male',
    dob: '2002-12-01',
    email: 'vikram.roy@eduerp.edu',
    phone: '9830099887',
    address: 'Southern Avenue, Kolkata',
    courseId: 'course-mca',
    course: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-2',
    section: 'Section B',
    batchName: '2025-2027',
    academicYear: '2025-26',
    admissionDate: '2025-07-22',
    status: 'Active',
    guardian: { name: 'Debashis Roy', relation: 'Father', phone: '9830000000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'stu-10',
    enrollmentNo: 'BBA-2024-022',
    name: 'Tanvi Agarwal',
    initials: 'TA',
    gender: 'Female',
    dob: '2004-03-15',
    email: 'tanvi.agarwal@eduerp.edu',
    phone: '9810054321',
    address: 'E-45, Greater Kailash 1, New Delhi',
    courseId: 'course-bba',
    course: 'Bachelor of Business Administration',
    departmentId: 'dept-mgmt',
    department: 'Management Studies',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2024-07-14',
    status: 'Active',
    guardian: { name: 'Sunil Agarwal', relation: 'Father', phone: '9810000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-11',
    enrollmentNo: 'CSE-2023-102',
    name: 'Siddharth Rao',
    initials: 'SR',
    gender: 'Male',
    dob: '2003-10-10',
    email: 'siddharth.rao@eduerp.edu',
    phone: '9845012345',
    address: 'Indiranagar 100ft Road, Bengaluru',
    courseId: 'course-btech-cse',
    course: 'B.Tech Computer Science & Engineering',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    semester: 'Semester 2',
    sectionId: 'sec-4',
    section: 'Section A',
    admissionDate: '2023-08-05',
    status: 'Active',
    guardian: { name: 'Narasimha Rao', relation: 'Father', phone: '9845000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-12',
    enrollmentNo: 'MCA-2025-012',
    name: 'Ishita Banerjee',
    initials: 'IB',
    gender: 'Female',
    dob: '2003-07-19',
    email: 'ishita.banerjee@eduerp.edu',
    phone: '9831122334',
    address: 'Gariahat Road, Kolkata',
    courseId: 'course-mca',
    course: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    batchName: '2025-2027',
    academicYear: '2025-26',
    admissionDate: '2025-07-19',
    status: 'Active',
    guardian: { name: 'Pranab Banerjee', relation: 'Father', phone: '9831100000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-13',
    enrollmentNo: 'BCA-2025-029',
    name: 'Varun Malhotra',
    initials: 'VM',
    gender: 'Male',
    dob: '2004-09-08',
    email: 'varun.malhotra@eduerp.edu',
    phone: '9818877665',
    address: 'Model Town, Ludhiana',
    courseId: 'course-bca',
    course: 'Bachelor of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    section: 'Section A',
    admissionDate: '2025-07-21',
    status: 'Active',
    guardian: { name: 'Rajesh Malhotra', relation: 'Father', phone: '9818800000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-14',
    enrollmentNo: 'ECE-2024-018',
    name: 'Neha Singh',
    initials: 'NS',
    gender: 'Female',
    dob: '2004-05-04',
    email: 'neha.singh@eduerp.edu',
    phone: '9955443322',
    address: 'Boring Road, Patna',
    courseId: 'course-btech-ece',
    course: 'B.Tech Electronics & Communication',
    departmentId: 'dept-ece',
    department: 'Electronics & Communication',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2024-07-28',
    status: 'Active',
    guardian: { name: 'Manoj Singh', relation: 'Father', phone: '9955400000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-15',
    enrollmentNo: 'MTECH-2025-004',
    name: 'Karthik Iyer',
    initials: 'KI',
    gender: 'Male',
    dob: '2001-03-29',
    email: 'karthik.iyer@eduerp.edu',
    phone: '9444055667',
    address: 'Mylapore, Chennai',
    courseId: 'course-mtech-ai',
    course: 'M.Tech Artificial Intelligence & Robotics',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2025-07-11',
    status: 'Active',
    guardian: { name: 'Subramanian Iyer', relation: 'Father', phone: '9444000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-16',
    enrollmentNo: 'MCOM-2025-008',
    name: 'Ritu Choudhury',
    initials: 'RC',
    gender: 'Female',
    dob: '2002-10-14',
    email: 'ritu.choudhury@eduerp.edu',
    phone: '9864012345',
    address: 'GS Road, Guwahati',
    courseId: 'course-mcom',
    course: 'Master of Commerce (Accounting & Taxation)',
    departmentId: 'dept-comm',
    department: 'Commerce & Finance',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2025-07-17',
    status: 'Active',
    guardian: { name: 'Biren Choudhury', relation: 'Father', phone: '9864000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-17',
    enrollmentNo: 'MCA-2023-040',
    name: 'Devendra Yadav',
    initials: 'DY',
    gender: 'Male',
    dob: '2001-01-11',
    email: 'devendra.yadav@eduerp.edu',
    phone: '9935012345',
    address: 'Civil Lines, Prayagraj',
    courseId: 'course-mca',
    course: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 4',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2023-07-10',
    status: 'Passed Out',
    guardian: { name: 'Ramakant Yadav', relation: 'Father', phone: '9935000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-18',
    enrollmentNo: 'BCA-2024-080',
    name: 'Priya Gupta',
    initials: 'PG',
    gender: 'Female',
    dob: '2004-12-25',
    email: 'priya.gupta@eduerp.edu',
    phone: '9871122334',
    address: 'Raj Nagar, Ghaziabad',
    courseId: 'course-bca',
    course: 'Bachelor of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    section: 'Section A',
    admissionDate: '2024-07-15',
    status: 'Inactive',
    guardian: { name: 'Mahesh Gupta', relation: 'Father', phone: '9871100000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'stu-19',
    enrollmentNo: 'CSE-2024-044',
    name: 'Abhinav Mishra',
    initials: 'AM',
    gender: 'Male',
    dob: '2004-04-03',
    email: 'abhinav.mishra@eduerp.edu',
    phone: '9450011223',
    address: 'Bhuvaneshwari Nagar, Varanasi',
    courseId: 'course-btech-cse',
    course: 'B.Tech Computer Science & Engineering',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    semester: 'Semester 2',
    sectionId: 'sec-4',
    section: 'Section A',
    admissionDate: '2024-07-22',
    status: 'Active',
    guardian: { name: 'Vidyadhar Mishra', relation: 'Father', phone: '9450000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-20',
    enrollmentNo: 'BBA-2025-015',
    name: 'Kavya Reddy',
    initials: 'KR',
    gender: 'Female',
    dob: '2005-02-17',
    email: 'kavya.reddy@eduerp.edu',
    phone: '9848012345',
    address: 'Jubilee Hills, Hyderabad',
    courseId: 'course-bba',
    course: 'Bachelor of Business Administration',
    departmentId: 'dept-mgmt',
    department: 'Management Studies',
    semester: 'Semester 2',
    sectionId: 'sec-1',
    section: 'Section A',
    admissionDate: '2025-07-24',
    status: 'Active',
    guardian: { name: 'Prabhakar Reddy', relation: 'Father', phone: '9848000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'stu-21',
    enrollmentNo: 'BCA-2025-032',
    name: 'Aanya Verma',
    initials: 'AV',
    gender: 'Female',
    dob: '2005-03-10',
    email: 'aanya.verma@eduerp.edu',
    phone: '9811223355',
    address: 'Flat 402, Green Park Apartments, New Delhi',
    courseId: 'course-bca',
    course: 'Bachelor of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    semester: 'Semester 2',
    sectionId: 'sec-3',
    section: 'Section A',
    admissionDate: '2025-07-21',
    status: 'Active',
    guardian: { name: 'Sanjay Verma', relation: 'Father', phone: '9811223344' },
    documents: buildDefaultDocuments(true)
  }
];

const SEED_ADMISSIONS: StudentAdmission[] = [
  {
    id: 'adm-101',
    applicationNo: 'ADM-2026-0101',
    applicantName: 'Aarav Deshmukh',
    initials: 'AD',
    gender: 'Male',
    dob: '2003-09-14',
    email: 'aarav.deshmukh@gmail.com',
    phone: '9820011223',
    address: 'Shivaji Nagar, Pune',
    courseId: 'course-mca',
    courseApplied: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    appliedOn: '2026-03-01',
    previousQualification: 'B.Sc Computer Science (Savitribai Phule Pune Univ)',
    percentage: 86.4,
    status: 'Applied',
    guardian: { name: 'Prakash Deshmukh', relation: 'Father', phone: '9820000000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'adm-102',
    applicationNo: 'ADM-2026-0102',
    applicantName: 'Sanya Mukherjee',
    initials: 'SM',
    gender: 'Female',
    dob: '2004-03-21',
    email: 'sanya.mukherjee@yahoo.com',
    phone: '9830044556',
    address: 'Park Street, Kolkata',
    courseId: 'course-mca',
    courseApplied: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    appliedOn: '2026-03-03',
    previousQualification: 'BCA (St. Xavier’s College, Kolkata)',
    percentage: 89.2,
    status: 'Under Review',
    guardian: { name: 'Amitava Mukherjee', relation: 'Father', phone: '9830000000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'adm-103',
    applicationNo: 'ADM-2026-0103',
    applicantName: 'Nikhil Bharadwaj',
    initials: 'NB',
    gender: 'Male',
    dob: '2003-12-05',
    email: 'nikhil.b@outlook.com',
    phone: '9811122334',
    address: 'Vasundhara Enclave, Delhi',
    courseId: 'course-btech-cse',
    courseApplied: 'B.Tech Computer Science & Engineering',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    appliedOn: '2026-02-25',
    previousQualification: 'Class XII (CBSE Science stream)',
    percentage: 92.5,
    status: 'Approved',
    guardian: { name: 'R. K. Bharadwaj', relation: 'Father', phone: '9811100000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'adm-104',
    applicationNo: 'ADM-2026-0104',
    applicantName: 'Deepika Menon',
    initials: 'DM',
    gender: 'Female',
    dob: '2004-07-11',
    email: 'deepika.menon@gmail.com',
    phone: '9446012345',
    address: 'Kaloor, Kochi',
    courseId: 'course-mba',
    courseApplied: 'Master of Business Administration',
    departmentId: 'dept-mgmt',
    department: 'Management Studies',
    appliedOn: '2026-03-02',
    previousQualification: 'B.Com Honours (University of Kerala)',
    percentage: 81.0,
    status: 'Approved',
    guardian: { name: 'Unnikrishnan Menon', relation: 'Father', phone: '9446000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'adm-105',
    applicationNo: 'ADM-2026-0105',
    applicantName: 'Tushar Srivastava',
    initials: 'TS',
    gender: 'Male',
    dob: '2003-05-18',
    email: 'tushar.sri@rediffmail.com',
    phone: '9838012345',
    address: 'Gomti Nagar, Lucknow',
    courseId: 'course-bca',
    courseApplied: 'Bachelor of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    appliedOn: '2026-02-28',
    previousQualification: 'Class XII (UP Board Commerce with Maths)',
    percentage: 64.2,
    status: 'Rejected',
    guardian: { name: 'Sanjiv Srivastava', relation: 'Father', phone: '9838000000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'adm-106',
    applicationNo: 'ADM-2026-0106',
    applicantName: 'Ananya Das',
    initials: 'AD',
    gender: 'Female',
    dob: '2003-08-10',
    email: 'ananya.das@gmail.com',
    phone: '9862012345',
    address: 'Zoo Road, Guwahati',
    courseId: 'course-mca',
    courseApplied: 'Master of Computer Applications',
    departmentId: 'dept-mca',
    department: 'Computer Applications',
    appliedOn: '2026-02-15',
    previousQualification: 'B.Sc IT (Gauhati University)',
    percentage: 88.0,
    status: 'Enrolled',
    guardian: { name: 'Pradip Das', relation: 'Father', phone: '9862000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'adm-107',
    applicationNo: 'ADM-2026-0107',
    applicantName: 'Gaurav Kadam',
    initials: 'GK',
    gender: 'Male',
    dob: '2004-01-29',
    email: 'gaurav.kadam@gmail.com',
    phone: '9823098765',
    address: 'Thane West, Mumbai',
    courseId: 'course-btech-it',
    courseApplied: 'B.Tech Information Technology',
    departmentId: 'dept-it',
    department: 'Information Technology',
    appliedOn: '2026-03-05',
    previousQualification: 'Class XII (Maharashtra HSC)',
    percentage: 85.6,
    status: 'Applied',
    guardian: { name: 'Shantaram Kadam', relation: 'Father', phone: '9823000000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'adm-108',
    applicationNo: 'ADM-2026-0108',
    applicantName: 'Shreya Kulkarni',
    initials: 'SK',
    gender: 'Female',
    dob: '2004-10-04',
    email: 'shreya.k@gmail.com',
    phone: '9890011223',
    address: 'Kothrud, Pune',
    courseId: 'course-bcom',
    courseApplied: 'Bachelor of Commerce (Honours)',
    departmentId: 'dept-comm',
    department: 'Commerce & Finance',
    appliedOn: '2026-03-04',
    previousQualification: 'Class XII (CBSE Commerce)',
    percentage: 90.8,
    status: 'Under Review',
    guardian: { name: 'Madhav Kulkarni', relation: 'Father', phone: '9890000000' },
    documents: buildDefaultDocuments(false)
  },
  {
    id: 'adm-109',
    applicationNo: 'ADM-2026-0109',
    applicantName: 'Harshwardhan Rathore',
    initials: 'HR',
    gender: 'Male',
    dob: '2003-11-20',
    email: 'harsh.rathore@gmail.com',
    phone: '9929012345',
    address: 'C-Scheme, Jaipur',
    courseId: 'course-bba',
    courseApplied: 'Bachelor of Business Administration',
    departmentId: 'dept-mgmt',
    department: 'Management Studies',
    appliedOn: '2026-03-02',
    previousQualification: 'Class XII (RBSE Science)',
    percentage: 87.5,
    status: 'Approved',
    guardian: { name: 'Gajendra Singh Rathore', relation: 'Father', phone: '9929000000' },
    documents: buildDefaultDocuments(true)
  },
  {
    id: 'adm-110',
    applicationNo: 'ADM-2026-0110',
    applicantName: 'Divya Nambiar',
    initials: 'DN',
    gender: 'Female',
    dob: '2002-06-16',
    email: 'divya.nambiar@gmail.com',
    phone: '9447712345',
    address: 'Kadri, Mangaluru',
    courseId: 'course-mtech-ai',
    courseApplied: 'M.Tech Artificial Intelligence & Robotics',
    departmentId: 'dept-cse',
    department: 'Computer Science & Engineering',
    appliedOn: '2026-03-01',
    previousQualification: 'B.Tech CSE (VTU Belagavi)',
    percentage: 83.2,
    status: 'Applied',
    guardian: { name: 'Raman Nambiar', relation: 'Father', phone: '9447700000' },
    documents: buildDefaultDocuments(false)
  }
];

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly academicService = inject(AcademicService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _students = signal<Student[]>([]);
  private readonly _admissions = signal<StudentAdmission[]>([]);
  private readonly _toasts = signal<ToastMessage[]>([]);

  private readonly studentsSync = new FirestoreCollectionSync<Student>(
    'students',
    'eduerp_students_v2',
    this._students,
    this.isBrowser
  );
  private readonly admissionsSync = new FirestoreCollectionSync<StudentAdmission>(
    'studentAdmissions',
    'eduerp_admissions_v2',
    this._admissions,
    this.isBrowser
  );

  readonly toasts = this._toasts.asReadonly();
  readonly students = this._students.asReadonly();
  readonly admissions = this._admissions.asReadonly();

  constructor() {
    this._students.set(this.studentsSync.loadInitial(SEED_STUDENTS));
    this._admissions.set(this.admissionsSync.loadInitial(SEED_ADMISSIONS));
    this.studentsSync.startSync();
    this.admissionsSync.startSync();
  }

  readonly studentStats = computed(() => {
    const list = this._students();
    const active = list.filter(s => s.status === 'Active').length;
    const newThisYear = list.filter(s => s.admissionDate.startsWith('2025') || s.admissionDate.startsWith('2026')).length;
    return {
      total: list.length,
      active,
      newThisYear
    };
  });

  readonly admissionTabCounts = computed(() => {
    const list = this._admissions();
    return {
      all: list.length,
      applied: list.filter(a => a.status === 'Applied').length,
      underReview: list.filter(a => a.status === 'Under Review').length,
      approved: list.filter(a => a.status === 'Approved').length,
      rejected: list.filter(a => a.status === 'Rejected').length,
      enrolled: list.filter(a => a.status === 'Enrolled').length
    };
  });

  readonly admissionStats = computed(() => {
    const list = this._admissions();
    return {
      total: list.length,
      underReview: list.filter(a => a.status === 'Under Review').length,
      approved: list.filter(a => a.status === 'Approved').length,
      enrolled: list.filter(a => a.status === 'Enrolled').length
    };
  });

  // =========================================================================
  // HELPER METHODS & DUPLICATE DETECTION
  // =========================================================================

  private generateInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  generateEnrollmentNo(courseName: string): string {
    let prefix = 'STU';
    const upper = courseName.toUpperCase();
    if (upper.includes('MCA')) prefix = 'MCA';
    else if (upper.includes('BCA')) prefix = 'BCA';
    else if (upper.includes('CSE')) prefix = 'CSE';
    else if (upper.includes('IT')) prefix = 'IT';
    else if (upper.includes('MBA')) prefix = 'MBA';
    else if (upper.includes('BBA')) prefix = 'BBA';
    else if (upper.includes('BCOM')) prefix = 'BCOM';
    else if (upper.includes('MCOM')) prefix = 'MCOM';
    else if (upper.includes('ECE')) prefix = 'ECE';

    const currentYear = new Date().getFullYear();
    const count = this._students().length + 1;
    const padded = String(count).padStart(3, '0');
    return `${prefix}-${currentYear}-${padded}`;
  }

  checkDuplicateCandidate(email: string, phone: string, excludeId?: string): { isDuplicate: boolean; reason?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const matchedStudent = this._students().find(
      s => s.id !== excludeId && (s.email.toLowerCase() === cleanEmail || s.phone === cleanPhone)
    );
    if (matchedStudent) {
      return {
        isDuplicate: true,
        reason: `Matches enrolled student ${matchedStudent.name} (${matchedStudent.enrollmentNo})`
      };
    }

    const matchedAdmission = this._admissions().find(
      a => a.id !== excludeId && (a.email.toLowerCase() === cleanEmail || a.phone === cleanPhone)
    );
    if (matchedAdmission) {
      return {
        isDuplicate: true,
        reason: `Matches application ${matchedAdmission.applicationNo} (${matchedAdmission.applicantName})`
      };
    }

    return { isDuplicate: false };
  }

  getDocumentsForStudent(student: Student): VerificationDocument[] {
    return student.documents && student.documents.length > 0 ? student.documents : buildDefaultDocuments(true);
  }

  getDocumentsForAdmission(admission: StudentAdmission): VerificationDocument[] {
    return admission.documents && admission.documents.length > 0 ? admission.documents : buildDefaultDocuments(false);
  }

  // =========================================================================
  // STUDENTS LIFECYCLE, PROMOTION, TRANSFER & BULK IMPORT
  // =========================================================================

  saveStudent(studentData: Omit<Student, 'id' | 'initials'>, editId?: string): { success: boolean; error?: string } {
    const cleanEmail = studentData.email.trim().toLowerCase();
    const cleanPhone = studentData.phone.trim();
    const cleanEnrollment = studentData.enrollmentNo.trim().toUpperCase();

    const existingEnrollment = this._students().find(
      s => s.enrollmentNo.toUpperCase() === cleanEnrollment && s.id !== editId
    );
    if (existingEnrollment) {
      return { success: false, error: `Enrollment Number "${cleanEnrollment}" is already assigned to another student.` };
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      return { success: false, error: 'Phone number must be exactly 10 numeric digits.' };
    }

    const existingRecord = editId ? this._students().find(s => s.id === editId) : undefined;
    if (!editId) {
      const capCheck = this.academicService.canAllocateToSection(studentData.course, studentData.section, 1);
      if (!capCheck.allowed) {
        return { success: false, error: capCheck.error };
      }
    }

    const initials = this.generateInitials(studentData.name);
    const docs = studentData.documents ?? existingRecord?.documents ?? buildDefaultDocuments(false);

    const record: Student = editId
      ? {
          ...studentData,
          enrollmentNo: cleanEnrollment,
          email: cleanEmail,
          phone: cleanPhone,
          initials,
          documents: docs,
          id: editId
        }
      : {
          ...studentData,
          enrollmentNo: cleanEnrollment,
          email: cleanEmail,
          phone: cleanPhone,
          initials,
          documents: docs,
          id: `stu-${Date.now()}`
        };

    if (editId) {
      this._students.update(list => list.map(s => (s.id === editId ? record : s)));
      this.showToast('success', `Student profile for "${studentData.name}" updated successfully.`);
    } else {
      this._students.update(list => [record, ...list]);
      this.academicService.adjustSectionStrength(record.course, record.section, 1);
      this.showToast('success', `New student "${studentData.name}" added with Enrollment No: ${cleanEnrollment}.`);
    }
    this.studentsSync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Registrar Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated student dossier' : 'enrolled new student',
      target: `${record.name} (${record.enrollmentNo} · ${record.course})`,
      recordId: record.id,
      module: 'Students Directory',
      category: 'People',
      icon: 'school'
    });

    return { success: true };
  }

  toggleStudentStatus(studentId: string, nextStatus: 'Active' | 'Inactive' | 'Passed Out'): void {
    const target = this._students().find(s => s.id === studentId);
    if (!target) return;
    const updated: Student = { ...target, status: nextStatus };
    this._students.update(list => list.map(s => (s.id === studentId ? updated : s)));
    this.studentsSync.syncUpsert(updated);
    this.showToast('info', `${target.name} status updated to "${nextStatus}".`);

    this.activityService.logActivity({
      user: 'Admin (Registrar Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'changed student status to',
      target: `${target.name} (${target.enrollmentNo}) -> ${nextStatus}`,
      recordId: target.id,
      module: 'Students Directory',
      category: 'People',
      icon: 'sync'
    });
  }

  verifyStudentDocument(studentId: string, docKey: string, status: DocumentVerificationStatus): void {
    const target = this._students().find(s => s.id === studentId);
    if (!target) return;

    const today = new Date().toISOString().split('T')[0];
    const docs = this.getDocumentsForStudent(target).map(d =>
      d.key === docKey ? { ...d, status, verifiedBy: 'Registrar Office', updatedAt: today } : d
    );
    const updated: Student = { ...target, documents: docs };
    this._students.update(list => list.map(s => (s.id === studentId ? updated : s)));
    this.studentsSync.syncUpsert(updated);
    this.showToast('success', `Document verification updated to "${status}" for ${target.name}.`);
  }

  promoteStudents(
    studentIds: string[],
    targetSemester: string,
    targetSection?: string
  ): { success: boolean; count: number; error?: string } {
    if (studentIds.length === 0) {
      return { success: false, count: 0, error: 'Select at least one student to promote.' };
    }

    const targets = this._students().filter(s => studentIds.includes(s.id));
    if (targetSection) {
      const courseGroups = new Map<string, number>();
      for (const s of targets) {
        if (s.section !== targetSection) {
          courseGroups.set(s.course, (courseGroups.get(s.course) ?? 0) + 1);
        }
      }
      for (const [courseName, incomingCount] of courseGroups.entries()) {
        const capCheck = this.academicService.canAllocateToSection(courseName, targetSection, incomingCount);
        if (!capCheck.allowed) {
          return { success: false, count: 0, error: capCheck.error };
        }
      }
    }

    const modified: Student[] = [];
    this._students.update(list =>
      list.map(s => {
        if (!studentIds.includes(s.id)) return s;
        if (targetSection && s.section !== targetSection) {
          this.academicService.adjustSectionStrength(s.course, s.section, -1);
          this.academicService.adjustSectionStrength(s.course, targetSection, 1);
        }
        const updated: Student = {
          ...s,
          semester: targetSemester,
          section: targetSection || s.section,
          status: targetSemester.toLowerCase().includes('passed') ? 'Passed Out' : s.status
        };
        modified.push(updated);
        return updated;
      })
    );
    modified.forEach(s => this.studentsSync.syncUpsert(s));

    this.activityService.logActivity({
      user: 'Admin (Registrar Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'batch promoted students to',
      target: `${modified.length} student(s) -> ${targetSemester}${targetSection ? ' (' + targetSection + ')' : ''}`,
      module: 'Students Directory',
      category: 'Academic',
      icon: 'trending_up'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Students Directory',
      action: 'Update',
      target: `Batch Promotion (${modified.length} students)`,
      newValue: `${targetSemester}${targetSection ? ' / ' + targetSection : ''}`,
      status: 'Success'
    });

    this.showToast('success', `Promoted ${modified.length} student(s) to ${targetSemester}.`);
    return { success: true, count: modified.length };
  }

  transferStudentsSection(
    studentIds: string[],
    targetSection: string
  ): { success: boolean; count: number; error?: string } {
    if (studentIds.length === 0) {
      return { success: false, count: 0, error: 'Select at least one student for section transfer.' };
    }

    const targets = this._students().filter(s => studentIds.includes(s.id) && s.section !== targetSection);
    if (targets.length === 0) {
      return { success: false, count: 0, error: `Selected students are already in ${targetSection}.` };
    }

    const courseGroups = new Map<string, number>();
    for (const s of targets) {
      courseGroups.set(s.course, (courseGroups.get(s.course) ?? 0) + 1);
    }
    for (const [courseName, incomingCount] of courseGroups.entries()) {
      const capCheck = this.academicService.canAllocateToSection(courseName, targetSection, incomingCount);
      if (!capCheck.allowed) {
        return { success: false, count: 0, error: capCheck.error };
      }
    }

    const modified: Student[] = [];
    const targetIds = new Set(targets.map(t => t.id));
    this._students.update(list =>
      list.map(s => {
        if (!targetIds.has(s.id)) return s;
        this.academicService.adjustSectionStrength(s.course, s.section, -1);
        this.academicService.adjustSectionStrength(s.course, targetSection, 1);
        const updated: Student = {
          ...s,
          section: targetSection,
          sectionId: targetSection === 'Section B' ? 'sec-2' : targetSection === 'Section C' ? 'sec-3' : 'sec-1'
        };
        modified.push(updated);
        return updated;
      })
    );
    modified.forEach(s => this.studentsSync.syncUpsert(s));

    this.activityService.logActivity({
      user: 'Admin (Registrar Office)',
      role: 'System Administrator',
      operationType: 'Update',
      action: 'transferred students between sections',
      target: `${modified.length} student(s) moved to ${targetSection}`,
      module: 'Sections & Batches',
      category: 'Academic',
      icon: 'swap_horiz'
    });

    this.showToast('success', `Transferred ${modified.length} student(s) to ${targetSection}.`);
    return { success: true, count: modified.length };
  }

  importStudentsBulk(rows: BulkStudentImportRow[]): { importedCount: number; skippedDuplicates: number; errors: string[] } {
    const errors: string[] = [];
    let importedCount = 0;
    let skippedDuplicates = 0;
    const courses = this.academicService.courses();
    const today = new Date().toISOString().split('T')[0];

    const createdStudents: Student[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      const name = String(row.name || '').trim();
      const email = String(row.email || '').trim().toLowerCase();
      const phone = String(row.phone || '').replace(/\D/g, '').slice(-10);
      const courseName = String(row.course || '').trim() || courses[0]?.name || 'Master of Computer Applications';

      if (!name || !email) {
        errors.push(`Row ${rowNum}: Missing required Name or Email.`);
        return;
      }
      if (!/^\d{10}$/.test(phone)) {
        errors.push(`Row ${rowNum} (${name}): Invalid 10-digit phone number.`);
        return;
      }

      const enrollmentNo = String(row.enrollmentNo || '').trim().toUpperCase() || this.generateEnrollmentNo(courseName);
      const duplicate =
        this._students().some(
          s => s.enrollmentNo.toUpperCase() === enrollmentNo || s.email.toLowerCase() === email
        ) ||
        createdStudents.some(
          s => s.enrollmentNo.toUpperCase() === enrollmentNo || s.email.toLowerCase() === email
        );

      if (duplicate) {
        skippedDuplicates++;
        return;
      }

      const courseObj = courses.find(c => c.name.toLowerCase() === courseName.toLowerCase()) || courses[0];
      const resolvedCourse = courseObj?.name || courseName;
      const resolvedSection = String(row.section || 'Section A').trim();
      const newStudent: Student = {
        id: `stu-${Date.now()}-${index}`,
        enrollmentNo,
        name,
        initials: this.generateInitials(name),
        gender: row.gender === 'Female' || row.gender === 'Other' ? row.gender : 'Male',
        dob: row.dob || '2004-01-01',
        email,
        phone,
        address: String(row.address || 'Campus Hostel / Registered City').trim(),
        courseId: courseObj?.id || 'course-mca',
        course: resolvedCourse,
        departmentId: courseObj ? `dept-${courseObj.code.toLowerCase()}` : 'dept-mca',
        department: courseObj?.department || 'Computer Applications',
        semester: String(row.semester || 'Semester 1').trim(),
        sectionId: resolvedSection === 'Section B' ? 'sec-2' : 'sec-1',
        section: resolvedSection,
        admissionDate: today,
        status: 'Active',
        guardian: {
          name: String(row.guardianName || `Guardian of ${name}`).trim(),
          relation: String(row.guardianRelation || 'Father').trim(),
          phone: String(row.guardianPhone || phone).replace(/\D/g, '').slice(-10) || phone
        },
        documents: buildDefaultDocuments(false)
      };

      createdStudents.push(newStudent);
      this.academicService.adjustSectionStrength(resolvedCourse, resolvedSection, 1);
      importedCount++;
    });

    if (createdStudents.length > 0) {
      this._students.update(list => [...createdStudents, ...list]);
      createdStudents.forEach(s => this.studentsSync.syncUpsert(s));
      this.activityService.logActivity({
        user: 'Admin (Registrar Office)',
        role: 'System Administrator',
        operationType: 'Create',
        action: 'bulk imported student records',
        target: `${createdStudents.length} students imported (${skippedDuplicates} duplicates skipped)`,
        module: 'Students Directory',
        category: 'People',
        icon: 'upload_file'
      });
      this.showToast('success', `Imported ${importedCount} student(s) successfully.`);
    }

    return { importedCount, skippedDuplicates, errors };
  }

  deleteStudent(id: string): { success: boolean; error?: string } {
    const target = this._students().find(s => s.id === id);
    if (target) {
      this._students.update(list => list.filter(s => s.id !== id));
      this.studentsSync.syncDelete(id);
      this.academicService.adjustSectionStrength(target.course, target.section, -1);
      this.showToast('info', `Student record for "${target.name}" (${target.enrollmentNo}) has been deleted.`);
      this.activityService.logActivity({
        user: 'Admin (Registrar Office)',
        role: 'System Administrator',
        operationType: 'Delete',
        action: 'deleted student record',
        target: `${target.name} (${target.enrollmentNo})`,
        recordId: target.id,
        module: 'Students Directory',
        category: 'People',
        icon: 'delete'
      });
    }
    return { success: true };
  }

  // =========================================================================
  // ADMISSIONS CRUD, VERIFICATION & ONBOARDING WORKFLOW
  // =========================================================================

  saveAdmission(
    admData: Omit<StudentAdmission, 'id' | 'applicationNo' | 'initials' | 'appliedOn' | 'status'>,
    editId?: string
  ): { success: boolean; error?: string } {
    const initials = this.generateInitials(admData.applicantName);
    const docs = admData.documents ?? buildDefaultDocuments(false);

    if (editId) {
      const existing = this._admissions().find(a => a.id === editId);
      if (existing) {
        const updated: StudentAdmission = { ...existing, ...admData, initials, documents: docs };
        this._admissions.update(list => list.map(a => (a.id === editId ? updated : a)));
        this.admissionsSync.syncUpsert(updated);
      }
      this.showToast('success', `Application for "${admData.applicantName}" updated.`);
    } else {
      const appCount = this._admissions().length + 101;
      const applicationNo = `ADM-${new Date().getFullYear()}-${String(appCount).padStart(4, '0')}`;
      const newAdm: StudentAdmission = {
        ...admData,
        id: `adm-${Date.now()}`,
        applicationNo,
        initials,
        appliedOn: new Date().toISOString().split('T')[0],
        status: 'Applied',
        documents: docs
      };
      this._admissions.update(list => [newAdm, ...list]);
      this.admissionsSync.syncUpsert(newAdm);
      this.showToast('success', `Application submitted for "${admData.applicantName}"! Application No: ${applicationNo}`);
      this.activityService.logActivity({
        user: 'Admin (Admissions Cell)',
        role: 'System Administrator',
        operationType: 'Create',
        action: 'registered admission application',
        target: `${newAdm.applicantName} (${applicationNo} · ${newAdm.courseApplied})`,
        recordId: newAdm.id,
        module: 'Student Admissions',
        category: 'People',
        icon: 'assignment'
      });
    }

    return { success: true };
  }

  verifyAdmissionDocument(admissionId: string, docKey: string, status: DocumentVerificationStatus): void {
    const target = this._admissions().find(a => a.id === admissionId);
    if (!target) return;

    const today = new Date().toISOString().split('T')[0];
    const docs = this.getDocumentsForAdmission(target).map(d =>
      d.key === docKey ? { ...d, status, verifiedBy: 'Admissions Officer', updatedAt: today } : d
    );
    const updated: StudentAdmission = { ...target, documents: docs };
    this._admissions.update(list => list.map(a => (a.id === admissionId ? updated : a)));
    this.admissionsSync.syncUpsert(updated);
    this.showToast('success', `Verification updated to "${status}" for ${target.applicantName}.`);
  }

  updateAdmissionStatus(id: string, newStatus: AdmissionStatus, reviewNotes?: string): void {
    const target = this._admissions().find(a => a.id === id);
    if (!target) return;

    const updated: StudentAdmission = {
      ...target,
      status: newStatus,
      reviewNotes: reviewNotes ?? target.reviewNotes
    };
    this._admissions.update(list => list.map(a => (a.id === id ? updated : a)));
    this.admissionsSync.syncUpsert(updated);

    this.showToast(
      newStatus === 'Approved' ? 'success' : newStatus === 'Rejected' ? 'error' : 'info',
      `Application for "${target.applicantName}" moved to "${newStatus}" status.`
    );

    const op = newStatus === 'Approved' ? 'Approve' : newStatus === 'Rejected' ? 'Reject' : 'Update';
    this.activityService.logActivity({
      user: 'Admin (Admissions Cell)',
      role: 'System Administrator',
      operationType: op,
      action: `marked admission application as ${newStatus.toLowerCase()}`,
      target: `${target.applicantName} (${target.applicationNo})`,
      recordId: target.id,
      module: 'Student Admissions',
      category: 'People',
      icon: newStatus === 'Approved' ? 'check_circle' : newStatus === 'Rejected' ? 'cancel' : 'pending_actions'
    });
  }

  enrollApplicantAsStudent(admissionId: string): { success: boolean; error?: string; enrollmentNo?: string; student?: Student } {
    const application = this._admissions().find(a => a.id === admissionId);
    if (!application) {
      return { success: false, error: 'Application record not found.' };
    }
    if (application.status !== 'Approved') {
      return { success: false, error: 'Only candidates with "Approved" status can be enrolled.' };
    }

    const capCheck = this.academicService.canAllocateToSection(application.courseApplied, 'Section A', 1);
    if (!capCheck.allowed) {
      return { success: false, error: capCheck.error };
    }

    const enrollmentNo = this.generateEnrollmentNo(application.courseApplied);
    const initials = this.generateInitials(application.applicantName);
    const verifiedDocs = this.getDocumentsForAdmission(application);

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      enrollmentNo,
      name: application.applicantName,
      initials,
      gender: application.gender,
      dob: application.dob,
      email: application.email.toLowerCase(),
      phone: application.phone,
      address: application.address,
      courseId: application.courseId,
      course: application.courseApplied,
      departmentId: application.departmentId,
      department: application.department,
      semester: 'Semester 1',
      sectionId: 'sec-1',
      section: 'Section A',
      academicYear: this.academicService.academicYearStats().current,
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      guardian: application.guardian,
      documents: verifiedDocs
    };

    this._students.update(list => [newStudent, ...list]);
    this.studentsSync.syncUpsert(newStudent);
    this.academicService.adjustSectionStrength(application.courseApplied, 'Section A', 1);

    const updatedAdmission: StudentAdmission = { ...application, status: 'Enrolled' };
    this._admissions.update(list => list.map(a => (a.id === admissionId ? updatedAdmission : a)));
    this.admissionsSync.syncUpsert(updatedAdmission);

    this.activityService.logActivity({
      user: 'Admin (Admissions Cell)',
      role: 'System Administrator',
      operationType: 'Approve',
      action: 'enrolled approved applicant into Students Directory',
      target: `${newStudent.name} (${enrollmentNo} · ${newStudent.course})`,
      recordId: newStudent.id,
      module: 'Student Admissions',
      category: 'People',
      icon: 'school'
    });
    this.auditService.log({
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Student Admissions',
      action: 'Create',
      target: `Enrolled ${newStudent.name}`,
      newValue: `${enrollmentNo} (${application.applicationNo})`,
      status: 'Success'
    });

    this.showToast(
      'success',
      `Candidate "${application.applicantName}" enrolled as active student! Enrollment No: ${enrollmentNo}`
    );

    return { success: true, enrollmentNo, student: newStudent };
  }

  // Toast Helpers
  showToast(type: 'success' | 'info' | 'warning' | 'error', text: string): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    this._toasts.update(list => [...list, { id, type, text }]);
    setTimeout(() => this.removeToast(id), 4500);
  }

  removeToast(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
