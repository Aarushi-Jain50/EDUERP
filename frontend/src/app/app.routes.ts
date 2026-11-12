import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminDashboardLayout } from './pages/admin-dashboard/admin-dashboard-layout';
import { DashboardOverview } from './pages/admin-dashboard/dashboard-overview';
import { RecentActivity } from './pages/admin-dashboard/recent-activity/recent-activity';
import { AcademicYearsPage } from './pages/admin-dashboard/academic-years/academic-years';
import { DepartmentsPage } from './pages/admin-dashboard/departments/departments';
import { CoursesPage } from './pages/admin-dashboard/courses/courses';
import { SemestersPage } from './pages/admin-dashboard/semesters/semesters';
import { BatchesSectionsPage } from './pages/admin-dashboard/batches/batches';
import { SubjectsPage } from './pages/admin-dashboard/subjects/subjects';
import { SubjectAllocationPage } from './pages/admin-dashboard/subject-allocation/subject-allocation';
import { StudentsPage } from './pages/admin-dashboard/students/students';
import { StudentAdmissionsPage } from './pages/admin-dashboard/student-admissions/student-admissions';
import { FacultyPage } from './pages/admin-dashboard/faculty/faculty';
import { ParentsPage } from './pages/admin-dashboard/parents/parents';
import { UserAccountsPage } from './pages/admin-dashboard/user-accounts/user-accounts';
import { RolesPermissionsPage } from './pages/admin-dashboard/roles-permissions/roles-permissions';
import { AttendancePage } from './pages/admin-dashboard/attendance/attendance';
import { ExaminationsPage } from './pages/admin-dashboard/examinations/examinations';
import { ResultsGradesPage } from './pages/admin-dashboard/results-grades/results-grades';
import { AssignmentsPage } from './pages/admin-dashboard/assignments/assignments';
import { TimetablePage } from './pages/admin-dashboard/timetable/timetable';
import { FeeStructurePage } from './pages/admin-dashboard/fee-structure/fee-structure';
import { FeeCollectionPage } from './pages/admin-dashboard/fee-collection/fee-collection';
import { PendingFeesPage } from './pages/admin-dashboard/pending-fees/pending-fees';
import { PaymentHistoryPage } from './pages/admin-dashboard/payment-history/payment-history';
import { ReceiptsPage } from './pages/admin-dashboard/receipts/receipts';
import { NoticesPage } from './pages/admin-dashboard/notices/notices';
import { NotificationsPage } from './pages/admin-dashboard/notifications/notifications';
import { MessageCenterPage } from './pages/admin-dashboard/message-center/message-center';
import { AnalyticsOverviewPage } from './pages/admin-dashboard/analytics-overview/analytics-overview';
import { StudentPerformancePage } from './pages/admin-dashboard/student-performance/student-performance';
import { AttendanceAnalyticsPage } from './pages/admin-dashboard/attendance-analytics/attendance-analytics';
import { ExaminationReportsPage } from './pages/admin-dashboard/exam-reports/exam-reports';
import { FeeReportsPage } from './pages/admin-dashboard/fee-reports/fee-reports';
import { FacultyReportsPage } from './pages/admin-dashboard/faculty-reports/faculty-reports';
import { SystemSettingsPage } from './pages/admin-dashboard/system-settings/system-settings';
import { SecurityOverviewPage } from './pages/admin-dashboard/security-overview/security-overview';
import { AuditLogsPage } from './pages/admin-dashboard/audit-logs/audit-logs';
import { ActivityHistoryPage } from './pages/admin-dashboard/activity-history/activity-history';
import { MyProfilePage } from './pages/admin-dashboard/my-profile/my-profile';
import { MisterMasonComponent } from './pages/mister-mason/mister-mason';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'mistermason', component: MisterMasonComponent },
  { path: 'project2', component: MisterMasonComponent },
  {
    path: 'admin',
    component: AdminDashboardLayout,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardOverview },
      { path: 'recent-activity', component: RecentActivity },
      { path: 'academic-years', component: AcademicYearsPage },
      { path: 'departments', component: DepartmentsPage },
      { path: 'courses', component: CoursesPage },
      { path: 'semesters', component: SemestersPage },
      { path: 'batches', component: BatchesSectionsPage },
      { path: 'subjects', component: SubjectsPage },
      { path: 'subject-allocation', component: SubjectAllocationPage },
      { path: 'students', component: StudentsPage },
      { path: 'student-admissions', component: StudentAdmissionsPage },
      { path: 'faculty', component: FacultyPage },
      { path: 'parents', component: ParentsPage },
      { path: 'user-accounts', component: UserAccountsPage },
      { path: 'roles-permissions', component: RolesPermissionsPage },
      { path: 'attendance', component: AttendancePage },
      { path: 'examinations', component: ExaminationsPage },
      { path: 'results', component: ResultsGradesPage },
      { path: 'assignments', component: AssignmentsPage },
      { path: 'timetable', component: TimetablePage },
      { path: 'fee-structure', component: FeeStructurePage },
      { path: 'fee-collection', component: FeeCollectionPage },
      { path: 'pending-fees', component: PendingFeesPage },
      { path: 'payment-history', component: PaymentHistoryPage },
      { path: 'receipts', component: ReceiptsPage },
      { path: 'notices', component: NoticesPage },
      { path: 'notifications', component: NotificationsPage },
      { path: 'messages', component: MessageCenterPage },
      { path: 'analytics-overview', component: AnalyticsOverviewPage },
      { path: 'student-performance', component: StudentPerformancePage },
      { path: 'attendance-analytics', component: AttendanceAnalyticsPage },
      { path: 'exam-reports', component: ExaminationReportsPage },
      { path: 'fee-reports', component: FeeReportsPage },
      { path: 'faculty-reports', component: FacultyReportsPage },
      { path: 'settings', component: SystemSettingsPage },
      { path: 'security', component: SecurityOverviewPage },
      { path: 'audit-logs', component: AuditLogsPage },
      { path: 'activity-history', component: ActivityHistoryPage },
      { path: 'profile', component: MyProfilePage }
    ]
  },
  {
    path: 'dashboard',
    redirectTo: 'admin'
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

