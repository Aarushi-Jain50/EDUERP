import { Routes } from '@angular/router';
import { ParentLayout } from './parent-layout';
import { ParentDashboard } from './dashboard/parent-dashboard';
import { ParentMyChildren } from './my-children/parent-my-children';

export const PARENT_ROUTES: Routes = [
  {
    path: '',
    component: ParentLayout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ParentDashboard },
      { path: 'my-children', component: ParentMyChildren },
      {
        path: 'attendance',
        loadComponent: () => import('./attendance/parent-attendance').then(m => m.ParentAttendance)
      },
      {
        path: 'timetable',
        loadComponent: () => import('./timetable/parent-timetable').then(m => m.ParentTimetable)
      },
      {
        path: 'assignments',
        loadComponent: () => import('./assignments/parent-assignments').then(m => m.ParentAssignments)
      },
      {
        path: 'exams',
        loadComponent: () => import('./exams/parent-exams').then(m => m.ParentExams)
      },
      {
        path: 'results',
        loadComponent: () => import('./results/parent-results').then(m => m.ParentResults)
      },
      {
        path: 'fees',
        loadComponent: () => import('./fees/parent-fees').then(m => m.ParentFees)
      },
      {
        path: 'reports',
        loadComponent: () => import('./reports/parent-reports').then(m => m.ParentReports)
      },
      {
        path: 'notices',
        loadComponent: () => import('./notices/parent-notices').then(m => m.ParentNotices)
      },
      {
        path: 'message-center',
        loadComponent: () => import('./message-center/parent-message-center').then(m => m.ParentMessageCenter)
      },
      {
        path: 'my-profile',
        loadComponent: () => import('./my-profile/parent-my-profile').then(m => m.ParentMyProfile)
      },
      {
        path: 'helpdesk',
        loadComponent: () => import('./helpdesk/parent-helpdesk').then(m => m.ParentHelpdesk)
      },
      {
        path: 'security',
        loadComponent: () => import('./security/parent-security').then(m => m.ParentSecurity)
      },
      { path: 'messages', redirectTo: 'message-center', pathMatch: 'full' },
      { path: 'profile', redirectTo: 'my-profile', pathMatch: 'full' }
    ]
  }
];
