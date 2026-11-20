export type NoticeAudience = 'All' | 'Students' | 'Faculty' | 'Parents' | 'Course-wise';
export type NoticePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type NoticeStatus = 'Draft' | 'Scheduled' | 'Published' | 'Expired';

export interface Notice {
  id: string;
  title: string;
  body: string;
  audience: NoticeAudience;
  courseId?: string;
  priority: NoticePriority;
  publishDate: string;
  expiryDate: string;
  status: NoticeStatus;
  isPinned: boolean;
  attachmentRef?: string;
  readCount?: number;
  createdBy: string;
  createdOn: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  body: string;
  timestamp: Date;
  timestampIso?: string;
  isRead: boolean;
  folder: 'Inbox' | 'Sent';
  priority: 'Normal' | 'High';
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  messages: Message[];
}
