import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CommunicationService } from '../../../services/communication.service';
import { FacultyService } from '../../../services/faculty.service';
import { StudentsService } from '../../../services/students.service';
import {
  StudentFirebaseService,
  SupportTicketRecord,
  TicketStatus,
} from '../../../services/student-firebase.service';
import { Message } from '../../../models/communication.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-center-page',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans min-h-[calc(100vh-140px)]">
      <app-page-header
        title="Message Center & Helpdesk Desk"
        subtitle="Manage direct administrative correspondence and resolve student support tickets synced with Firestore."
        actionLabel="Compose Message"
        actionIcon="edit"
        (actionClicked)="openCompose()"
      />

      <!-- Top Mode Tabs -->
      <div class="flex flex-wrap border-b border-[#E2E8F0] gap-1">
        <button
          type="button"
          (click)="workspaceTab.set('messages')"
          [class]="workspaceTab() === 'messages' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-5 py-2.5 text-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">mail</mat-icon>
          Internal Messages
          @if (unreadCount() > 0) {
            <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{{ unreadCount() }}</span>
          }
        </button>
        <button
          type="button"
          (click)="workspaceTab.set('tickets')"
          [class]="workspaceTab() === 'tickets' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
          class="px-5 py-2.5 text-sm transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">support_agent</mat-icon>
          Support Tickets ({{ openTicketCount() }} Open)
        </button>
      </div>

      @if (workspaceTab() === 'messages') {
        <div class="flex-1 flex bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden min-h-[540px]">
          <!-- Left Pane: Folders & Message List -->
          <div class="w-full lg:w-[380px] border-r border-slate-100 flex flex-col shrink-0 min-h-0" [class.hidden]="selectedMessage() && isMobile()">
            <div class="p-4 flex gap-2">
              <button
                type="button"
                (click)="activeFolder.set('Inbox')"
                [class]="activeFolder() === 'Inbox' ? 'bg-[#6D42E8] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
                class="flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <mat-icon class="!text-sm !w-4 !h-4">inbox</mat-icon>
                Inbox
                @if (unreadCount(); as count) {
                  <span class="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{{ count }}</span>
                }
              </button>
              <button
                type="button"
                (click)="activeFolder.set('Sent')"
                [class]="activeFolder() === 'Sent' ? 'bg-[#6D42E8] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
                class="flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <mat-icon class="!text-sm !w-4 !h-4">send</mat-icon>
                Sent
              </button>
            </div>

            <div class="px-4 pb-4">
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <mat-icon class="!text-sm !w-4 !h-4">search</mat-icon>
                </span>
                <input
                  type="text"
                  [formControl]="searchControl"
                  (input)="searchQuery.set(searchControl.value || '')"
                  placeholder="Search messages..."
                  class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:border-[#6D42E8]"
                />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
              @for (m of filteredMessages(); track m.id) {
                <button
                  type="button"
                  (click)="selectMessage(m)"
                  class="w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-col gap-1 cursor-pointer group relative"
                  [class.bg-purple-50/50]="selectedMessage()?.id === m.id"
                >
                  @if (!m.isRead && m.folder === 'Inbox') {
                    <div class="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#6D42E8] rounded-full"></div>
                  }
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-black text-slate-900 truncate pr-4">{{ m.folder === 'Inbox' ? m.senderName : m.recipientName }}</span>
                    <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">{{ getRelativeTime(m.timestamp) }}</span>
                  </div>
                  <span class="text-[11px] font-bold text-slate-700 truncate">{{ m.subject }}</span>
                  <p class="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{{ m.body }}</p>
                </button>
              } @empty {
                <div class="py-20 text-center text-slate-300">
                  <mat-icon class="!text-4xl !w-9 !h-9 block mx-auto mb-2 opacity-30">mail_outline</mat-icon>
                  <p class="text-xs font-medium italic">No messages found</p>
                </div>
              }
            </div>
          </div>

          <!-- Right Pane: Thread View -->
          <div class="flex-1 flex flex-col min-h-0 relative" [class.hidden]="!selectedMessage() && isMobile()">
            @if (selectedMessage(); as msg) {
              <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div class="flex items-center gap-3">
                  @if (isMobile()) {
                    <button type="button" (click)="selectedMessage.set(null)" class="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer">
                      <mat-icon>arrow_back</mat-icon>
                    </button>
                  }
                  <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#6D42E8] font-black text-sm border border-slate-200 uppercase">
                    {{ getInitials(msg.folder === 'Inbox' ? msg.senderName : msg.recipientName) }}
                  </div>
                  <div>
                    <h4 class="text-sm font-black text-slate-900 leading-none">{{ msg.folder === 'Inbox' ? msg.senderName : msg.recipientName }}</h4>
                    <p class="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">{{ msg.senderRole }} • {{ msg.folder === 'Inbox' ? 'Recipient: Admin' : 'Sent by Admin' }}</p>
                  </div>
                </div>
                <button type="button" (click)="openDeleteConfirm(msg.id)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
                  <mat-icon class="!text-base !w-4 !h-4">delete_outline</mat-icon>
                </button>
              </div>

              <div class="px-6 py-3 bg-slate-50 border-b border-slate-100">
                <span class="text-[11px] font-black text-slate-800 uppercase tracking-widest">{{ msg.subject }}</span>
              </div>

              <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div class="max-w-3xl mx-auto space-y-6">
                  <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {{ msg.body }}
                  </div>
                  <div class="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">Sent on {{ msg.timestamp.toLocaleString() }}</div>
                </div>
              </div>

              <div class="p-4 bg-white border-t border-slate-100">
                <div class="max-w-3xl mx-auto relative">
                  <textarea
                    [formControl]="replyControl"
                    rows="2"
                    class="w-full pl-4 pr-14 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"
                    placeholder="Type a reply..."
                  ></textarea>
                  <button
                    type="button"
                    [disabled]="!(replyControl.value || '').trim()"
                    (click)="sendReply()"
                    class="absolute right-2.5 bottom-3 w-9 h-9 bg-[#6D42E8] text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer"
                  >
                    <mat-icon class="!text-sm !w-4 !h-4">send</mat-icon>
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex-1 flex flex-col items-center justify-center p-20 text-slate-300">
                <div class="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                  <mat-icon class="!text-5xl !w-12 !h-12 opacity-25">mail</mat-icon>
                </div>
                <h3 class="text-xl font-bold text-slate-800">Select a conversation</h3>
                <p class="text-sm mt-1 max-w-xs text-center">Choose a thread from the left list or compose a new institutional message.</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Support Tickets / Helpdesk Desk -->
        <div class="flex-1 flex flex-col lg:flex-row bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden min-h-[540px]">
          <div class="w-full lg:w-[400px] border-r border-slate-100 flex flex-col shrink-0">
            <div class="p-4 border-b border-slate-100 flex flex-wrap gap-1.5">
              @for (st of ['All', 'Open', 'In Progress', 'Resolved', 'Closed']; track st) {
                <button
                  type="button"
                  (click)="ticketStatusFilter.set(st)"
                  [class]="ticketStatusFilter() === st ? 'bg-[#6D42E8] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  {{ st }}
                </button>
              }
            </div>

            <div class="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[540px]">
              @for (t of filteredTickets(); track t.id) {
                <button
                  type="button"
                  (click)="selectTicket(t)"
                  [class.bg-purple-50/50]="selectedTicket()?.id === t.id"
                  class="w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-col gap-1.5 cursor-pointer"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-mono text-[11px] font-bold text-indigo-600">{{ t.ticketNo }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="ticketBadgeClass(t.status)">{{ t.status }}</span>
                  </div>
                  <p class="text-xs font-bold text-slate-900 line-clamp-1">{{ t.subject }}</p>
                  <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{{ t.studentName }} ({{ t.enrollmentNo }})</span>
                    <span class="font-semibold">{{ t.priority }}</span>
                  </div>
                </button>
              } @empty {
                <div class="p-12 text-center text-slate-400 text-xs">No support tickets match the selected status filter.</div>
              }
            </div>
          </div>

          <!-- Ticket Detail & Admin Reply -->
          <div class="flex-1 flex flex-col min-w-0">
            @if (selectedTicket(); as t) {
              <div class="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-indigo-600">{{ t.ticketNo }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-700">{{ t.category }}</span>
                  </div>
                  <h3 class="text-base font-bold text-slate-900 mt-1">{{ t.subject }}</h3>
                  <p class="text-xs text-slate-500 mt-0.5">{{ t.studentName }} • {{ t.enrollmentNo }}</p>
                </div>

                <div class="flex items-center gap-2">
                  @for (nextSt of ['Open', 'In Progress', 'Resolved', 'Closed']; track nextSt) {
                    <button
                      type="button"
                      (click)="updateTicketStatus(t.id, $any(nextSt))"
                      [class]="t.status === nextSt ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'"
                      class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      {{ nextSt }}
                    </button>
                  }
                </div>
              </div>

              <div class="flex-1 p-5 space-y-4 overflow-y-auto max-h-[360px]">
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <p class="font-bold text-slate-900 mb-1">Student Issue Description</p>
                  <p>{{ t.description }}</p>
                </div>

                @for (rep of t.replies; track rep.id) {
                  <div
                    class="p-3.5 rounded-xl border text-xs space-y-1"
                    [class]="rep.senderRole === 'admin' ? 'bg-indigo-50/60 border-indigo-100 ml-6' : 'bg-white border-slate-200 mr-6'"
                  >
                    <div class="flex justify-between text-[11px] font-bold">
                      <span [class.text-indigo-700]="rep.senderRole === 'admin'" [class.text-slate-800]="rep.senderRole !== 'admin'">
                        {{ rep.sender }} ({{ rep.senderRole | uppercase }})
                      </span>
                      <span class="text-slate-400 font-normal">{{ rep.timestamp | date: 'short' }}</span>
                    </div>
                    <p class="text-slate-700 leading-relaxed">{{ rep.message }}</p>
                  </div>
                }
              </div>

              <form [formGroup]="ticketReplyForm" (ngSubmit)="postTicketReply(t)" class="p-4 border-t border-slate-100 bg-white space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="sm:col-span-2">
                    <textarea
                      formControlName="reply"
                      rows="2"
                      placeholder="Write official helpdesk response to student..."
                      class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"
                    ></textarea>
                  </div>
                  <div class="flex flex-col gap-2 justify-between">
                    <select formControlName="nextStatus" class="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                      <option value="In Progress">Mark In Progress</option>
                      <option value="Resolved">Mark Resolved</option>
                      <option value="Closed">Mark Closed</option>
                    </select>
                    <button
                      type="submit"
                      [disabled]="ticketReplyForm.invalid"
                      class="w-full h-9 bg-[#6D42E8] hover:bg-[#5b35c9] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <mat-icon class="!text-sm !w-4 !h-4">send</mat-icon>
                      Send Reply
                    </button>
                  </div>
                </div>
              </form>
            } @else {
              <div class="flex-1 flex flex-col items-center justify-center p-16 text-slate-400 text-center">
                <mat-icon class="!text-5xl !w-12 !h-12 opacity-20 mb-2">support_agent</mat-icon>
                <p class="text-sm font-bold text-slate-700">Select a Student Support Ticket</p>
                <p class="text-xs mt-1">Review student requests, post official helpdesk replies, and update ticket resolution status.</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Compose Drawer -->
      <app-form-drawer
        [isOpen]="isComposeOpen()"
        title="Compose Internal Message"
        subtitle="Send an official institutional message."
        saveLabel="Send Message"
        (closed)="isComposeOpen.set(false)"
        (saved)="handleSend()"
      >
        <form [formGroup]="composeForm" class="space-y-4 pt-2">
          <div class="space-y-1.5">
            <label for="mc-recipient" class="text-xs font-semibold text-slate-800">Recipient <span class="text-red-500">*</span></label>
            <select id="mc-recipient" formControlName="recipientId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Recipient</option>
              <optgroup label="Faculty">
                @for (f of facultyService.facultyList(); track f.id) {
                  <option [value]="f.id">{{ f.name }} ({{ f.designation }})</option>
                }
              </optgroup>
              <optgroup label="Students">
                @for (s of studentsService.students(); track s.id) {
                  <option [value]="s.id">{{ s.name }} ({{ s.enrollmentNo }})</option>
                }
              </optgroup>
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="mc-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
            <input id="mc-subject" formControlName="subject" placeholder="What is this regarding?" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          <div class="space-y-1.5">
            <label for="mc-body" class="text-xs font-semibold text-slate-800">Message <span class="text-red-500">*</span></label>
            <textarea id="mc-body" formControlName="body" rows="6" placeholder="Type your message here..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"></textarea>
          </div>

          <div class="space-y-1.5">
            <label for="mc-prio" class="text-xs font-semibold text-slate-800">Priority</label>
            <select id="mc-prio" formControlName="priority" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="Normal">Normal</option>
              <option value="High">High / Urgent</option>
            </select>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isDeleteOpen()"
        title="Delete Message"
        message="Are you sure you want to permanently delete this message thread?"
        confirmLabel="Delete Message"
        (cancelled)="isDeleteOpen.set(false)"
        (confirmed)="confirmDeleteMessage()"
      />
    </div>
  `,
})
export class MessageCenterPage {
  protected readonly commsService = inject(CommunicationService);
  protected readonly facultyService = inject(FacultyService);
  protected readonly studentsService = inject(StudentsService);
  protected readonly studentFirebase = inject(StudentFirebaseService);

  protected readonly workspaceTab = signal<'messages' | 'tickets'>('messages');
  protected readonly searchControl = new FormControl('');
  protected readonly searchQuery = signal('');
  protected readonly activeFolder = signal<'Inbox' | 'Sent'>('Inbox');
  protected readonly selectedMessage = signal<Message | null>(null);
  protected readonly isComposeOpen = signal(false);
  protected readonly replyControl = new FormControl('');
  protected readonly isDeleteOpen = signal(false);
  protected readonly messageToDelete = signal<string | null>(null);

  protected readonly ticketStatusFilter = signal<string>('All');
  protected readonly selectedTicketId = signal<string | null>(null);

  protected readonly composeForm = new FormGroup({
    recipientId: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required),
    body: new FormControl('', Validators.required),
    priority: new FormControl<'Normal' | 'High'>('Normal', Validators.required),
  });

  protected readonly ticketReplyForm = new FormGroup({
    reply: new FormControl('', Validators.required),
    nextStatus: new FormControl<TicketStatus>('In Progress', { nonNullable: true }),
  });

  protected readonly filteredMessages = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const folder = this.activeFolder();

    return this.commsService
      .messages()
      .filter(m => {
        if (m.folder !== folder) return false;
        if (
          q &&
          !m.subject.toLowerCase().includes(q) &&
          !m.senderName.toLowerCase().includes(q) &&
          !m.recipientName.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  protected readonly unreadCount = computed(
    () => this.commsService.messages().filter(m => m.folder === 'Inbox' && !m.isRead).length
  );

  protected readonly openTicketCount = computed(
    () => this.studentFirebase.supportTickets().filter(t => t.status === 'Open' || t.status === 'In Progress').length
  );

  protected readonly filteredTickets = computed(() => {
    const st = this.ticketStatusFilter();
    return this.studentFirebase
      .supportTickets()
      .filter(t => st === 'All' || t.status === st);
  });

  protected readonly selectedTicket = computed(() => {
    const id = this.selectedTicketId();
    return id ? this.studentFirebase.supportTickets().find(t => t.id === id) || null : null;
  });

  selectMessage(m: Message) {
    this.selectedMessage.set(m);
    if (m.folder === 'Inbox') this.commsService.markMessageRead(m.id);
  }

  openDeleteConfirm(id: string) {
    this.messageToDelete.set(id);
    this.isDeleteOpen.set(true);
  }

  confirmDeleteMessage() {
    const id = this.messageToDelete();
    if (!id) return;
    this.commsService.deleteMessage(id);
    this.selectedMessage.set(null);
    this.isDeleteOpen.set(false);
    this.studentsService.showToast('info', 'Message deleted.');
  }

  openCompose() {
    this.composeForm.reset({ priority: 'Normal' });
    this.isComposeOpen.set(true);
  }

  handleSend() {
    if (this.composeForm.invalid) return;
    const val = this.composeForm.getRawValue();

    let recipientName = 'User';
    const faculty = this.facultyService.facultyList().find(f => f.id === val.recipientId);
    if (faculty) {
      recipientName = faculty.name;
    } else {
      const student = this.studentsService.students().find(s => s.id === val.recipientId);
      if (student) recipientName = student.name;
    }

    this.commsService.sendMessage({
      senderId: 'admin',
      senderName: 'Administrator',
      senderRole: 'Super Admin',
      recipientId: val.recipientId!,
      recipientName,
      subject: val.subject!,
      body: val.body!,
      priority: val.priority!,
    });

    this.studentsService.showToast('success', `Message sent to ${recipientName}.`);
    this.isComposeOpen.set(false);
  }

  sendReply() {
    const original = this.selectedMessage();
    const text = (this.replyControl.value || '').trim();
    if (!original || !text) return;

    this.commsService.sendMessage({
      senderId: 'admin',
      senderName: 'Administrator',
      senderRole: 'Super Admin',
      recipientId: original.folder === 'Inbox' ? original.senderId : original.recipientId,
      recipientName: original.folder === 'Inbox' ? original.senderName : original.recipientName,
      subject: original.subject.startsWith('Re:') ? original.subject : `Re: ${original.subject}`,
      body: text,
      priority: 'Normal',
    });

    this.replyControl.setValue('');
    this.studentsService.showToast('success', 'Reply dispatched.');
  }

  // Helpdesk Tickets
  selectTicket(t: SupportTicketRecord) {
    this.selectedTicketId.set(t.id);
    this.ticketReplyForm.reset({
      reply: '',
      nextStatus: t.status === 'Open' ? 'In Progress' : t.status,
    });
  }

  updateTicketStatus(ticketId: string, status: TicketStatus) {
    void this.studentFirebase.adminUpdateSupportTicket(ticketId, status);
  }

  postTicketReply(t: SupportTicketRecord) {
    if (this.ticketReplyForm.invalid) return;
    const val = this.ticketReplyForm.getRawValue();
    void this.studentFirebase.adminUpdateSupportTicket(
      t.id,
      val.nextStatus,
      val.reply || undefined,
      'Admin Helpdesk'
    );
    this.ticketReplyForm.patchValue({ reply: '' });
  }

  ticketBadgeClass(status: TicketStatus): string {
    switch (status) {
      case 'Open':
        return 'bg-rose-100 text-rose-700';
      case 'In Progress':
        return 'bg-amber-100 text-amber-700';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  }

  isMobile() {
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  }

  getInitials(n: string) {
    return n
      .split(' ')
      .map(x => x[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
