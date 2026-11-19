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
      body: 'The end-term examinations for all PG courses will commence from Dec 15, 2025. All faculty members are requested to submit draft question papers by Nov 25.',
      audience: 'All',
      priority: 'Urgent',
      publishDate: '2025-11-01',
      expiryDate: '2026-12-31',
      status: 'Published',
      isPinned: true,
      createdBy: 'Admin Office',
      createdOn: '2025-10-25'
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
      createdBy: 'Academic Council',
      createdOn: '2025-11-02'
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
      createdBy: 'Controller of Examinations',
      createdOn: '2025-11-06'
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
      createdBy: 'Events Committee',
      createdOn: '2025-11-05'
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
      createdBy: 'Examination Cell',
      createdOn: '2026-11-01'
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
      createdBy: 'MCA Department',
      createdOn: '2026-11-05'
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
      createdBy: 'Central Library',
      createdOn: '2026-11-08'
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
      createdBy: 'CSE Department',
      createdOn: '2026-11-09'
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
      createdBy: 'Registrar Office',
      createdOn: '2026-11-10'
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
      createdBy: 'Career Development Cell',
      createdOn: '2026-11-12'
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
      createdBy: 'Dean Student Welfare',
      createdOn: '2026-11-12'
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
      createdBy: 'Accounts Office',
      createdOn: '2026-11-06'
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
    },
    // Seed messages for student (stu-1: Rahul Verma)
    {
      id: 'msg-stu-in-1',
      senderId: 'admin',
      senderName: 'Administrator / Central Office',
      senderRole: 'Admin',
      recipientId: 'stu-1',
      recipientName: 'Rahul Verma',
      subject: 'Library Circulation & ERP Credentials Activated',
      body: 'Dear Rahul, your digital student ID and library circulation access have been activated for the current academic session. Please verify your portal details and contact the registrar desk if any correction is needed.',
      timestamp: new Date(Date.now() - 172800000), // 2 days ago
      isRead: true,
      folder: 'Inbox',
      priority: 'Normal'
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
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      isRead: false,
      folder: 'Inbox',
      priority: 'High'
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
      timestamp: new Date(Date.now() - 28800000), // 8 hours ago
      isRead: false,
      folder: 'Inbox',
      priority: 'Normal'
    },
    {
      id: 'msg-stu-sent-1',
      senderId: 'stu-1',
      senderName: 'Rahul Verma',
      senderRole: 'Student',
      recipientId: 'fac-4',
      recipientName: 'Prof. Meena Sharma',
      subject: 'Re: Project Synopsis IEEE Reference Format',
      body: 'Respected Ma\'am, thank you for the feedback. I have updated the architectural flow charts. Could you please confirm if IEEE conference format should be used for bibliography references?',
      timestamp: new Date(Date.now() - 43200000), // 12 hours ago
      isRead: true,
      folder: 'Sent',
      priority: 'Normal'
    },
    // Seed messages for student (stu-2: Ananya Sharma)
    {
      id: 'msg-stu2-in-1',
      senderId: 'admin',
      senderName: 'Administrator / Central Office',
      senderRole: 'Admin',
      recipientId: 'stu-2',
      recipientName: 'Ananya Sharma',
      subject: 'Welcome to MCA Academic Session 2025-26',
      body: 'Welcome Ananya. Your elective registration for Cloud Computing and Big Data Analytics has been confirmed.',
      timestamp: new Date(Date.now() - 259200000),
      isRead: true,
      folder: 'Inbox',
      priority: 'Normal'
    },
    // Seed messages for parent (par-1: Sanjay Verma)
    {
      id: 'msg-par-in-1',
      senderId: 'fac-1',
      senderName: 'Dr. Amit Joshi',
      senderRole: 'Professor',
      recipientId: 'par-1',
      recipientName: 'Sanjay Verma',
      subject: 'Mid-Semester Attendance & Lab Progress — Rahul Verma',
      body: 'Dear Mr. Verma, Rahul has been performing well in Advanced Data Structures & Algorithms labs. Please encourage him to maintain regular attendance in morning lectures to stay well above the 75% requirement.',
      timestamp: new Date(Date.now() - 129600000),
      isRead: false,
      folder: 'Inbox',
      priority: 'High'
    },
    {
      id: 'msg-par-in-2',
      senderId: 'admin',
      senderName: 'Administrator / Central Office',
      senderRole: 'Admin',
      recipientId: 'par-1',
      recipientName: 'Sanjay Verma',
      subject: 'Parent-Teacher Academic Review Schedule',
      body: 'Dear Parent, the Even Semester review meeting is scheduled for this Saturday from 10:00 AM to 01:30 PM. Kindly bring your ward\'s enrollment reference when visiting department mentors.',
      timestamp: new Date(Date.now() - 216000000),
      isRead: true,
      folder: 'Inbox',
      priority: 'Normal'
    },
    {
      id: 'msg-par-sent-1',
      senderId: 'par-1',
      senderName: 'Sanjay Verma',
      senderRole: 'Parent',
      recipientId: 'fac-2',
      recipientName: 'Prof. Ananya Sen',
      subject: 'Query on BCA Java Lab Schedule — Aanya Verma',
      body: 'Respected Prof. Sen, could you confirm whether Aanya\'s Tuesday Java Programming Lab requires submitting hardcopy lab records this week?',
      timestamp: new Date(Date.now() - 64800000),
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
    const timestamp = new Date();
    const idSent = `msg-${Date.now()}-sent`;
    const idInbox = `msg-${Date.now()}-inbox`;

    const sentCopy: Message = {
      ...m,
      id: idSent,
      timestamp,
      isRead: true,
      folder: 'Sent'
    };

    const inboxCopy: Message = {
      ...m,
      id: idInbox,
      timestamp,
      isRead: false,
      folder: 'Inbox'
    };

    // Add both Sent and Inbox copies so both parties see the synchronized conversation
    this._messages.update(list => [sentCopy, inboxCopy, ...list]);

    // Send notification to recipient
    this.notificationService.add({
      title: `New Message from ${m.senderName}`,
      description: m.subject,
      type: 'Notices',
      priority: m.priority === 'High' ? 'High' : 'Medium',
      icon: 'mail',
      link: m.recipientId.startsWith('stu-') ? '/student/message-center' : '/faculty/message-center',
      targetRole: m.recipientId.startsWith('stu-') ? 'student' : m.recipientId.startsWith('fac-') ? 'faculty' : 'admin',
      targetStudentId: m.recipientId.startsWith('stu-') ? m.recipientId : undefined
    });
  }

  markMessageRead(id: string): void {
    this._messages.update(list => list.map(m => m.id === id ? { ...m, isRead: true } : m));
  }

  deleteMessage(id: string): void {
    this._messages.update(list => list.filter(m => m.id !== id));
  }
}
