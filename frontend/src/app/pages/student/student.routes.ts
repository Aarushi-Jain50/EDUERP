import { Routes } from '@angular/router';
import { examInProgressGuard, examPortalGuard } from '../../guards/exam-portal.guard';
import { StudentLayout } from './student-layout';
import { StudentDashboard } from './dashboard/student-dashboard';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    component: StudentLayout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: StudentDashboard },
      { path: 'subjects', redirectTo: 'my-subjects', pathMatch: 'full' },
      {
        path: 'my-subjects',
        loadComponent: () => import('./my-subjects/student-my-subjects').then(m => m.StudentMySubjects)
      },
      {
        path: 'timetable',
        loadComponent: () => import('./timetable/student-timetable').then(m => m.StudentTimetable)
      },
      {
        path: 'attendance',
        loadComponent: () => import('./attendance/student-attendance').then(m => m.StudentAttendance)
      },
      {
        path: 'assignments',
        loadComponent: () => import('./assignments/student-assignments').then(m => m.StudentAssignments)
      },
      {
        path: 'assignments/:assignmentId',
        loadComponent: () => import('./assignments/student-assignment-detail').then(m => m.StudentAssignmentDetail)
      },
      {
        path: 'exams',
        canActivate: [examPortalGuard],
        loadComponent: () => import('./exams/student-exams').then(m => m.StudentExams)
      },
      {
        path: 'exams/:examId/live',
        canActivate: [examPortalGuard],
        canDeactivate: [examInProgressGuard],
        loadComponent: () => import('./exams/student-online-exam').then(m => m.StudentOnlineExam)
      },
      {
        path: 'results',
        loadComponent: () => import('./results/student-results').then(m => m.StudentResults)
      },
      { path: 'fees', redirectTo: 'my-fees', pathMatch: 'full' },
      {
        path: 'my-fees',
        loadComponent: () => import('./my-fees/student-my-fees').then(m => m.StudentMyFees)
      },
      {
        path: 'receipts',
        loadComponent: () => import('./receipts/student-receipts').then(m => m.StudentReceipts)
      },
      {
        path: 'notices',
        loadComponent: () => import('./notices/student-notices').then(m => m.StudentNotices)
      },
      {
        path: 'message-center',
        loadComponent: () => import('./message-center/student-message-center').then(m => m.StudentMessageCenter)
      },
      { path: 'messages', redirectTo: 'message-center', pathMatch: 'full' },
      {
        path: 'helpdesk',
        loadComponent: () => import('./helpdesk/student-helpdesk').then(m => m.StudentHelpdesk)
      },
      {
        path: 'my-profile',
        loadComponent: () => import('./my-profile/student-my-profile').then(m => m.StudentMyProfile)
      },
      { path: 'profile', redirectTo: 'my-profile', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
