import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminSecureLogin } from './pages/admin-secure-login/admin-secure-login';
import { AccessDeniedPage } from './pages/access-denied/access-denied';
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

import { FacultyLayout } from './pages/faculty/faculty-layout';
import { FacultyDashboardPage } from './pages/faculty/dashboard/faculty-dashboard';
import { FacultyMyClassesPage } from './pages/faculty/my-classes/faculty-my-classes';
import { FacultyClassDetailPage } from './pages/faculty/my-classes/faculty-class-detail';
import { FacultyTimetablePage } from './pages/faculty/timetable/faculty-timetable';
import { FacultyAttendancePage } from './pages/faculty/attendance/faculty-attendance';
import { FacultyAssignmentsPage } from './pages/faculty/assignments/faculty-assignments';
import { FacultyAssignmentSubmissionsPage } from './pages/faculty/assignments/faculty-assignment-submissions';
import { FacultyQuestionPapersPage } from './pages/faculty/question-papers/faculty-question-papers';
import { FacultyAnswerSheetsPage } from './pages/faculty/answer-sheets/faculty-answer-sheets';
import { FacultyResultsMarksPage } from './pages/faculty/results/faculty-results-marks';
import { FacultyStudentsPage } from './pages/faculty/students/faculty-students';
import { FacultyNoticesPage } from './pages/faculty/notices/faculty-notices';
import { FacultyMessageCenterPage } from './pages/faculty/message-center/faculty-message-center';
import { FacultyMyProfilePage } from './pages/faculty/my-profile/faculty-my-profile';
import { FacultyPortalReportsPage } from './pages/faculty/reports/faculty-reports';
import { FacultyHelpdeskPage } from './pages/faculty/helpdesk/faculty-helpdesk';
import { DashboardShell } from './pages/dashboard-shell/dashboard-shell';
import { authGuard, authChildGuard, authMatchGuard, guestGuard } from './guards/auth.guard';
import { roleGuard, roleChildGuard, dashboardRedirectGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'access-denied', component: AccessDeniedPage },
  { path: 'admin/secure-login', component: AdminSecureLogin },
  { path: 'mistermason', component: MisterMasonComponent },
  { path: 'project2', component: MisterMasonComponent },
  {
    path: 'admin',
    component: AdminDashboardLayout,
    canActivate: [authGuard, roleGuard(['admin', 'superadmin'])],
    canActivateChild: [authChildGuard, roleChildGuard(['admin', 'superadmin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardOverview },
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
    path: 'faculty',
    component: FacultyLayout,
    canActivate: [authGuard, roleGuard(['faculty'])],
    canActivateChild: [authChildGuard, roleChildGuard(['faculty'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: FacultyDashboardPage },
      { path: 'my-classes', component: FacultyMyClassesPage },
      { path: 'my-classes/:allocationId', component: FacultyClassDetailPage },
      { path: 'timetable', component: FacultyTimetablePage },
      { path: 'attendance', component: FacultyAttendancePage },
      { path: 'assignments', component: FacultyAssignmentsPage },
      { path: 'assignments/:assignmentId/submissions', component: FacultyAssignmentSubmissionsPage },
      { path: 'question-papers', component: FacultyQuestionPapersPage },
      { path: 'answer-sheets', component: FacultyAnswerSheetsPage },
      { path: 'results-marks', component: FacultyResultsMarksPage },
      { path: 'reports', component: FacultyPortalReportsPage },
      { path: 'my-students', component: FacultyStudentsPage },
      { path: 'notices', component: FacultyNoticesPage },
      { path: 'message-center', component: FacultyMessageCenterPage },
      { path: 'messages', redirectTo: 'message-center' },
      { path: 'helpdesk', component: FacultyHelpdeskPage },
      { path: 'my-profile', component: FacultyMyProfilePage },
      { path: 'profile', redirectTo: 'my-profile' }
    ]
  },
  {
    path: 'student',
    canMatch: [authMatchGuard],
    canActivate: [authGuard, roleGuard(['student'])],
    canActivateChild: [authChildGuard, roleChildGuard(['student'])],
    loadChildren: () => import('./pages/student/student.routes').then(m => m.STUDENT_ROUTES)
  },
  {
    path: 'parent',
    canMatch: [authMatchGuard],
    canActivate: [authGuard, roleGuard(['parent'])],
    canActivateChild: [authChildGuard, roleChildGuard(['parent'])],
    loadChildren: () => import('./pages/parent/parent.routes').then(m => m.PARENT_ROUTES)
  },
  {
    path: 'portal',
    redirectTo: 'parent/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardShell,
    canActivate: [authGuard, dashboardRedirectGuard]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
