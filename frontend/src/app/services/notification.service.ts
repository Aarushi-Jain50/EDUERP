import { Injectable, signal, computed } from '@angular/core';

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
  link?: string; // Route to navigate to
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([
    { 
      id: 'notif-1', 
      title: 'Low Attendance Alert', 
      description: '18 students fell below 75% threshold in Semester IV.', 
      type: 'Academic', 
      priority: 'High', 
      timestamp: new Date(Date.now() - 600000), 
      isRead: false, 
      icon: 'warning',
      link: '/admin/attendance'
    },
    { 
      id: 'notif-2', 
      title: 'New Admission Registered', 
      description: 'Candidate Ananya Das enrolled in MCA program.', 
      type: 'System', 
      priority: 'Medium', 
      timestamp: new Date(Date.now() - 2100000), 
      isRead: false, 
      icon: 'person_add',
      link: '/admin/student-admissions'
    },
    { 
      id: 'notif-3', 
      title: 'Exam Hall Matrix Published', 
      description: 'Even Semester End-Term hall seating generated.', 
      type: 'Academic', 
      priority: 'Medium', 
      timestamp: new Date(Date.now() - 3600000), 
      isRead: false, 
      icon: 'assignment',
      link: '/admin/examinations'
    },
    { 
      id: 'notif-4', 
      title: 'Fee Payment Received', 
      description: 'SBI Collect Challan REC-2026-9921 verified.', 
      type: 'Fees', 
      priority: 'Low', 
      timestamp: new Date(Date.now() - 7200000), 
      isRead: false, 
      icon: 'payments',
      link: '/admin/payment-history'
    }
  ]);

  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() => this._notifications().filter(n => !n.isRead).length);

  add(n: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): void {
    const newNotif: Notification = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      isRead: false
    };
    this._notifications.update(list => [newNotif, ...list]);
  }

  markRead(id: string): void {
    this._notifications.update(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, isRead: true })));
  }

  clearAll(): void {
    this._notifications.set([]);
  }
}
