import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Unsubscribe, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export type AuditAction =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Login'
  | 'Logout'
  | 'Failed Login'
  | 'Export'
  | 'Permission Change';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  role: string;
  module: string;
  action: AuditAction;
  target: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  status: 'Success' | 'Failure';
}

interface StoredAuditEntry {
  id: string;
  timestampIso: string;
  userId: string;
  userName: string;
  role: string;
  module: string;
  action: AuditAction;
  target: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  status: 'Success' | 'Failure';
}

const AUDIT_STORAGE_KEY = 'eduerp_audit_logs_v2';

function buildDeterministicSeedLogs(): StoredAuditEntry[] {
  const now = Date.now();
  const templates: {
    userId: string;
    userName: string;
    role: string;
    module: string;
    action: AuditAction;
    target: string;
    oldValue?: string;
    newValue?: string;
    ipAddress: string;
    status: 'Success' | 'Failure';
    minutesAgo: number;
  }[] = [
    {
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Settings',
      action: 'Update',
      target: 'Security Policy & Academic Defaults',
      oldValue: 'Session Timeout: 20m',
      newValue: 'Session Timeout: 30m',
      ipAddress: '10.24.0.10',
      status: 'Success',
      minutesAgo: 14
    },
    {
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Roles & Permissions',
      action: 'Permission Change',
      target: 'Role: Faculty RBAC Matrix',
      oldValue: 'Results Edit: false',
      newValue: 'Results Edit: true',
      ipAddress: '10.24.0.10',
      status: 'Success',
      minutesAgo: 42
    },
    {
      userId: 'u2',
      userName: 'Suresh Patil',
      role: 'Accounts Officer',
      module: 'Fee Collection',
      action: 'Create',
      target: 'Receipt #EDU-2025-26-00001 (Rahul Verma)',
      newValue: '₹60,000 via UPI',
      ipAddress: '10.24.0.22',
      status: 'Success',
      minutesAgo: 78
    },
    {
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Authentication',
      action: 'Login',
      target: 'Admin Console Session #SES-4821',
      newValue: 'Verified Google + 2FA',
      ipAddress: '10.24.0.10',
      status: 'Success',
      minutesAgo: 95
    },
    {
      userId: 'u4',
      userName: 'Priyanshu Das',
      role: 'Student',
      module: 'Authentication',
      action: 'Failed Login',
      target: 'Account priyanshu_d',
      newValue: 'Invalid password (attempt 4/5)',
      ipAddress: '103.21.124.9',
      status: 'Failure',
      minutesAgo: 135
    },
    {
      userId: 'u3',
      userName: 'Kavita Nair',
      role: 'Registrar',
      module: 'Admissions',
      action: 'Update',
      target: 'Application #ADM-2025-019',
      oldValue: 'Document Check: Pending',
      newValue: 'Verified & Provisioned',
      ipAddress: '10.24.0.18',
      status: 'Success',
      minutesAgo: 185
    },
    {
      userId: 'u5',
      userName: 'Dr. R.K. Raman',
      role: 'Controller of Examinations',
      module: 'Results',
      action: 'Update',
      target: 'End-Term MCA Sem 2 Moderation',
      oldValue: 'Draft',
      newValue: 'Published',
      ipAddress: '10.24.0.31',
      status: 'Success',
      minutesAgo: 260
    },
    {
      userId: 'u2',
      userName: 'Suresh Patil',
      role: 'Accounts Officer',
      module: 'Fees',
      action: 'Export',
      target: 'Monthly Fee Defaulters Ledger',
      ipAddress: '10.24.0.22',
      status: 'Success',
      minutesAgo: 340
    },
    {
      userId: 'u6',
      userName: 'Dr. S. N. Roy',
      role: 'Faculty',
      module: 'Attendance',
      action: 'Create',
      target: 'MCA Sem 2 Sec A Attendance Session',
      newValue: '34 Present, 5 Absent, 1 Leave',
      ipAddress: '10.24.0.44',
      status: 'Success',
      minutesAgo: 420
    },
    {
      userId: 'unknown',
      userName: 'Unverified Client',
      role: 'Guest',
      module: 'Authentication',
      action: 'Failed Login',
      target: 'Admin Portal Endpoint',
      newValue: 'Blocked unauthorized token',
      ipAddress: '172.16.84.19',
      status: 'Failure',
      minutesAgo: 510
    },
    {
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Students',
      action: 'Update',
      target: 'Section Batch Promotion AY 2025-26',
      oldValue: 'Semester 1',
      newValue: 'Semester 2',
      ipAddress: '10.24.0.10',
      status: 'Success',
      minutesAgo: 780
    },
    {
      userId: 'admin',
      userName: 'System Administrator',
      role: 'Super Admin',
      module: 'Notices',
      action: 'Create',
      target: 'Notice #N-05: Even Semester Admit Card Verification',
      ipAddress: '10.24.0.10',
      status: 'Success',
      minutesAgo: 1120
    }
  ];

  return templates.map((tpl, idx) => ({
    id: `log-seed-${idx + 1}`,
    timestampIso: new Date(now - tpl.minutesAgo * 60_000).toISOString(),
    userId: tpl.userId,
    userName: tpl.userName,
    role: tpl.role,
    module: tpl.module,
    action: tpl.action,
    target: tpl.target,
    oldValue: tpl.oldValue,
    newValue: tpl.newValue,
    ipAddress: tpl.ipAddress,
    status: tpl.status
  }));
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _rawEntries = signal<StoredAuditEntry[]>(this.loadInitialEntries());
  private readonly _authUid = signal<string | null>(auth.currentUser?.uid ?? null);
  private readonly _isCloudSynced = signal<boolean>(false);
  private unsubSnapshot: Unsubscribe | null = null;
  private sequence = 100;

  readonly isCloudSynced = this._isCloudSynced.asReadonly();

  readonly entries = computed<AuditEntry[]>(() => {
    return this._rawEntries()
      .map(item => ({
        id: item.id,
        timestamp: new Date(item.timestampIso),
        userId: item.userId,
        userName: item.userName,
        role: item.role,
        module: item.module,
        action: item.action,
        target: item.target,
        oldValue: item.oldValue,
        newValue: item.newValue,
        ipAddress: item.ipAddress || 'Campus Console',
        status: (item.status === 'Failure' ? 'Failure' : 'Success') as 'Success' | 'Failure'
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  constructor() {
    if (this.isBrowser) {
      onAuthStateChanged(auth, user => {
        const uid = user?.uid ?? null;
        this._authUid.set(uid);
        this.teardownListener();
        if (uid) {
          this.attachListener();
        } else {
          this._isCloudSynced.set(false);
        }
      });

      if (auth.currentUser?.uid) {
        this.attachListener();
      }
    }
  }

  private loadInitialEntries(): StoredAuditEntry[] {
    const seeds = buildDeterministicSeedLogs();
    if (!this.isBrowser) return seeds;
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuditEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            ...item,
            timestampIso: item.timestampIso || new Date().toISOString(),
            ipAddress: item.ipAddress || 'Campus Console'
          }));
        }
      }
    } catch {
      // ignore corrupted local cache
    }
    return seeds;
  }

  private saveLocalEntries(list: StoredAuditEntry[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(list.slice(0, 250)));
    } catch {
      // ignore storage quota errors
    }
  }

  private teardownListener(): void {
    this.unsubSnapshot?.();
    this.unsubSnapshot = null;
  }

  private attachListener(): void {
    this.teardownListener();
    this.unsubSnapshot = onSnapshot(
      collection(db, 'auditLogs'),
      snapshot => {
        this._isCloudSynced.set(true);
        if (snapshot.empty) return;
        this._rawEntries.update(local => {
          const byId = new Map(local.map(item => [item.id, item]));
          for (const d of snapshot.docs) {
            const data = d.data() as Partial<StoredAuditEntry>;
            if (data.id && data.timestampIso) {
              byId.set(data.id, {
                id: data.id,
                timestampIso: data.timestampIso,
                userId: data.userId || 'admin',
                userName: data.userName || 'Administrator',
                role: data.role || 'Super Admin',
                module: data.module || 'System',
                action: (data.action as AuditAction) || 'Update',
                target: data.target || '',
                oldValue: data.oldValue,
                newValue: data.newValue,
                ipAddress: data.ipAddress || 'Cloud Console',
                status: data.status === 'Failure' ? 'Failure' : 'Success'
              });
            }
          }
          const merged = Array.from(byId.values()).sort((a, b) =>
            b.timestampIso.localeCompare(a.timestampIso)
          );
          this.saveLocalEntries(merged);
          return merged;
        });
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'auditLogs');
        } catch {
          // Non-admin portals cannot list admin auditLogs; keep local trail active
        }
      }
    );
  }

  log(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'ipAddress'> & { ipAddress?: string }): void {
    this.sequence += 1;
    const timestampIso = new Date().toISOString();
    const id = `log-${Date.now()}-${this.sequence}`;
    const stored: StoredAuditEntry = {
      id,
      timestampIso,
      userId: entry.userId,
      userName: entry.userName,
      role: entry.role,
      module: entry.module,
      action: entry.action,
      target: entry.target,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: entry.ipAddress || '10.24.0.10',
      status: entry.status
    };

    this._rawEntries.update(prev => {
      const next = [stored, ...prev];
      this.saveLocalEntries(next);
      return next;
    });

    const uid = this._authUid() ?? auth.currentUser?.uid ?? null;
    if (uid && this.isBrowser) {
      const payload: Record<string, unknown> = {
        id: stored.id,
        userId: stored.userId.slice(0, 128),
        userName: stored.userName.slice(0, 120),
        role: stored.role.slice(0, 60),
        module: stored.module.slice(0, 80),
        action: stored.action.slice(0, 80),
        target: stored.target.slice(0, 300),
        status: stored.status,
        ipAddress: stored.ipAddress.slice(0, 64),
        timestampIso: stored.timestampIso.slice(0, 60),
        ownerUid: uid
      };
      if (stored.oldValue) {
        payload['oldValue'] = stored.oldValue.slice(0, 1000);
      }
      if (stored.newValue) {
        payload['newValue'] = stored.newValue.slice(0, 1000);
      }
      void setDoc(doc(db, 'auditLogs', stored.id), payload).catch(err => {
        try {
          handleFirestoreError(err, OperationType.WRITE, `auditLogs/${stored.id}`);
        } catch {
          // Non-admin callers logging portal events fall back cleanly to local history
        }
      });
    }
  }

  getAll(): AuditEntry[] {
    return this.entries();
  }

  getByUser(userId: string): AuditEntry[] {
    return this.entries().filter(e => e.userId === userId);
  }

  getForCurrentAdmin(email?: string): AuditEntry[] {
    const cleanEmail = (email || '').toLowerCase();
    return this.entries().filter(e => {
      const uid = e.userId.toLowerCase();
      const uname = e.userName.toLowerCase();
      const role = e.role.toLowerCase();
      return (
        uid === 'u1' ||
        uid === 'admin' ||
        uid === 'user-admin' ||
        uid === 'user-superadmin' ||
        (cleanEmail !== '' && uid === cleanEmail) ||
        uname.includes('admin') ||
        role.includes('super admin')
      );
    });
  }
}
