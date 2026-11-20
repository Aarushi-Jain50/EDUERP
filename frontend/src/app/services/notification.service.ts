import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';
import { ActivityService } from './activity.service';

export type NotificationType = 'Fees' | 'Academic' | 'Notices' | 'System';
export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  isRead: boolean;
  link?: string;
  icon?: string;
  targetRole?: 'student' | 'faculty' | 'admin' | 'parent' | 'all';
  targetStudentId?: string;
  targetFacultyId?: string;
}

interface StoredNotification extends Omit<Notification, 'timestamp'> {
  timestampIso: string;
}

const SEED_NOTIFICATIONS: StoredNotification[] = [
  {
    id: 'notif-1',
    title: 'Low Attendance Alert',
    description: 'Students fell below the mandatory 75% threshold in current active sessions.',
    type: 'Academic',
    priority: 'High',
    timestampIso: new Date(Date.now() - 600000).toISOString(),
    isRead: false,
    icon: 'warning',
    link: '/admin/attendance',
    targetRole: 'admin',
  },
  {
    id: 'notif-2',
    title: 'New Admission Registered',
    description: 'Candidate Ananya Das enrolled in MCA program.',
    type: 'System',
    priority: 'Medium',
    timestampIso: new Date(Date.now() - 2100000).toISOString(),
    isRead: false,
    icon: 'person_add',
    link: '/admin/student-admissions',
    targetRole: 'admin',
  },
  {
    id: 'notif-3',
    title: 'Exam Hall Matrix Published',
    description: 'Even Semester End-Term hall seating generated.',
    type: 'Academic',
    priority: 'Medium',
    timestampIso: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    icon: 'assignment',
    link: '/admin/examinations',
    targetRole: 'admin',
  },
  {
    id: 'notif-4',
    title: 'Fee Payment Received',
    description: 'SBI Collect Challan REC-2026-9921 verified.',
    type: 'Fees',
    priority: 'Low',
    timestampIso: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
    icon: 'payments',
    link: '/admin/payment-history',
    targetRole: 'admin',
  },
];

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly activityService = inject(ActivityService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _rawNotifications = signal<StoredNotification[]>([]);
  private readonly sync = new FirestoreCollectionSync<StoredNotification>(
    'notifications',
    'eduerp_notifications_v2',
    this._rawNotifications,
    this.isBrowser
  );

  readonly notifications = computed<Notification[]>(() =>
    this._rawNotifications()
      .map(n => ({
        ...n,
        timestamp: new Date(n.timestampIso || Date.now()),
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  );

  readonly unreadCount = computed(() => this._rawNotifications().filter(n => !n.isRead).length);

  constructor() {
    this._rawNotifications.set(this.sync.loadInitial(SEED_NOTIFICATIONS));
    this.sync.startSync();
  }

  add(n: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Notification {
    const timestamp = new Date();
    const stored: StoredNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestampIso: timestamp.toISOString(),
      isRead: false,
    };

    this._rawNotifications.update(list => [stored, ...list]);
    this.sync.syncUpsert(stored);

    return {
      ...stored,
      timestamp,
    };
  }

  broadcastAlert(payload: {
    title: string;
    description: string;
    type: NotificationType;
    priority: NotificationPriority;
    targetRole: 'student' | 'faculty' | 'admin' | 'parent' | 'all';
    link?: string;
  }): Notification {
    const notif = this.add({
      title: payload.title,
      description: payload.description,
      type: payload.type,
      priority: payload.priority,
      targetRole: payload.targetRole,
      link: payload.link,
      icon:
        payload.type === 'Fees'
          ? 'payments'
          : payload.type === 'Academic'
            ? 'school'
            : payload.type === 'Notices'
              ? 'campaign'
              : 'notifications_active',
    });

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Publish',
      action: 'Broadcast Notification Alert',
      target: `${payload.title} -> ${payload.targetRole}`,
      recordId: notif.id,
      module: 'Notifications',
      category: 'Notices',
      icon: 'notifications_active',
      details: `${payload.priority} priority ${payload.type} broadcast`,
    });

    return notif;
  }

  markRead(id: string): void {
    const target = this._rawNotifications().find(n => n.id === id);
    if (!target || target.isRead) return;
    const updated: StoredNotification = { ...target, isRead: true };
    this._rawNotifications.update(list => list.map(n => (n.id === id ? updated : n)));
    this.sync.syncUpsert(updated);
  }

  markAllRead(): void {
    const next = this._rawNotifications().map(n => ({ ...n, isRead: true }));
    this._rawNotifications.set(next);
    next.forEach(item => this.sync.syncUpsert(item));
  }

  deleteNotification(id: string): void {
    this._rawNotifications.update(list => list.filter(n => n.id !== id));
    this.sync.syncDelete(id);
  }

  clearAll(): void {
    const ids = this._rawNotifications().map(n => n.id);
    this._rawNotifications.set([]);
    ids.forEach(id => this.sync.syncDelete(id));
  }
}
