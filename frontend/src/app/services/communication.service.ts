import { Injectable, signal, computed, inject } from '@angular/core';
import { Notice, Message, NoticeStatus } from '../models/communication.model';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly notificationService = inject(NotificationService);

  private readonly _notices = signal<Notice[]>([
    {
      id: 'n-1',
      title: 'End-Term Examination Schedule',
      body: 'The end-term examinations for all PG courses will commence from Dec 15, 2025.',
      audience: 'Students',
      priority: 'Urgent',
      publishDate: '2025-11-01',
      expiryDate: '2025-12-31',
      status: 'Published',
      isPinned: true,
      createdBy: 'Admin Office',
      createdOn: '2025-10-25'
    },
    {
      id: 'n-2',
      title: 'Annual Cultural Fest - Pratibha 2026',
      body: 'Registrations are open for the annual cultural fest.',
      audience: 'All',
      priority: 'Medium',
      publishDate: '2025-11-10',
      expiryDate: '2026-01-20',
      status: 'Published',
      isPinned: false,
      createdBy: 'Events Committee',
      createdOn: '2025-11-05'
    }
  ]);

  private readonly _messages = signal<Message[]>([
    {
      id: 'msg-1',
      senderId: 'fac-1',
      senderName: 'Dr. S. N. Roy',
      senderRole: 'Professor',
      recipientId: 'admin',
      recipientName: 'Administrator',
      subject: 'Lab Equipment Requirement',
      body: 'We need 5 new workstations for the Advanced Data Structures lab.',
      timestamp: new Date(Date.now() - 86400000),
      isRead: false,
      folder: 'Inbox',
      priority: 'High'
    },
    {
      id: 'msg-2',
      senderId: 'admin',
      senderName: 'Administrator',
      senderRole: 'Admin',
      recipientId: 'fac-1',
      recipientName: 'Dr. S. N. Roy',
      subject: 'Re: Lab Equipment',
      body: 'Budget approved. Please coordinate with the procurement department.',
      timestamp: new Date(Date.now() - 43200000),
      isRead: true,
      folder: 'Sent',
      priority: 'Normal'
    }
  ]);

  readonly notices = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return this._notices().map(n => {
      const pub = new Date(n.publishDate);
      const exp = new Date(n.expiryDate);
      
      let status: NoticeStatus = n.status;
      if (status !== 'Draft') {
        if (now < pub) status = 'Scheduled';
        else if (now > exp) status = 'Expired';
        else status = 'Published';
      }
      return { ...n, status };
    });
  });

  readonly messages = this._messages.asReadonly();

  // --- Notice CRUD ---
  saveNotice(data: Omit<Notice, 'id' | 'createdOn' | 'status'>, id?: string): void {
    if (id) {
      this._notices.update(list => list.map(n => n.id === id ? { ...n, ...data } : n));
    } else {
      const newNotice: Notice = {
        ...data,
        id: `n-${Date.now()}`,
        status: 'Published',
        createdOn: new Date().toISOString().split('T')[0]
      };
      this._notices.update(list => [newNotice, ...list]);
      
      // Auto-notify if published
      this.notificationService.add({
        title: `New Notice: ${data.title}`,
        description: data.body.substring(0, 100) + '...',
        type: 'Notices',
        priority: data.priority,
        icon: 'campaign'
      });
    }
  }

  deleteNotice(id: string): void {
    this._notices.update(list => list.filter(n => n.id !== id));
  }

  // --- Messaging Logic ---
  sendMessage(m: Omit<Message, 'id' | 'timestamp' | 'isRead' | 'folder'>): void {
    const id = `msg-${Date.now()}`;
    const timestamp = new Date();
    
    // Add to Sent
    this._messages.update(list => [{ ...m, id, timestamp, isRead: true, folder: 'Sent' }, ...list]);
    
    // In a real multi-user app, this would also add to the recipient's Inbox.
    // For this mock, we'll simulate an incoming reply if it's high priority.
  }

  markMessageRead(id: string): void {
    this._messages.update(list => list.map(m => m.id === id ? { ...m, isRead: true } : m));
  }

  deleteMessage(id: string): void {
    this._messages.update(list => list.filter(m => m.id !== id));
  }
}
