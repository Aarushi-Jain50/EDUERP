import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Unsubscribe, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db, testFirestoreConnection } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export type ActivityCategory = 'Academic' | 'People' | 'Attendance' | 'Exams' | 'Fees' | 'Notices' | 'Security';
export type ActivityPeriod = 'Today' | 'Yesterday' | 'Earlier';
export type ActivityOperationType = 'Create' | 'Update' | 'Delete' | 'Approve' | 'Reject' | 'Publish' | 'Export' | 'Security';

export interface ActivityItem {
  id: string;
  user: string;
  role: string;
  operationType: ActivityOperationType;
  action: string;
  target: string;
  recordId?: string;
  module: string;
  category: ActivityCategory;
  timestampIso: string;
  details?: string;
  period: ActivityPeriod;
  relativeTime: string;
  exactTime: string;
  daysAgo: number;
  icon: string;
}

export type ActivityLogInput = Omit<
  ActivityItem,
  'id' | 'period' | 'relativeTime' | 'exactTime' | 'daysAgo' | 'timestampIso' | 'operationType'
> & {
  operationType?: ActivityOperationType;
  timestampIso?: string;
  period?: ActivityPeriod;
  relativeTime?: string;
  exactTime?: string;
  daysAgo?: number;
};

interface SeedActivityBase {
  id: string;
  user: string;
  role: string;
  operationType: ActivityOperationType;
  action: string;
  target: string;
  recordId?: string;
  module: string;
  category: ActivityCategory;
  minutesOffset: number;
  details: string;
  icon: string;
}

const ACTIVITY_STORAGE_KEY = 'eduerp_institutional_activities_v2';

const SEED_ACTIVITY_BASE: SeedActivityBase[] = [
  {
    id: 'act-001',
    user: 'Admin (Dean Office)',
    role: 'System Administrator',
    operationType: 'Create',
    action: 'enrolled new student',
    target: 'Rahul Verma (MCA-2025-001) into MCA Semester 2',
    recordId: 'MCA-2025-001',
    module: 'Student Admissions',
    category: 'People',
    minutesOffset: 12,
    details: 'Admission verification completed and enrollment ID generated with Section A allocation.',
    icon: 'person_add'
  },
  {
    id: 'act-002',
    user: 'Prof. Meena Sharma',
    role: 'Associate Professor',
    operationType: 'Update',
    action: 'marked attendance for',
    target: 'BCA Section A (34 Present, 5 Absent, 1 Leave)',
    recordId: 'sess-15',
    module: 'Attendance Management',
    category: 'Attendance',
    minutesOffset: 35,
    details: 'Morning lecture register locked and synced with student portal.',
    icon: 'how_to_reg'
  },
  {
    id: 'act-003',
    user: 'Suresh Patil',
    role: 'Accounts Officer',
    operationType: 'Create',
    action: 'collected semester fee of',
    target: '₹60,000 from Rahul Verma (MCA-2025-001)',
    recordId: 'EDU-2025-26-00001',
    module: 'Fee Collection',
    category: 'Fees',
    minutesOffset: 65,
    details: 'UPI Settlement #UPI-50284910 verified and receipt issued.',
    icon: 'payments'
  },
  {
    id: 'act-004',
    user: 'Kavita Nair',
    role: 'Registrar',
    operationType: 'Publish',
    action: 'published official notice:',
    target: 'Even Semester Admit Card & Exam Form Verification',
    recordId: 'n-5',
    module: 'Notices & Announcements',
    category: 'Notices',
    minutesOffset: 125,
    details: 'Broadcasted to all Students with Urgent priority and pinned on portal board.',
    icon: 'campaign'
  },
  {
    id: 'act-005',
    user: 'Dr. R.K. Raman',
    role: 'Controller of Examinations',
    operationType: 'Create',
    action: 'scheduled examination session for',
    target: 'Internal Assessment I — Advanced Data Structures (ex-1)',
    recordId: 'ex-1',
    module: 'Examinations Cell',
    category: 'Exams',
    minutesOffset: 185,
    details: 'Protected Online Exam Browser enabled with 60-minute timer and proctor policy.',
    icon: 'assignment'
  },
  {
    id: 'act-006',
    user: 'Admin (Dean Office)',
    role: 'System Administrator',
    operationType: 'Export',
    action: 'exported Attendance Report for',
    target: 'MCA Semester 2 (Cumulative Monthly Sheet)',
    recordId: 'RPT-ATT-2026-11',
    module: 'Attendance Management',
    category: 'Attendance',
    minutesOffset: 245,
    details: 'Generated printable register and Excel workbook for academic council review.',
    icon: 'file_download'
  },
  {
    id: 'act-007',
    user: 'Dr. S. N. Roy',
    role: 'HOD Computer Applications',
    operationType: 'Update',
    action: 'allocated subject workload to',
    target: 'Dr. Amit Joshi — Advanced Data Structures & Algorithms (4 hrs/wk)',
    recordId: 'alloc-1',
    module: 'Subject Allocation',
    category: 'Academic',
    minutesOffset: 310,
    details: 'Faculty workload check passed with zero timetable conflicts.',
    icon: 'school'
  },
  {
    id: 'act-008',
    user: 'Dinesh Rathore',
    role: 'Senior Accounts Officer',
    operationType: 'Publish',
    action: 'dispatched automated fee reminder to',
    target: 'Students with overdue 2nd installment balances',
    recordId: 'FEE-REM-2026-08',
    module: 'Pending Fees',
    category: 'Fees',
    minutesOffset: 380,
    details: 'SMS and portal reminder notices queued for overdue installment ledgers.',
    icon: 'receipt_long'
  },
  {
    id: 'act-009',
    user: 'Dr. R.K. Raman',
    role: 'Controller of Examinations',
    operationType: 'Approve',
    action: 'approved and published results for',
    target: 'End-Term Theory Exam (ex-2) — 5 student scripts verified',
    recordId: 'ex-2',
    module: 'Results & Grades',
    category: 'Exams',
    minutesOffset: 430,
    details: 'Marks published live to Student & Parent result portals.',
    icon: 'grade'
  },
  {
    id: 'act-010',
    user: 'Vikram Chauhan',
    role: 'Security Systems Engineer',
    operationType: 'Security',
    action: 'flagged failed login attempts on',
    target: 'faculty account k.rao@eduerp.edu (IP: 103.21.124.9)',
    recordId: 'SEC-ALERT-902',
    module: 'Security Overview',
    category: 'Security',
    minutesOffset: 495,
    details: 'Rate limiter engaged for 15 minutes after 3 consecutive invalid credential attempts.',
    icon: 'shield'
  },
  {
    id: 'act-011',
    user: 'Dr. P. V. Ramamurthy',
    role: 'Dean of Student Welfare',
    operationType: 'Approve',
    action: 'approved academic event leave for',
    target: 'Rahul Verma (MCA-2025-001) — Inter-University Cloud Hackathon',
    recordId: 'lr-seed-1',
    module: 'Attendance Management',
    category: 'Attendance',
    minutesOffset: 1500,
    details: 'On-duty academic leave regularized for 2026-11-04.',
    icon: 'verified'
  },
  {
    id: 'act-012',
    user: 'Suresh Patil',
    role: 'Accounts Officer',
    operationType: 'Update',
    action: 'reversed cancelled cheque receipt #CHQ-114082 for',
    target: 'Rahul Verma (MCA-2025-001) — ₹60,000',
    recordId: 'CHQ-114082',
    module: 'Payment History',
    category: 'Fees',
    minutesOffset: 1680,
    details: 'Incorrect installment mapped; re-issued cleanly via UPI settlement.',
    icon: 'receipt'
  },
  {
    id: 'act-013',
    user: 'Dr. Anita Desai',
    role: 'Dean (Academics)',
    operationType: 'Update',
    action: 'updated curriculum & credits for',
    target: 'M.Tech Artificial Intelligence & Robotics (4 Semesters)',
    recordId: 'course-mtech-ai',
    module: 'Courses & Programs',
    category: 'Academic',
    minutesOffset: 1850,
    details: 'Intake capacity set to 30 and NEP credit structure validated.',
    icon: 'menu_book'
  },
  {
    id: 'act-014',
    user: 'Rajesh Verma',
    role: 'ERP Administrator',
    operationType: 'Security',
    action: 'assigned HOD governance role to',
    target: 'Dr. Shalini Gupta (FAC-0006 — CSE)',
    recordId: 'fac-6',
    module: 'Roles & Permissions',
    category: 'Security',
    minutesOffset: 2020,
    details: 'Departmental approval permissions granted under Academic Governance policy.',
    icon: 'admin_panel_settings'
  },
  {
    id: 'act-015',
    user: 'Pooja Sharma',
    role: 'Admissions Coordinator',
    operationType: 'Approve',
    action: 'verified admission dossier for',
    target: 'Ananya Sharma (MCA-2025-002)',
    recordId: 'stu-2',
    module: 'Student Admissions',
    category: 'People',
    minutesOffset: 3200,
    details: 'Qualifying degree marksheets and transfer certificate validated.',
    icon: 'person_add'
  },
  {
    id: 'act-016',
    user: 'Prof. Sandeep Bansal',
    role: 'Associate Professor (IT)',
    operationType: 'Publish',
    action: 'published course assignment for',
    target: 'Cloud Computing & DevOps — Kubernetes Deployment Lab',
    recordId: 'asgn-4',
    module: 'Assignments',
    category: 'Academic',
    minutesOffset: 5900,
    details: 'Worksheet posted with grading rubric and file submission enabled.',
    icon: 'assignment_turned_in'
  },
  {
    id: 'act-017',
    user: 'Dr. Manish Aggarwal',
    role: 'HOD Management Studies',
    operationType: 'Update',
    action: 'updated weekly class timetable for',
    target: 'MCA Semester 2 Section A',
    recordId: 'TT-MCA-2A',
    module: 'Timetable',
    category: 'Academic',
    minutesOffset: 10500,
    details: 'Lab slot reassigned to Block B Lab 2 with room clash validation.',
    icon: 'calendar_month'
  },
  {
    id: 'act-018',
    user: 'Vikram Solanki',
    role: 'Finance Head',
    operationType: 'Create',
    action: 'configured fee structure slab for',
    target: 'Master of Computer Applications (AY 2025-26 · ₹1,20,000)',
    recordId: 'fs-1',
    module: 'Fee Structure',
    category: 'Fees',
    minutesOffset: 19200,
    details: '2-installment breakdown published with ₹50/day late fine policy.',
    icon: 'account_balance_wallet'
  }
];

function computeTimingFields(timestampIso: string): {
  period: ActivityPeriod;
  relativeTime: string;
  exactTime: string;
  daysAgo: number;
} {
  const target = new Date(timestampIso);
  if (Number.isNaN(target.getTime())) {
    return {
      period: 'Today',
      relativeTime: 'Just now',
      exactTime: 'Today',
      daysAgo: 0
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const daysAgo = Math.max(0, Math.round((startOfToday - startOfTarget) / 86400000));

  let period: ActivityPeriod = 'Earlier';
  if (daysAgo === 0) period = 'Today';
  else if (daysAgo === 1) period = 'Yesterday';

  const diffMs = Math.max(0, now.getTime() - target.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let relativeTime = '';
  if (diffMins < 1) relativeTime = 'Just now';
  else if (diffMins < 60) relativeTime = `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  else if (daysAgo === 0) relativeTime = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  else if (daysAgo === 1) {
    relativeTime = `Yesterday at ${target.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    relativeTime = `${daysAgo} days ago`;
  }

  const exactTime =
    daysAgo === 0
      ? `Today at ${target.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : daysAgo === 1
        ? `Yesterday at ${target.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        : target.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

  return { period, relativeTime, exactTime, daysAgo };
}

function buildSeedActivities(): ActivityItem[] {
  const now = Date.now();
  return SEED_ACTIVITY_BASE.map(seed => {
    const timestampIso = new Date(now - seed.minutesOffset * 60000).toISOString();
    const timing = computeTimingFields(timestampIso);
    return {
      id: seed.id,
      user: seed.user,
      role: seed.role,
      operationType: seed.operationType,
      action: seed.action,
      target: seed.target,
      recordId: seed.recordId,
      module: seed.module,
      category: seed.category,
      timestampIso,
      details: seed.details,
      icon: seed.icon,
      ...timing
    };
  });
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _rawActivities = signal<ActivityItem[]>(this.loadInitialActivities());
  private readonly _authUid = signal<string | null>(auth.currentUser?.uid ?? null);
  private readonly _isCloudSynced = signal<boolean>(false);
  private activityUnsub: Unsubscribe | null = null;

  readonly isCloudSynced = this._isCloudSynced.asReadonly();

  readonly items = computed<ActivityItem[]>(() => {
    return this._rawActivities()
      .map(item => ({
        ...item,
        ...computeTimingFields(item.timestampIso)
      }))
      .sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void testFirestoreConnection();

      onAuthStateChanged(auth, user => {
        const uid = user?.uid ?? null;
        this._authUid.set(uid);
        this.teardownListener();
        if (uid) {
          this.attachListener(uid);
        } else {
          this._isCloudSynced.set(false);
        }
      });

      if (auth.currentUser?.uid) {
        this.attachListener(auth.currentUser.uid);
      }
    }
  }

  private loadInitialActivities(): ActivityItem[] {
    const seeds = buildSeedActivities();
    if (!isPlatformBrowser(this.platformId)) return seeds;
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ActivityItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            ...item,
            operationType: item.operationType || this.inferOperation(item.action),
            timestampIso: item.timestampIso || new Date().toISOString(),
            ...computeTimingFields(item.timestampIso || new Date().toISOString())
          }));
        }
      }
    } catch {
      // ignore corrupted localStorage
    }
    return seeds;
  }

  private saveLocalActivities(list: ActivityItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(list.slice(0, 150)));
    } catch {
      // ignore storage quota errors
    }
  }

  private teardownListener(): void {
    this.activityUnsub?.();
    this.activityUnsub = null;
  }

  private attachListener(uid: string): void {
    this._isCloudSynced.set(true);
    const actQ = query(collection(db, 'institutionalActivities'), where('ownerUid', '==', uid));
    this.activityUnsub = onSnapshot(
      actQ,
      snapshot => {
        if (snapshot.docs.length === 0) return;
        this._rawActivities.update(local => {
          const byId = new Map(local.map(item => [item.id, item]));
          for (const d of snapshot.docs) {
            const data = d.data() as Omit<ActivityItem, 'period' | 'relativeTime' | 'exactTime' | 'daysAgo'>;
            byId.set(data.id, {
              ...data,
              ...computeTimingFields(data.timestampIso)
            });
          }
          const merged = Array.from(byId.values()).sort((a, b) =>
            b.timestampIso.localeCompare(a.timestampIso)
          );
          this.saveLocalActivities(merged);
          return merged;
        });
      },
      error => handleFirestoreError(error, OperationType.LIST, 'institutionalActivities')
    );
  }

  private inferOperation(action: string): ActivityOperationType {
    const a = action.toLowerCase();
    if (a.includes('approv')) return 'Approve';
    if (a.includes('reject') || a.includes('return')) return 'Reject';
    if (a.includes('publish') || a.includes('broadcast') || a.includes('dispatch')) return 'Publish';
    if (a.includes('export') || a.includes('download')) return 'Export';
    if (a.includes('delet') || a.includes('remov') || a.includes('cancel')) return 'Delete';
    if (a.includes('security') || a.includes('flag') || a.includes('role') || a.includes('lock')) return 'Security';
    if (a.includes('updat') || a.includes('modif') || a.includes('mark') || a.includes('allocat')) return 'Update';
    return 'Create';
  }

  getActivities(): ActivityItem[] {
    return this.items();
  }

  logActivity(item: ActivityLogInput): void {
    const timestampIso = item.timestampIso || new Date().toISOString();
    const operationType = item.operationType || this.inferOperation(item.action);
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timing = computeTimingFields(timestampIso);

    const newItem: ActivityItem = {
      id,
      user: item.user,
      role: item.role,
      operationType,
      action: item.action,
      target: item.target,
      recordId: item.recordId,
      module: item.module,
      category: item.category,
      timestampIso,
      details: item.details,
      icon: item.icon,
      ...timing
    };

    this._rawActivities.update(current => {
      const next = [newItem, ...current];
      this.saveLocalActivities(next);
      return next;
    });

    const uid = this._authUid() ?? auth.currentUser?.uid ?? null;
    if (uid && isPlatformBrowser(this.platformId)) {
      const firestorePayload: Record<string, unknown> = {
        id: newItem.id,
        user: newItem.user.slice(0, 120),
        role: newItem.role.slice(0, 80),
        operationType: newItem.operationType,
        action: newItem.action.slice(0, 160),
        target: newItem.target.slice(0, 300),
        module: newItem.module.slice(0, 80),
        category: newItem.category,
        timestampIso: newItem.timestampIso.slice(0, 60),
        icon: newItem.icon.slice(0, 60),
        ownerUid: uid
      };
      if (newItem.recordId) {
        firestorePayload['recordId'] = newItem.recordId.slice(0, 128);
      }
      if (newItem.details) {
        firestorePayload['details'] = newItem.details.slice(0, 500);
      }
      void setDoc(doc(db, 'institutionalActivities', newItem.id), firestorePayload).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `institutionalActivities/${newItem.id}`);
      });
    }
  }
}
