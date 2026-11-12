import { Injectable, signal } from '@angular/core';

export type ActivityCategory = 'Academic' | 'People' | 'Attendance' | 'Exams' | 'Fees' | 'Notices' | 'Security';
export type ActivityPeriod = 'Today' | 'Yesterday' | 'Earlier';

export interface ActivityItem {
  id: string;
  user: string;
  role: string;
  action: string;
  target: string;
  module: string;
  category: ActivityCategory;
  period: ActivityPeriod;
  relativeTime: string;
  exactTime: string;
  daysAgo: number;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  // Master activity log for Apex Institute of Technology & Management (EduERP)
  // Ready to be swapped with HttpClient GET /api/admin/activities in the next phase
  private readonly activities = signal<ActivityItem[]>([
    // Group: Today (daysAgo = 0)
    {
      id: 'act-001',
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      action: 'enrolled new student',
      target: 'Rahul Verma (MCA-2025-042) into MCA Semester 4',
      module: 'Student Admissions',
      category: 'People',
      period: 'Today',
      relativeTime: '12 mins ago',
      exactTime: 'Today at 02:45 PM',
      daysAgo: 0,
      icon: 'person_add'
    },
    {
      id: 'act-002',
      user: 'Prof. Meena Sharma',
      role: 'Associate Professor',
      action: 'marked attendance for',
      target: 'BCA Section A (58 Present, 4 Absent)',
      module: 'Attendance Management',
      category: 'Attendance',
      period: 'Today',
      relativeTime: '35 mins ago',
      exactTime: 'Today at 02:22 PM',
      daysAgo: 0,
      icon: 'how_to_reg'
    },
    {
      id: 'act-003',
      user: 'Suresh Patil',
      role: 'Accounts Officer',
      action: 'collected semester fee of',
      target: '₹25,000 from Sneha Kulkarni (B.Tech CSE - Roll #CS-2024-019)',
      module: 'Fee Collection',
      category: 'Fees',
      period: 'Today',
      relativeTime: '1 hour ago',
      exactTime: 'Today at 01:50 PM',
      daysAgo: 0,
      icon: 'payments'
    },
    {
      id: 'act-004',
      user: 'Kavita Nair',
      role: 'Registrar',
      action: 'published official notice:',
      target: 'Mid-term practical examination schedule for Even Semester 2026',
      module: 'Notices & Announcements',
      category: 'Notices',
      period: 'Today',
      relativeTime: '2 hours ago',
      exactTime: 'Today at 12:40 PM',
      daysAgo: 0,
      icon: 'campaign'
    },
    {
      id: 'act-005',
      user: 'Dr. R.K. Raman',
      role: 'Controller of Examinations',
      action: 'generated examination hall seating plan for',
      target: 'Even Sem End-Term Matrix (Halls B-101 through B-108)',
      module: 'Examinations Cell',
      category: 'Exams',
      period: 'Today',
      relativeTime: '3 hours ago',
      exactTime: 'Today at 11:30 AM',
      daysAgo: 0,
      icon: 'assignment'
    },
    {
      id: 'act-006',
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      action: 'exported Attendance Report for',
      target: 'MCA Semester 4 (Cumulative Monthly Sheet)',
      module: 'Attendance Management',
      category: 'Attendance',
      period: 'Today',
      relativeTime: '4 hours ago',
      exactTime: 'Today at 10:20 AM',
      daysAgo: 0,
      icon: 'file_download'
    },
    {
      id: 'act-007',
      user: 'Dr. S. N. Roy',
      role: 'HOD Computer Applications',
      action: 'assigned project supervisor to',
      target: 'MCA Project Batch 04 (Guide: Dr. Amit Joshi)',
      module: 'Subject Allocation',
      category: 'Academic',
      period: 'Today',
      relativeTime: '5 hours ago',
      exactTime: 'Today at 09:45 AM',
      daysAgo: 0,
      icon: 'school'
    },
    {
      id: 'act-008',
      user: 'Dinesh Rathore',
      role: 'Senior Accounts Officer',
      action: 'dispatched automated fee reminder to',
      target: '22 students with pending lab and tuition dues',
      module: 'Pending Fees',
      category: 'Fees',
      period: 'Today',
      relativeTime: '6 hours ago',
      exactTime: 'Today at 08:30 AM',
      daysAgo: 0,
      icon: 'receipt_long'
    },
    {
      id: 'act-009',
      user: 'Prof. Ananya Sen',
      role: 'Assistant Professor',
      action: 'uploaded internal assessment scores for',
      target: 'MCA-401 Cloud Infrastructure & DevOps (48 students)',
      module: 'Results & Grades',
      category: 'Academic',
      period: 'Today',
      relativeTime: '7 hours ago',
      exactTime: 'Today at 07:45 AM',
      daysAgo: 0,
      icon: 'grade'
    },
    {
      id: 'act-010',
      user: 'Vikram Chauhan',
      role: 'Security Systems Engineer',
      action: 'flagged multiple failed login attempts on',
      target: 'faculty account k.rao@eduerp.edu (IP: 103.21.124.9)',
      module: 'Security Overview',
      category: 'Security',
      period: 'Today',
      relativeTime: '8 hours ago',
      exactTime: 'Today at 06:15 AM',
      daysAgo: 0,
      icon: 'shield'
    },

    // Group: Yesterday (daysAgo = 1)
    {
      id: 'act-011',
      user: 'Dr. P. V. Ramamurthy',
      role: 'Dean of Student Welfare',
      action: 'approved medical condonation for',
      target: 'Karan Malhotra (BCA-2024-088) with 68% attendance shortfall',
      module: 'Attendance Management',
      category: 'Attendance',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 05:40 PM',
      exactTime: 'Yesterday at 05:40 PM',
      daysAgo: 1,
      icon: 'verified'
    },
    {
      id: 'act-012',
      user: 'Suresh Patil',
      role: 'Accounts Officer',
      action: 'verified NEFT fee receipt #REC-2026-9921 for',
      target: '₹42,500 from Vikramaditya Chauhan (MCA Semester 2)',
      module: 'Payment History',
      category: 'Fees',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 04:15 PM',
      exactTime: 'Yesterday at 04:15 PM',
      daysAgo: 1,
      icon: 'receipt'
    },
    {
      id: 'act-013',
      user: 'Prof. Rajesh Khanna',
      role: 'Senior Faculty',
      action: 'scheduled surprise revision evaluation for',
      target: 'Discrete Mathematics in Hall 304 (Friday, 10:00 AM)',
      module: 'Examinations Cell',
      category: 'Exams',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 03:00 PM',
      exactTime: 'Yesterday at 03:00 PM',
      daysAgo: 1,
      icon: 'event_note'
    },
    {
      id: 'act-014',
      user: 'Dr. Anita Desai',
      role: 'Dean (Academics)',
      action: 'updated course syllabus and lab manual for',
      target: 'Artificial Intelligence & Robotics (AY 2025-26)',
      module: 'Courses & Programs',
      category: 'Academic',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 01:20 PM',
      exactTime: 'Yesterday at 01:20 PM',
      daysAgo: 1,
      icon: 'menu_book'
    },
    {
      id: 'act-015',
      user: 'Rajesh Verma',
      role: 'ERP Administrator',
      action: 'assigned role Department Coordinator to',
      target: 'Dr. Shalini Gupta (Dept of Information Science)',
      module: 'Roles & Permissions',
      category: 'People',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 11:45 AM',
      exactTime: 'Yesterday at 11:45 AM',
      daysAgo: 1,
      icon: 'admin_panel_settings'
    },
    {
      id: 'act-016',
      user: 'Prof. T. P. Raman',
      role: 'Faculty Coordinator',
      action: 'marked lab practical attendance for',
      target: 'Embedded Systems Lab Batch 02 (32 Present, 0 Absent)',
      module: 'Attendance Management',
      category: 'Attendance',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 10:15 AM',
      exactTime: 'Yesterday at 10:15 AM',
      daysAgo: 1,
      icon: 'how_to_reg'
    },
    {
      id: 'act-017',
      user: 'Dr. R.K. Raman',
      role: 'Controller of Examinations',
      action: 'published semester supplementary results for',
      target: 'MCA & B.Tech 3rd Semester Revaluation Candidates',
      module: 'Results & Grades',
      category: 'Exams',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 09:30 AM',
      exactTime: 'Yesterday at 09:30 AM',
      daysAgo: 1,
      icon: 'assessment'
    },
    {
      id: 'act-018',
      user: 'Vikram Chauhan',
      role: 'Systems Engineer',
      action: 'completed full database snapshot to',
      target: 'Encrypted Cloud Storage (archive-2026-11-10.sql.enc)',
      module: 'Audit Logs',
      category: 'Security',
      period: 'Yesterday',
      relativeTime: 'Yesterday at 02:00 AM',
      exactTime: 'Yesterday at 02:00 AM',
      daysAgo: 1,
      icon: 'cloud_upload'
    },

    // Group: Earlier (daysAgo >= 2)
    {
      id: 'act-019',
      user: 'Pooja Sharma',
      role: 'Admissions Coordinator',
      action: 'approved lateral entry admission for',
      target: 'Pooja Iyer (B.Tech CSE - Direct 2nd Year Diploma Quota)',
      module: 'Student Admissions',
      category: 'People',
      period: 'Earlier',
      relativeTime: '2 days ago',
      exactTime: '09 Nov 2026, 04:30 PM',
      daysAgo: 2,
      icon: 'person_add'
    },
    {
      id: 'act-020',
      user: 'Ramesh Bhatia',
      role: 'Senior Accountant',
      action: 'reconciled bank gateway batch with',
      target: 'SBI Collect e-Challan Settlement #TXN-88491 (₹3,85,000)',
      module: 'Fee Collection',
      category: 'Fees',
      period: 'Earlier',
      relativeTime: '3 days ago',
      exactTime: '08 Nov 2026, 03:15 PM',
      daysAgo: 3,
      icon: 'account_balance'
    },
    {
      id: 'act-021',
      user: 'Prof. Sandeep Bansal',
      role: 'Associate Professor (IT)',
      action: 'assigned term project submission deadline to',
      target: 'MCA Sem 4: Enterprise Web Application Architecture',
      module: 'Assignments',
      category: 'Academic',
      period: 'Earlier',
      relativeTime: '4 days ago',
      exactTime: '07 Nov 2026, 11:00 AM',
      daysAgo: 4,
      icon: 'assignment_turned_in'
    },
    {
      id: 'act-022',
      user: 'Sunil Jadhav',
      role: 'Card Bureau Officer',
      action: 'issued campus identity smart cards to',
      target: '75 newly enrolled first-year postgraduate students',
      module: 'User Accounts',
      category: 'Security',
      period: 'Earlier',
      relativeTime: '5 days ago',
      exactTime: '06 Nov 2026, 02:20 PM',
      daysAgo: 5,
      icon: 'badge'
    },
    {
      id: 'act-023',
      user: 'Dr. R.K. Raman',
      role: 'Controller of Examinations',
      action: 'appointed external examiners for',
      target: 'MCA Semester 4 Major Project Viva Voce Board',
      module: 'Examinations Cell',
      category: 'Exams',
      period: 'Earlier',
      relativeTime: '6 days ago',
      exactTime: '05 Nov 2026, 10:45 AM',
      daysAgo: 6,
      icon: 'fact_check'
    },
    {
      id: 'act-024',
      user: 'Prof. Neha Deshmukh',
      role: 'Assistant Professor',
      action: 'compiled monthly attendance report for',
      target: 'Advanced Java Programming (Cumulative Average: 88.4%)',
      module: 'Attendance Analytics',
      category: 'Attendance',
      period: 'Earlier',
      relativeTime: '7 days ago',
      exactTime: '04 Nov 2026, 04:00 PM',
      daysAgo: 7,
      icon: 'bar_chart'
    },
    {
      id: 'act-025',
      user: 'Dr. Manish Aggarwal',
      role: 'HOD Mechanical Engineering',
      action: 'modified weekly class timetable for',
      target: 'M.Tech CAD/CAM Section B (Shifted Lab to Thursday)',
      module: 'Timetable',
      category: 'Academic',
      period: 'Earlier',
      relativeTime: '9 days ago',
      exactTime: '02 Nov 2026, 01:15 PM',
      daysAgo: 9,
      icon: 'calendar_month'
    },
    {
      id: 'act-026',
      user: 'Rajesh Verma',
      role: 'ERP Administrator',
      action: 'reset two-factor authentication tokens for',
      target: 'Prof. Arvind Swaminathan (Dept of Mathematics)',
      module: 'Security Overview',
      category: 'Security',
      period: 'Earlier',
      relativeTime: '12 days ago',
      exactTime: '30 Oct 2026, 11:30 AM',
      daysAgo: 12,
      icon: 'lock_reset'
    },
    {
      id: 'act-027',
      user: 'Pooja Sharma',
      role: 'Student Affairs Coordinator',
      action: 'dispatched automated SMS alerts to',
      target: '18 parents regarding student attendance below 75% threshold',
      module: 'Message Center',
      category: 'Attendance',
      period: 'Earlier',
      relativeTime: '14 days ago',
      exactTime: '28 Oct 2026, 09:00 AM',
      daysAgo: 14,
      icon: 'sms'
    },
    {
      id: 'act-028',
      user: 'Vikram Solanki',
      role: 'Finance Head',
      action: 'published approved annual fee schedule for',
      target: 'Academic Year 2026-27 Hostel & Transportation Slabs',
      module: 'Fee Structure',
      category: 'Fees',
      period: 'Earlier',
      relativeTime: '18 days ago',
      exactTime: '24 Oct 2026, 03:30 PM',
      daysAgo: 18,
      icon: 'account_balance_wallet'
    },
    {
      id: 'act-029',
      user: 'Dr. Anita Desai',
      role: 'Dean (Academics)',
      action: 'finalized institutional academic calendar for',
      target: 'Winter Break, End-Term Practical & Theory Exam Windows',
      module: 'Academic Years',
      category: 'Academic',
      period: 'Earlier',
      relativeTime: '21 days ago',
      exactTime: '21 Oct 2026, 02:00 PM',
      daysAgo: 21,
      icon: 'date_range'
    },
    {
      id: 'act-030',
      user: 'Vikram Chauhan',
      role: 'Security Systems Engineer',
      action: 'renewed institutional SSL certificates and keys for',
      target: 'portal.eduerp.edu and identity authentication gateways',
      module: 'Security Overview',
      category: 'Security',
      period: 'Earlier',
      relativeTime: '26 days ago',
      exactTime: '16 Oct 2026, 05:00 AM',
      daysAgo: 26,
      icon: 'vpn_key'
    },
    {
      id: 'act-031',
      user: 'Prof. Harish Rawat',
      role: 'Sports Director',
      action: 'published official circular:',
      target: 'Annual Inter-Collegiate Athletics Meet 2026 selection trials',
      module: 'Notices & Announcements',
      category: 'Notices',
      period: 'Earlier',
      relativeTime: '28 days ago',
      exactTime: '14 Oct 2026, 11:15 AM',
      daysAgo: 28,
      icon: 'campaign'
    },
    {
      id: 'act-032',
      user: 'Kavita Nair',
      role: 'Registrar',
      action: 'verified original qualifying degrees for',
      target: '35 MCA Batch 2025-27 Lateral Entry candidates',
      module: 'Student Admissions',
      category: 'People',
      period: 'Earlier',
      relativeTime: '29 days ago',
      exactTime: '13 Oct 2026, 03:45 PM',
      daysAgo: 29,
      icon: 'verified_user'
    }
  ]);

  /**
   * Returns all activity logs.
   * In a future release with backend APIs, this will return an HttpClient observable.
   */
  getActivities(): ActivityItem[] {
    return this.activities();
  }

  /**
   * Helper to append a new activity programmatically
   */
  logActivity(item: Omit<ActivityItem, 'id'>): void {
    const newItem: ActivityItem = {
      ...item,
      id: `act-${Date.now()}`
    };
    this.activities.update(current => [newItem, ...current]);
  }
}
