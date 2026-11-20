import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message, Notice, NoticeStatus } from '../models/communication.model';
import { NotificationService } from './notification.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

interface StoredMessage extends Omit<Message, 'timestamp'> {
  timestampIso: string;
}

const SEED_NOTICES: Notice[] = [
  {
    id: 'n-1',
    title: 'End-Term Examination Schedule',
    body: 'The end-term examinations for all PG courses will commence from Dec 15, 2025. All faculty members are requested to submit draft question papers by Nov 25.',
    audience: 'All',
    priority: 'Urgent',
    publishDate: '2025-11-01',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: true,
    attachmentRef: 'CIR-EXAM-2026-01.pdf',
    readCount: 142,
    createdBy: 'Admin Office',
    createdOn: '2025-10-25',
  },
  {
    id: 'n-2',
    title: 'Faculty Development Program (FDP) on AI in Pedagogy',
    body: 'A 3-day online FDP on integrating Generative AI into higher education curriculum will be hosted from Dec 2 to Dec 4, 2025. Attendance is mandatory for all department faculty.',
    audience: 'Faculty',
    priority: 'High',
    publishDate: '2025-11-05',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: true,
    attachmentRef: 'CIR-FDP-2026-04.pdf',
    readCount: 38,
    createdBy: 'Academic Council',
    createdOn: '2025-11-02',
  },
  {
    id: 'n-3',
    title: 'Mid-Term Evaluation Marks Submission Deadline',
    body: 'All course instructors must enter and publish mid-term examination marks on the EduERP portal on or before Nov 20, 2025.',
    audience: 'Faculty',
    priority: 'Urgent',
    publishDate: '2025-11-08',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: false,
    readCount: 41,
    createdBy: 'Controller of Examinations',
    createdOn: '2025-11-06',
  },
  {
    id: 'n-4',
    title: 'Annual Cultural Fest - Pratibha 2026',
    body: 'Registrations are open for the annual cultural fest Pratibha 2026. Student club leads can submit event proposals by Dec 5.',
    audience: 'All',
    priority: 'Medium',
    publishDate: '2025-11-10',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: false,
    readCount: 210,
    createdBy: 'Events Committee',
    createdOn: '2025-11-05',
  },
  {
    id: 'n-5',
    title: 'Even Semester Admit Card & Exam Form Verification',
    body: 'Students must verify their subject registration details and collect admit cards from the Academic Cell before Nov 22.',
    audience: 'Students',
    priority: 'Urgent',
    publishDate: '2026-11-01',
    expiryDate: '2026-12-20',
    status: 'Published',
    isPinned: true,
    readCount: 185,
    createdBy: 'Examination Cell',
    createdOn: '2026-11-01',
  },
  {
    id: 'n-6',
    title: 'MCA Semester II Major Project Synopsis Submission',
    body: 'All MCA Semester 2 students must submit signed project synopsis forms to the department coordinator by Nov 25.',
    audience: 'Course-wise',
    courseId: 'course-mca',
    priority: 'High',
    publishDate: '2026-11-05',
    expiryDate: '2026-12-15',
    status: 'Published',
    isPinned: false,
    readCount: 64,
    createdBy: 'MCA Department',
    createdOn: '2026-11-05',
  },
  {
    id: 'n-7',
    title: 'Central Library Book Renewal & No-Dues Schedule',
    body: 'Students holding reference books past 14 days should renew or return them at the library counter to avoid late fines.',
    audience: 'Students',
    priority: 'Medium',
    publishDate: '2026-11-08',
    expiryDate: '2026-12-30',
    status: 'Published',
    isPinned: false,
    readCount: 112,
    createdBy: 'Central Library',
    createdOn: '2026-11-08',
  },
  {
    id: 'n-8',
    title: 'B.Tech CSE Systems & Coding Workshop',
    body: 'Department of CSE is hosting a hands-on systems engineering lab workshop on Saturday at Auditorium B.',
    audience: 'Course-wise',
    courseId: 'course-btech-cse',
    priority: 'Medium',
    publishDate: '2026-11-09',
    expiryDate: '2026-12-20',
    status: 'Published',
    isPinned: false,
    readCount: 95,
    createdBy: 'CSE Department',
    createdOn: '2026-11-09',
  },
  {
    id: 'n-9',
    title: 'Digital Identity Card Download on ERP Portal',
    body: 'All newly enrolled and continuing students can download their authenticated digital photo identity card with QR verification from the ERP portal.',
    audience: 'Students',
    priority: 'Medium',
    publishDate: '2026-11-10',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: false,
    readCount: 158,
    createdBy: 'Registrar Office',
    createdOn: '2026-11-10',
  },
  {
    id: 'n-10',
    title: 'Semester Break & Winter Internship Guidelines',
    body: 'The Career Development Cell has published guidelines for 4-week winter industry internships. Students should obtain NOC through department advisors.',
    audience: 'All',
    priority: 'High',
    publishDate: '2026-11-12',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: true,
    readCount: 230,
    createdBy: 'Career Development Cell',
    createdOn: '2026-11-12',
  },
  {
    id: 'n-11',
    title: 'Parent-Teacher Academic Review Meeting (Even Semester)',
    body: 'Parents are invited for the half-yearly academic and attendance review with department mentors this Saturday from 10:00 AM to 01:30 PM in the Main Auditorium.',
    audience: 'Parents',
    priority: 'Urgent',
    publishDate: '2026-11-12',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: true,
    readCount: 92,
    createdBy: 'Dean Student Welfare',
    createdOn: '2026-11-12',
  },
  {
    id: 'n-12',
    title: 'Accounts Office Fee Installment & Receipt Advisory for Parents',
    body: 'Parents settling semester tuition installments are requested to collect stamped institutional receipts at the Accounts Office counter between 09:30 AM and 04:00 PM on working days.',
    audience: 'Parents',
    priority: 'Medium',
    publishDate: '2026-11-06',
    expiryDate: '2026-12-31',
    status: 'Published',
    isPinned: false,
    readCount: 74,
    createdBy: 'Accounts Office',
    createdOn: '2026-11-06',
  },
];

const SEED_MESSAGES: StoredMessage[] = [
  {
    id: 'msg-1',
    senderId: 'fac-1',
    senderName: 'Dr. S. N. Roy',
    senderRole: 'Professor',
    recipientId: 'admin',
    recipientName: 'Administrator',
    subject: 'Lab Equipment Requirement',
    body: 'We need 5 new workstations for the Advanced Data Structures lab.',
    timestampIso: new Date(Date.now() - 86400000).toISOString(),
    isRead: false,
    folder: 'Inbox',
    priority: 'High',
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
    timestampIso: new Date(Date.now() - 43200000).toISOString(),
    isRead: true,
    folder: 'Sent',
    priority: 'Normal',
  },
  {
    id: 'msg-stu-in-1',
    senderId: 'admin',
    senderName: 'Administrator / Central Office',
    senderRole: 'Admin',
    recipientId: 'stu-1',
    recipientName: 'Rahul Verma',
    subject: 'Library Circulation & ERP Credentials Activated',
    body: 'Dear Rahul, your digital student ID and library circulation access have been activated for the current academic session. Please verify your portal details and contact the registrar desk if any correction is needed.',
    timestampIso: new Date(Date.now() - 172800000).toISOString(),
    isRead: true,
    folder: 'Inbox',
    priority: 'Normal',
  },
  {
    id: 'msg-stu-in-2',
    senderId: 'fac-4',
    senderName: 'Prof. Meena Sharma',
    senderRole: 'Associate Professor',
    recipientId: 'stu-1',
    recipientName: 'Rahul Verma',
    subject: 'MCA Major Project Synopsis Review Notes',
    body: 'Rahul, I have reviewed your preliminary synopsis for the Cloud-Native Resource Scheduler. Please incorporate the database normalization diagrams and test case specifications before submitting the final draft next week.',
    timestampIso: new Date(Date.now() - 86400000).toISOString(),
    isRead: false,
    folder: 'Inbox',
    priority: 'High',
  },
  {
    id: 'msg-stu-in-3',
    senderId: 'fac-1',
    senderName: 'Dr. S. N. Roy',
    senderRole: 'Professor',
    recipientId: 'stu-1',
    recipientName: 'Rahul Verma',
    subject: 'Data Structures Lab 04 - Graph Algorithms',
    body: 'During Thursday lab session, we will cover Trie indexing and shortest path optimizations. Please review the lecture notes beforehand and bring your lab journals.',
    timestampIso: new Date(Date.now() - 28800000).toISOString(),
    isRead: false,
    folder: 'Inbox',
    priority: 'Normal',
  },
  {
    id: 'msg-stu-sent-1',
    senderId: 'stu-1',
    senderName: 'Rahul Verma',
    senderRole: 'Student',
    recipientId: 'fac-4',
    recipientName: 'Prof. Meena Sharma',
    subject: 'Re: Project Synopsis IEEE Reference Format',
    body: "Respected Ma'am, thank you for the feedback. I have updated the architectural flow charts. Could you please confirm if IEEE conference format should be used for bibliography references?",
    timestampIso: new Date(Date.now() - 43200000).toISOString(),
    isRead: true,
    folder: 'Sent',
    priority: 'Normal',
  },
  {
    id: 'msg-stu2-in-1',
    senderId: 'admin',
    senderName: 'Administrator / Central Office',
    senderRole: 'Admin',
    recipientId: 'stu-2',
    recipientName: 'Ananya Sharma',
    subject: 'Welcome to MCA Academic Session 2025-26',
    body: 'Welcome Ananya. Your elective registration for Cloud Computing and Big Data Analytics has been confirmed.',
    timestampIso: new Date(Date.now() - 259200000).toISOString(),
    isRead: true,
    folder: 'Inbox',
    priority: 'Normal',
  },
  {
    id: 'msg-par-in-1',
    senderId: 'fac-1',
    senderName: 'Dr. Amit Joshi',
    senderRole: 'Professor',
    recipientId: 'par-1',
    recipientName: 'Sanjay Verma',
    subject: 'Mid-Semester Attendance & Lab Progress — Rahul Verma',
    body: 'Dear Mr. Verma, Rahul has been performing well in Advanced Data Structures & Algorithms labs. Please encourage him to maintain regular attendance in morning lectures to stay well above the 75% requirement.',
    timestampIso: new Date(Date.now() - 129600000).toISOString(),
    isRead: false,
    folder: 'Inbox',
    priority: 'High',
  },
  {
    id: 'msg-par-in-2',
    senderId: 'admin',
    senderName: 'Administrator / Central Office',
    senderRole: 'Admin',
    recipientId: 'par-1',
    recipientName: 'Sanjay Verma',
    subject: 'Parent-Teacher Academic Review Schedule',
    body: "Dear Parent, the Even Semester review meeting is scheduled for this Saturday from 10:00 AM to 01:30 PM. Kindly bring your ward's enrollment reference when visiting department mentors.",
    timestampIso: new Date(Date.now() - 216000000).toISOString(),
    isRead: true,
    folder: 'Inbox',
    priority: 'Normal',
  },
  {
    id: 'msg-par-sent-1',
    senderId: 'par-1',
    senderName: 'Sanjay Verma',
    senderRole: 'Parent',
    recipientId: 'fac-2',
    recipientName: 'Prof. Ananya Sen',
    subject: 'Query on BCA Java Lab Schedule — Aanya Verma',
    body: "Respected Prof. Sen, could you confirm whether Aanya's Tuesday Java Programming Lab requires submitting hardcopy lab records this week?",
    timestampIso: new Date(Date.now() - 64800000).toISOString(),
    isRead: true,
    folder: 'Sent',
    priority: 'Normal',
  },
];

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notificationService = inject(NotificationService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _notices = signal<Notice[]>([]);
  private readonly _rawMessages = signal<StoredMessage[]>([]);

  private readonly noticesSync = new FirestoreCollectionSync<Notice>(
    'notices',
    'eduerp_notices_v2',
    this._notices,
    this.isBrowser
  );
  private readonly messagesSync = new FirestoreCollectionSync<StoredMessage>(
    'messages',
    'eduerp_messages_v2',
    this._rawMessages,
    this.isBrowser
  );

  readonly notices = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this._notices()
      .map(n => {
        const pub = new Date(n.publishDate);
        const exp = new Date(n.expiryDate);

        let status: NoticeStatus = n.status;
        if (status !== 'Draft') {
          if (now < pub) status = 'Scheduled';
          else if (now > exp) status = 'Expired';
          else status = 'Published';
        }
        return { ...n, status };
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.publishDate.localeCompare(a.publishDate));
  });

  readonly messages = computed<Message[]>(() =>
    this._rawMessages().map(m => ({
      ...m,
      timestamp: new Date(m.timestampIso || Date.now()),
    }))
  );

  constructor() {
    this._notices.set(this.noticesSync.loadInitial(SEED_NOTICES));
    this._rawMessages.set(this.messagesSync.loadInitial(SEED_MESSAGES));

    this.noticesSync.startSync();
    this.messagesSync.startSync();
  }

  // --- Notice CRUD ---
  saveNotice(
    data: Omit<Notice, 'id' | 'createdOn' | 'status'> & { status?: NoticeStatus },
    id?: string
  ): void {
    const isEdit = Boolean(id);
    const existing = id ? this._notices().find(n => n.id === id) : undefined;
    const saved: Notice = {
      ...data,
      id: id || `n-${Date.now()}`,
      status: data.status || existing?.status || 'Published',
      readCount: existing?.readCount ?? 0,
      createdOn: existing?.createdOn || new Date().toISOString().split('T')[0],
    };

    if (isEdit) {
      this._notices.update(list => list.map(n => (n.id === id ? saved : n)));
    } else {
      this._notices.update(list => [saved, ...list]);
      if (saved.status !== 'Draft') {
        this.notificationService.add({
          title: `New Notice: ${data.title}`,
          description: data.body.substring(0, 100) + (data.body.length > 100 ? '...' : ''),
          type: 'Notices',
          priority: data.priority,
          icon: 'campaign',
          link: '/admin/notices',
        });
      }
    }
    this.noticesSync.syncUpsert(saved);

    this.activityService.logActivity({
      user: data.createdBy || 'Administrator',
      role: 'Super Admin',
      operationType: isEdit ? 'Update' : saved.status === 'Draft' ? 'Create' : 'Publish',
      action: isEdit ? 'Updated Institutional Notice' : 'Published Institutional Notice',
      target: `${saved.title} (${saved.audience})`,
      recordId: saved.id,
      module: 'Notices',
      category: 'Notices',
      icon: 'campaign',
    });

    this.auditService.log({
      userId: 'admin',
      userName: data.createdBy || 'Administrator',
      role: 'Super Admin',
      module: 'Notices',
      action: isEdit ? 'Update' : 'Create',
      target: saved.title,
      status: 'Success',
      newValue: `${saved.audience} / ${saved.priority}`,
    });
  }

  toggleNoticePin(id: string): void {
    const target = this._notices().find(n => n.id === id);
    if (!target) return;
    const updated: Notice = { ...target, isPinned: !target.isPinned };
    this._notices.update(list => list.map(n => (n.id === id ? updated : n)));
    this.noticesSync.syncUpsert(updated);
  }

  deleteNotice(id: string): void {
    const existing = this._notices().find(n => n.id === id);
    if (!existing) return;
    this._notices.update(list => list.filter(n => n.id !== id));
    this.noticesSync.syncDelete(id);

    this.activityService.logActivity({
      user: 'Administrator',
      role: 'Super Admin',
      operationType: 'Delete',
      action: 'Deleted Institutional Notice',
      target: existing.title,
      recordId: id,
      module: 'Notices',
      category: 'Notices',
      icon: 'delete_outline',
    });
  }

  // --- Messaging Logic ---
  sendMessage(m: Omit<Message, 'id' | 'timestamp' | 'isRead' | 'folder'>): void {
    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();
    const idSent = `msg-${Date.now()}-sent`;
    const idInbox = `msg-${Date.now()}-inbox`;

    const sentCopy: StoredMessage = {
      ...m,
      id: idSent,
      timestampIso,
      isRead: true,
      folder: 'Sent',
    };

    const inboxCopy: StoredMessage = {
      ...m,
      id: idInbox,
      timestampIso,
      isRead: false,
      folder: 'Inbox',
    };

    this._rawMessages.update(list => [sentCopy, inboxCopy, ...list]);
    this.messagesSync.syncUpsert(sentCopy);
    this.messagesSync.syncUpsert(inboxCopy);

    this.notificationService.add({
      title: `New Message from ${m.senderName}`,
      description: m.subject,
      type: 'Notices',
      priority: m.priority === 'High' ? 'High' : 'Medium',
      icon: 'mail',
      link: m.recipientId.startsWith('stu-')
        ? '/student/message-center'
        : m.recipientId.startsWith('fac-')
          ? '/faculty/message-center'
          : '/admin/messages',
      targetRole: m.recipientId.startsWith('stu-')
        ? 'student'
        : m.recipientId.startsWith('fac-')
          ? 'faculty'
          : 'admin',
      targetStudentId: m.recipientId.startsWith('stu-') ? m.recipientId : undefined,
    });

    this.activityService.logActivity({
      user: m.senderName,
      role: m.senderRole,
      operationType: 'Create',
      action: 'Sent Internal Message',
      target: `${m.subject} -> ${m.recipientName}`,
      recordId: idSent,
      module: 'Message Center',
      category: 'Notices',
      icon: 'mail',
    });
  }

  markMessageRead(id: string): void {
    const target = this._rawMessages().find(m => m.id === id);
    if (!target || target.isRead) return;
    const updated: StoredMessage = { ...target, isRead: true };
    this._rawMessages.update(list => list.map(m => (m.id === id ? updated : m)));
    this.messagesSync.syncUpsert(updated);
  }

  deleteMessage(id: string): void {
    this._rawMessages.update(list => list.filter(m => m.id !== id));
    this.messagesSync.syncDelete(id);
  }
}
