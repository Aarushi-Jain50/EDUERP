import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CommunicationService } from '../../../services/communication.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { StudentsService } from '../../../services/students.service';
import { Message } from '../../../models/communication.model';

interface StudentRecipientOption {
  id: string;
  name: string;
  roleGroup: 'Admin' | 'Faculty';
  subtext: string;
}

@Component({
  selector: 'app-student-message-center',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader, FormDrawer, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] pb-10 text-[13px]">
      <app-page-header
        title="Student Message Center"
        subtitle="Direct two-way messaging with course faculty advisors and central academic administration."
        actionLabel="Compose Message"
        actionIcon="edit"
        (actionClicked)="openCompose()"
      />

      <!-- Main Two-Pane Layout -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden min-h-[480px] md:min-h-[600px] flex flex-col md:flex-row">

        <!-- Left Pane: Folders & Message List -->
        <div
          [class]="activeMobileView() === 'thread' ? 'hidden md:flex' : 'flex'"
          class="w-full md:w-80 lg:w-96 md:border-r border-[#E2E8F0] flex-col shrink-0 bg-slate-50/50"
        >
          <!-- Folder Tabs -->
          <div class="p-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 bg-white">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                (click)="activeFolder.set('Inbox')"
                [class]="activeFolder() === 'Inbox' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-100 text-[#64748B] hover:bg-slate-200 font-medium'"
                class="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <mat-icon class="text-xs">inbox</mat-icon>
                <span>Inbox</span>
                @if (unreadInboxCount() > 0) {
                  <span class="px-1.5 py-0.2 rounded-full bg-[#D946EF] text-white text-[9px] font-extrabold">
                    {{ unreadInboxCount() }}
                  </span>
                }
              </button>

              <button
                type="button"
                (click)="activeFolder.set('Sent')"
                [class]="activeFolder() === 'Sent' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'bg-slate-100 text-[#64748B] hover:bg-slate-200 font-medium'"
                class="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <mat-icon class="text-xs">send</mat-icon>
                <span>Sent</span>
              </button>
            </div>
            <span class="text-[11px] text-[#64748B] font-medium whitespace-nowrap">{{ filteredMessages().length }} messages</span>
          </div>

          <!-- Search Input -->
          <div class="p-3 border-b border-[#E2E8F0] bg-white">
            <div class="relative w-full">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-sm">search</mat-icon>
              </span>
              <input
                type="text"
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Search messages..."
                class="w-full h-8 pl-8 pr-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
              />
            </div>
          </div>

          <!-- Message List Cards -->
          <div class="flex-1 overflow-y-auto divide-y divide-slate-100">
            @for (msg of filteredMessages(); track msg.id) {
              <div
                (click)="selectMessage(msg)"
                (keydown.enter)="selectMessage(msg)"
                tabindex="0"
                role="button"
                [class]="selectedMessage()?.id === msg.id ? 'bg-purple-50/80 border-l-4 border-l-[#6D42E8]' : 'hover:bg-slate-100/60 bg-white'"
                class="p-4 cursor-pointer transition-colors relative"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-1 truncate min-w-0">
                    <div class="flex items-center gap-1.5">
                      @if (!msg.isRead && activeFolder() === 'Inbox') {
                        <span class="w-2 h-2 rounded-full bg-[#D946EF] shrink-0"></span>
                      }
                      <p class="font-bold text-xs text-[#172554] truncate">
                        {{ activeFolder() === 'Inbox' ? msg.senderName : 'To: ' + msg.recipientName }}
                      </p>
                    </div>
                    <p [class]="!msg.isRead && activeFolder() === 'Inbox' ? 'font-black text-[#172554]' : 'font-medium text-slate-700'" class="text-xs truncate">
                      {{ msg.subject }}
                    </p>
                  </div>
                  <span class="text-[10px] text-[#64748B] font-medium shrink-0">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <p class="text-[11px] text-[#64748B] line-clamp-1 mt-1 font-normal leading-normal">
                  {{ msg.body }}
                </p>
              </div>
            } @empty {
              <div class="p-8 text-center text-[#64748B] text-xs">
                No {{ activeFolder().toLowerCase() }} messages found.
              </div>
            }
          </div>
        </div>

        <!-- Right Pane: Thread View -->
        <div
          [class]="activeMobileView() === 'list' ? 'hidden md:flex' : 'flex'"
          class="flex-1 flex-col bg-white"
        >
          @if (selectedMessage()) {
            @let msg = selectedMessage()!;

            <!-- Mobile Back Button Header -->
            <div class="md:hidden p-3 border-b border-[#E2E8F0] bg-slate-50 flex items-center gap-2">
              <button
                type="button"
                (click)="activeMobileView.set('list')"
                class="min-h-[36px] px-2 text-xs font-bold text-[#6D42E8] flex items-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="text-base">arrow_back</mat-icon> Back to Message List
              </button>
            </div>

            <!-- Thread Header -->
            <div class="p-4 sm:p-6 border-b border-[#E2E8F0] flex items-start sm:items-center justify-between flex-wrap gap-3 sm:gap-4">
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-extrabold text-[#172554]">{{ msg.subject }}</h2>
                <div class="flex items-center gap-2 text-xs text-[#64748B] mt-1 flex-wrap">
                  <span>From: <strong class="text-[#172554]">{{ msg.senderName }}</strong> ({{ msg.senderRole }})</span>
                  <span>• To: <strong class="text-[#172554]">{{ msg.recipientName }}</strong></span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="openDeleteConfirm(msg.id)"
                  class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete message"
                >
                  <mat-icon class="text-lg">delete_outline</mat-icon>
                </button>
              </div>
            </div>

            <!-- Message History Body -->
            <div class="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div class="p-4 sm:p-5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-200/60 pb-2">
                  <span class="font-bold text-[#172554]">{{ msg.senderName }}</span>
                  <span class="text-[#64748B] font-mono text-[11px]">{{ msg.timestamp | date:'medium' }}</span>
                </div>
                <div class="text-xs text-[#172554] leading-relaxed whitespace-pre-line">
                  {{ msg.body }}
                </div>
              </div>

              <!-- Thread Reply List if any -->
              @for (reply of threadReplies(); track reply.id) {
                <div class="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2 ml-2 sm:ml-8">
                  <div class="flex items-center justify-between gap-2 text-xs text-purple-900 font-bold border-b border-purple-100 pb-1.5">
                    <span>{{ reply.senderName }}</span>
                    <span class="text-[10px] text-[#6D42E8] font-normal">{{ reply.timestamp | date:'shortTime' }}</span>
                  </div>
                  <p class="text-xs text-[#172554] leading-relaxed whitespace-pre-line">{{ reply.body }}</p>
                </div>
              }
            </div>

            <!-- Reply Composer -->
            <div class="p-4 border-t border-[#E2E8F0] bg-slate-50/60 space-y-3">
              <div class="space-y-2">
                <textarea
                  [value]="replyText()"
                  (input)="onReplyInput($event)"
                  rows="3"
                  placeholder="Write your response to this message thread..."
                  class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                ></textarea>
                <div class="flex justify-end">
                  <button
                    type="button"
                    (click)="sendReply()"
                    [disabled]="!replyText().trim()"
                    class="w-full sm:w-auto justify-center gradient-accent text-white px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">send</mat-icon>
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <!-- Empty Selected State -->
            <div class="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div class="w-16 h-16 rounded-xl bg-purple-50 text-[#6D42E8] flex items-center justify-center mb-3 border border-purple-100">
                <mat-icon class="text-3xl">chat_bubble_outline</mat-icon>
              </div>
              <p class="font-bold text-sm text-[#172554]">Select a message from the list</p>
              <p class="text-xs text-[#64748B] mt-1 max-w-xs">Choose a conversation to view thread details or compose a new message to your faculty advisors.</p>
            </div>
          }
        </div>
      </div>

      <!-- Compose Drawer (Recipient strictly limited to Admin and Allocated Subject Faculty) -->
      <app-form-drawer
        [isOpen]="isComposeOpen()"
        title="Compose Message"
        subtitle="Send direct communication to your allocated subject faculty or admin office"
        saveLabel="Send Message"
        (closed)="isComposeOpen.set(false)"
        (saved)="handleSend()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <mat-icon class="text-base text-rose-600">error_outline</mat-icon>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="msg-recipient" class="text-xs font-semibold text-[#172554]">
              Select Recipient <span class="text-rose-500">*</span>
            </label>
            <select
              id="msg-recipient"
              formControlName="recipientId"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            >
              <option value="">Choose Faculty or Admin</option>
              @for (opt of recipientOptions(); track opt.id) {
                <option [value]="opt.id">
                  [{{ opt.roleGroup }}] {{ opt.name }} — {{ opt.subtext }}
                </option>
              }
            </select>
            <p class="text-[11px] text-[#64748B]">Recipients are limited to faculty teaching your enrolled subjects and administration.</p>
          </div>

          <div class="space-y-1.5">
            <label for="msg-subject" class="text-xs font-semibold text-[#172554]">
              Subject <span class="text-rose-500">*</span>
            </label>
            <input
              id="msg-subject"
              formControlName="subject"
              placeholder="e.g. Query regarding Lab 04 Assignment Submission"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <div class="space-y-1.5">
            <label for="msg-body" class="text-xs font-semibold text-[#172554]">
              Message Content <span class="text-rose-500">*</span>
            </label>
            <textarea
              id="msg-body"
              formControlName="body"
              rows="6"
              placeholder="Provide complete context and details of your request or query..."
              class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            ></textarea>
          </div>
        </form>
      </app-form-drawer>

      <!-- Delete Confirmation -->
      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Delete Message"
        message="Are you sure you want to remove this message from your folder?"
        confirmLabel="Delete Message"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="confirmDelete()"
      />
    </div>
  `
})
export class StudentMessageCenter {
  private readonly commsService = inject(CommunicationService);
  private readonly userService = inject(CurrentUserService);
  private readonly academicService = inject(AcademicService);
  private readonly facultyService = inject(FacultyService);
  private readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly replyText = signal<string>('');
  protected readonly activeFolder = signal<'Inbox' | 'Sent'>('Inbox');
  protected readonly activeMobileView = signal<'list' | 'thread'>('list');
  protected readonly selectedMessage = signal<Message | null>(null);

  protected readonly isComposeOpen = signal<boolean>(false);
  protected readonly formError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly messageToDeleteId = signal<string | null>(null);

  protected readonly currentStudent = this.userService.currentStudent;

  // Local thread replies in memory
  protected readonly threadReplies = signal<{ id: string; senderName: string; body: string; timestamp: Date }[]>([]);

  // Recipient options strictly restricted to:
  // 1. Admin
  // 2. Faculty teaching the student's subjects from Subject Allocation (No broadcast!)
  protected readonly recipientOptions = computed<StudentRecipientOption[]>(() => {
    const student = this.currentStudent();
    const allocations = this.academicService.subjectAllocations();
    const facultyList = this.facultyService.facultyList();

    const list: StudentRecipientOption[] = [
      {
        id: 'admin',
        name: 'Administrator / Central Office',
        roleGroup: 'Admin',
        subtext: 'Academic Administration & Registrar Desk'
      }
    ];

    // Find allocations for the student's course, semester, section
    const studentAllocs = allocations.filter(
      a =>
        (a.course === student.course || a.course === student.courseId) &&
        a.semester === student.semester &&
        (a.section === student.section || !a.section)
    );

    // Collect unique faculty
    const seenFaculty = new Set<string>();

    studentAllocs.forEach(alloc => {
      const facName = alloc.faculty.trim();
      if (!facName || facName === 'Unassigned' || seenFaculty.has(facName.toLowerCase())) {
        return;
      }
      seenFaculty.add(facName.toLowerCase());

      // Match faculty record to get faculty ID
      const matched = facultyList.find(
        f => f.name.toLowerCase().trim() === facName.toLowerCase()
      );
      const facId = matched?.id || `fac-${alloc.id}`;

      list.push({
        id: facId,
        name: facName,
        roleGroup: 'Faculty',
        subtext: `${alloc.subject} (${alloc.weeklyHours} hrs/wk)`
      });
    });

    // Fallback: If no matching section allocations found, include department faculty
    if (list.length === 1) {
      facultyList.slice(0, 4).forEach(f => {
        list.push({
          id: f.id,
          name: f.name,
          roleGroup: 'Faculty',
          subtext: `${f.department} (${f.designation})`
        });
      });
    }

    return list;
  });

  // Filter messages for active folder for current student
  protected readonly folderMessages = computed(() => {
    const student = this.currentStudent();
    const all = this.commsService.messages();
    const folder = this.activeFolder();

    if (folder === 'Inbox') {
      return all.filter(m => m.recipientId === student.id && m.folder === 'Inbox');
    } else {
      return all.filter(m => m.senderId === student.id && m.folder === 'Sent');
    }
  });

  protected readonly filteredMessages = computed(() => {
    let list = this.folderMessages();
    const q = this.searchQuery().trim().toLowerCase();

    if (q) {
      list = list.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        m.recipientName.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    }
    return list;
  });

  protected readonly unreadInboxCount = computed(() => {
    const student = this.currentStudent();
    return this.commsService
      .messages()
      .filter(m => m.recipientId === student.id && m.folder === 'Inbox' && !m.isRead).length;
  });

  protected readonly form = new FormGroup({
    recipientId: new FormControl('', Validators.required),
    subject: new FormControl('', [Validators.required, Validators.minLength(3)]),
    body: new FormControl('', [Validators.required, Validators.minLength(10)])
  });

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  protected selectMessage(msg: Message): void {
    this.selectedMessage.set(msg);
    this.commsService.markMessageRead(msg.id);
    this.activeMobileView.set('thread');
    this.threadReplies.set([]);
  }

  protected openCompose(): void {
    this.formError.set('');
    this.form.reset({ recipientId: '', subject: '', body: '' });
    this.isComposeOpen.set(true);
  }

  protected handleSend(): void {
    if (this.form.invalid) {
      this.formError.set('Please select a recipient and provide a subject and detailed message content.');
      return;
    }

    const val = this.form.getRawValue();
    const recipient = this.recipientOptions().find(r => r.id === val.recipientId);
    const student = this.currentStudent();

    this.commsService.sendMessage({
      senderId: student.id,
      senderName: student.name,
      senderRole: 'Student',
      recipientId: val.recipientId!,
      recipientName: recipient ? recipient.name : 'Faculty Advisor',
      subject: val.subject!,
      body: val.body!,
      priority: 'Normal'
    });

    this.isComposeOpen.set(false);
    this.studentsService.showToast('success', 'Message dispatched successfully to ' + (recipient?.name || 'recipient') + '.');
    this.activeFolder.set('Sent');
  }

  protected onReplyInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.replyText.set(val);
  }

  protected sendReply(): void {
    const text = this.replyText().trim();
    if (!text || !this.selectedMessage()) return;

    const student = this.currentStudent();
    const currentMsg = this.selectedMessage()!;

    // Append reply to local thread
    this.threadReplies.update(list => [
      ...list,
      {
        id: `rep-${Date.now()}`,
        senderName: student.name,
        body: text,
        timestamp: new Date()
      }
    ]);

    // Also dispatch message through service so it stays in sync
    const replyRecipientId = this.activeFolder() === 'Inbox' ? currentMsg.senderId : currentMsg.recipientId;
    const replyRecipientName = this.activeFolder() === 'Inbox' ? currentMsg.senderName : currentMsg.recipientName;

    this.commsService.sendMessage({
      senderId: student.id,
      senderName: student.name,
      senderRole: 'Student',
      recipientId: replyRecipientId,
      recipientName: replyRecipientName,
      subject: `Re: ${currentMsg.subject}`,
      body: text,
      priority: 'Normal'
    });

    this.replyText.set('');
    this.studentsService.showToast('success', 'Reply posted and delivered.');
  }

  protected openDeleteConfirm(id: string): void {
    this.messageToDeleteId.set(id);
    this.isConfirmOpen.set(true);
  }

  protected confirmDelete(): void {
    const id = this.messageToDeleteId();
    if (id) {
      this.commsService.deleteMessage(id);
      this.selectedMessage.set(null);
      this.isConfirmOpen.set(false);
      this.studentsService.showToast('info', 'Message removed from folder.');
    }
  }

  protected formatTime(d: Date | string): string {
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
