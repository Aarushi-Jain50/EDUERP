import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

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

export interface AdminProfilePrefs {
  fullName: string;
  email: string;
  phone: string;
  timezone: string;
  employeeId: string;
  department: string;
  joiningDate: string;
  title: string;
  avatarTheme: 'violet' | 'indigo' | 'emerald' | 'slate';
}

export interface EmergencyLockoutState {
  active: boolean;
  activatedAt?: string;
  activatedBy?: string;
  reason?: string;
}

interface SystemSettingDoc {
  id: string;
  payload: unknown;
}

const DEFAULT_PROFILE: InstituteProfile = {
  name: 'Apex Institute of Technology',
  address: 'Plot 42, Knowledge Park III, Greater Noida, UP',
  contact: '+91 120 4455667',
  email: 'info@apexitm.edu.in'
};

const DEFAULT_ACADEMIC: AcademicDefaults = {
  currentAcademicYear: '2025-26',
  attendanceThreshold: 75,
  passingPercentage: 40
};

export const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { id: 'g1', grade: 'O', minPercentage: 90, maxPercentage: 100, points: 10 },
  { id: 'g2', grade: 'A+', minPercentage: 80, maxPercentage: 89, points: 9 },
  { id: 'g3', grade: 'A', minPercentage: 70, maxPercentage: 79, points: 8 },
  { id: 'g4', grade: 'B+', minPercentage: 60, maxPercentage: 69, points: 7 },
  { id: 'g5', grade: 'B', minPercentage: 50, maxPercentage: 59, points: 6 },
  { id: 'g6', grade: 'C', minPercentage: 40, maxPercentage: 49, points: 5 },
  { id: 'g7', grade: 'F', minPercentage: 0, maxPercentage: 39, points: 0 }
];

const DEFAULT_FEES: FeeSettings = {
  receiptPrefix: 'EDU',
  defaultLateFinePerDay: 50
};

const DEFAULT_SECURITY: SecurityPolicy = {
  minPasswordLength: 8,
  requireNumber: true,
  requireSymbol: true,
  sessionTimeoutMinutes: 30,
  maxFailedLogins: 5
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  inAppAlerts: true,
  feeAlerts: true,
  attendanceAlerts: true,
  examAlerts: true
};

const DEFAULT_ADMIN_PROFILE: AdminProfilePrefs = {
  fullName: 'Administrator',
  email: 'admin@eduerp.edu',
  phone: '+91 9876543210',
  timezone: 'IST',
  employeeId: 'EMP-1001',
  department: 'IT Administration',
  joiningDate: 'Aug 15, 2022',
  title: 'ERP Super Admin',
  avatarTheme: 'violet'
};

const DEFAULT_LOCKOUT: EmergencyLockoutState = {
  active: false
};

const SEED_DOCS: SystemSettingDoc[] = [
  { id: 'inst-profile', payload: DEFAULT_PROFILE },
  { id: 'academic-defaults', payload: DEFAULT_ACADEMIC },
  { id: 'grade-scale', payload: DEFAULT_GRADE_SCALE },
  { id: 'fee-settings', payload: DEFAULT_FEES },
  { id: 'security-policy', payload: DEFAULT_SECURITY },
  { id: 'notification-settings', payload: DEFAULT_NOTIFICATIONS },
  { id: 'admin-profile', payload: DEFAULT_ADMIN_PROFILE },
  { id: 'lockout-state', payload: DEFAULT_LOCKOUT }
];

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _docs = signal<SystemSettingDoc[]>([]);
  private readonly sync = new FirestoreCollectionSync<SystemSettingDoc>(
    'systemSettings',
    'eduerp_system_settings_v2',
    this._docs,
    this.isBrowser
  );

  constructor() {
    this._docs.set(this.sync.loadInitial(SEED_DOCS));
    this.sync.startSync();
  }

  private getDoc<T>(id: string, fallback: T): T {
    const found = this._docs().find(d => d.id === id);
    if (!found || found.payload === undefined || found.payload === null) {
      return fallback;
    }
    return found.payload as T;
  }

  private upsertDoc<T>(id: string, payload: T): void {
    const record: SystemSettingDoc = { id, payload };
    this._docs.update(list => {
      const exists = list.some(d => d.id === id);
      return exists ? list.map(d => (d.id === id ? record : d)) : [...list, record];
    });
    this.sync.syncUpsert(record);
  }

  readonly profile = computed<InstituteProfile>(() => this.getDoc('inst-profile', DEFAULT_PROFILE));
  readonly academic = computed<AcademicDefaults>(() => this.getDoc('academic-defaults', DEFAULT_ACADEMIC));
  readonly gradeScale = computed<GradeScale[]>(() => this.getDoc('grade-scale', DEFAULT_GRADE_SCALE));
  readonly fees = computed<FeeSettings>(() => this.getDoc('fee-settings', DEFAULT_FEES));
  readonly security = computed<SecurityPolicy>(() => this.getDoc('security-policy', DEFAULT_SECURITY));
  readonly notifications = computed<NotificationSettings>(() =>
    this.getDoc('notification-settings', DEFAULT_NOTIFICATIONS)
  );
  readonly adminProfile = computed<AdminProfilePrefs>(() =>
    this.getDoc('admin-profile', DEFAULT_ADMIN_PROFILE)
  );
  readonly emergencyLockout = computed<EmergencyLockoutState>(() =>
    this.getDoc('lockout-state', DEFAULT_LOCKOUT)
  );

  updateProfile(data: InstituteProfile): void {
    this.upsertDoc('inst-profile', { ...data });
  }

  updateAcademic(data: AcademicDefaults): void {
    this.upsertDoc('academic-defaults', { ...data });
  }

  updateGradeScale(data: GradeScale[]): void {
    this.upsertDoc('grade-scale', data.map(row => ({ ...row })));
  }

  resetDefaultGradeScale(): void {
    this.upsertDoc('grade-scale', DEFAULT_GRADE_SCALE.map(row => ({ ...row })));
  }

  updateFees(data: FeeSettings): void {
    this.upsertDoc('fee-settings', { ...data });
  }

  updateSecurity(data: SecurityPolicy): void {
    this.upsertDoc('security-policy', { ...data });
  }

  updateNotifications(data: NotificationSettings): void {
    this.upsertDoc('notification-settings', { ...data });
  }

  updateAdminProfile(data: Partial<AdminProfilePrefs>): void {
    const next: AdminProfilePrefs = {
      ...this.adminProfile(),
      ...data
    };
    this.upsertDoc('admin-profile', next);
  }

  setEmergencyLockout(active: boolean, activatedBy: string, reason?: string): void {
    const next: EmergencyLockoutState = active
      ? {
          active: true,
          activatedAt: new Date().toISOString(),
          activatedBy,
          reason: reason?.trim() || 'Administrative emergency security freeze activated.'
        }
      : { active: false };
    this.upsertDoc('lockout-state', next);
  }

  getStorageInventory(): { key: string; records: number; bytes: number }[] {
    if (!this.isBrowser) return [];
    const items: { key: string; records: number; bytes: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('eduerp_')) continue;
      const raw = localStorage.getItem(key) || '';
      let count = 1;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) count = parsed.length;
      } catch {
        // scalar string
      }
      items.push({ key, records: count, bytes: raw.length });
    }
    return items.sort((a, b) => a.key.localeCompare(b.key));
  }

  exportSystemBackupSnapshot(): string {
    const datasets: Record<string, unknown> = {};
    if (this.isBrowser) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('eduerp_')) continue;
        if (key === 'eduerp_admin_token') continue;
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try {
          datasets[key] = JSON.parse(raw);
        } catch {
          datasets[key] = raw;
        }
      }
    }

    return JSON.stringify(
      {
        app: 'EduERP',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        settingsDocs: this._docs(),
        datasets
      },
      null,
      2
    );
  }

  restoreSystemBackupSnapshot(jsonText: string): {
    ok: boolean;
    restoredSettings: number;
    restoredDatasets: number;
    message: string;
  } {
    try {
      const parsed = JSON.parse(jsonText) as {
        app?: string;
        settingsDocs?: SystemSettingDoc[];
        datasets?: Record<string, unknown>;
      };
      if (!parsed || parsed.app !== 'EduERP') {
        return {
          ok: false,
          restoredSettings: 0,
          restoredDatasets: 0,
          message: 'Invalid snapshot format. Only verified EduERP v2.0 JSON backups are accepted.'
        };
      }

      let restoredSettings = 0;
      if (Array.isArray(parsed.settingsDocs)) {
        for (const docItem of parsed.settingsDocs) {
          if (docItem?.id && docItem.payload !== undefined) {
            this.upsertDoc(docItem.id, docItem.payload);
            restoredSettings += 1;
          }
        }
      }

      let restoredDatasets = 0;
      if (this.isBrowser && parsed.datasets && typeof parsed.datasets === 'object') {
        for (const [key, val] of Object.entries(parsed.datasets)) {
          if (!key.startsWith('eduerp_') || key === 'eduerp_admin_token') continue;
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
          restoredDatasets += 1;
        }
      }

      return {
        ok: true,
        restoredSettings,
        restoredDatasets,
        message: `Restored ${restoredSettings} system setting group(s) and ${restoredDatasets} institutional dataset(s).`
      };
    } catch {
      return {
        ok: false,
        restoredSettings: 0,
        restoredDatasets: 0,
        message: 'Could not parse backup JSON file. Ensure the file is valid and uncorrupted.'
      };
    }
  }
}
