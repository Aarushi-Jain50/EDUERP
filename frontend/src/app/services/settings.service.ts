import { Injectable, signal } from '@angular/core';

export interface InstituteProfile {
  name: string;
  address: string;
  contact: string;
  email: string;
}

export interface AcademicDefaults {
  currentAcademicYear: string;
  attendanceThreshold: number;
  passingPercentage: number;
}

export interface GradeScale {
  id: string;
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  points: number;
}

export interface FeeSettings {
  receiptPrefix: string;
  defaultLateFinePerDay: number;
}

export interface SecurityPolicy {
  minPasswordLength: number;
  requireNumber: boolean;
  requireSymbol: boolean;
  sessionTimeoutMinutes: number;
  maxFailedLogins: number;
}

export interface NotificationSettings {
  inAppAlerts: boolean;
  feeAlerts: boolean;
  attendanceAlerts: boolean;
  examAlerts: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  readonly profile = signal<InstituteProfile>({
    name: 'Apex Institute of Technology',
    address: 'Plot 42, Knowledge Park III, Greater Noida, UP',
    contact: '+91 120 4455667',
    email: 'info@apexitm.edu.in'
  });

  readonly academic = signal<AcademicDefaults>({
    currentAcademicYear: '2025-26',
    attendanceThreshold: 75,
    passingPercentage: 40
  });

  readonly gradeScale = signal<GradeScale[]>([
    { id: 'g1', grade: 'O', minPercentage: 90, maxPercentage: 100, points: 10 },
    { id: 'g2', grade: 'A+', minPercentage: 80, maxPercentage: 89, points: 9 },
    { id: 'g3', grade: 'A', minPercentage: 70, maxPercentage: 79, points: 8 },
    { id: 'g4', grade: 'B+', minPercentage: 60, maxPercentage: 69, points: 7 },
    { id: 'g5', grade: 'B', minPercentage: 50, maxPercentage: 59, points: 6 },
    { id: 'g6', grade: 'C', minPercentage: 40, maxPercentage: 49, points: 5 },
    { id: 'g7', grade: 'F', minPercentage: 0, maxPercentage: 39, points: 0 }
  ]);

  readonly fees = signal<FeeSettings>({
    receiptPrefix: 'EDU',
    defaultLateFinePerDay: 50
  });

  readonly security = signal<SecurityPolicy>({
    minPasswordLength: 8,
    requireNumber: true,
    requireSymbol: true,
    sessionTimeoutMinutes: 30,
    maxFailedLogins: 5
  });

  readonly notifications = signal<NotificationSettings>({
    inAppAlerts: true,
    feeAlerts: true,
    attendanceAlerts: true,
    examAlerts: true
  });

  updateProfile(data: InstituteProfile) { this.profile.set(data); }
  updateAcademic(data: AcademicDefaults) { this.academic.set(data); }
  updateGradeScale(data: GradeScale[]) { this.gradeScale.set(data); }
  updateFees(data: FeeSettings) { this.fees.set(data); }
  updateSecurity(data: SecurityPolicy) { this.security.set(data); }
  updateNotifications(data: NotificationSettings) { this.notifications.set(data); }
}
