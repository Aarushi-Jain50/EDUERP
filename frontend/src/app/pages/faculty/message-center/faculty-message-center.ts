import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CommunicationService } from '../../../services/communication.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { StudentsService } from '../../../services/students.service';
import { ParentsService } from '../../../services/parents.service';
import { Message } from '../../../models/communication.model';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';

interface RecipientOption {
  id: string;
  name: string;
  roleGroup: 'Admin' | 'Section Student' | 'Section Parent' | 'Section Group';
  subtext: string;
}

@Component({
  selector: 'app-faculty-message-center',
  imports: [ReactiveFormsModule, MatIconModule, PageHeader, FormDrawer, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-20">
      <app-page-header
        title="Faculty Message Center"
        subtitle="Direct two-way correspondence with academic administrators, section students and parents."
        actionLabel="Compose Message"
        actionIcon="edit_square"
        (actionClicked)="openCompose()"
      />

      <!-- Main Two-Pane Layout -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[520px] sm:min-h-[600px] flex flex-col md:flex-row">
        
        <!-- Left Pane: Folders & Message List -->
        <div 
          [class]="activeMobileView() === 'thread' ? 'hidden md:flex' : 'flex'"
          class="w-full md:w-80 lg:w-96 md:border-r border-slate-200 flex-col shrink-0 bg-slate-50/50 min-w-0"
        >
          <!-- Folder Tabs -->
          <div class="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
            <div class="flex items-center gap-1">
              <button
                (click)="activeFolder.set('Inbox')"
                [class]="activeFolder() === 'Inbox' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <mat-icon class="text-xs shrink-0">inbox</mat-icon>
                <span>Inbox</span>
                @if (unreadInboxCount() > 0) {
                  <span class="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[9px] font-extrabold">{{ unreadInboxCount() }}</span>
                }
              </button>
              <button
                (click)="activeFolder.set('Sent')"
                [class]="activeFolder() === 'Sent' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <mat-icon class="text-xs shrink-0">send</mat-icon>
                <span>Sent</span>
              </button>
            </div>
          </div>

          <!-- Search Input -->
          <div class="p-3 border-b border-slate-200 bg-white">
            <div class="relative w-full">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-sm">search</mat-icon>
              </span>
              <input
                type="text"
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Search messages..."
                aria-label="Search messages"
                class="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]"
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
                  <div class="space-y-1 min-w-0 flex-1">
                    <p class="font-bold text-xs text-slate-900 truncate">
                      {{ activeFolder() === 'Inbox' ? msg.senderName : 'To: ' + msg.recipientName }}
                    </p>
                    <p [class]="!msg.isRead && activeFolder() === 'Inbox' ? 'font-black text-slate-900' : 'font-medium text-slate-700'" class="text-xs truncate">
                      {{ msg.subject }}
                    </p>
                  </div>
                  <span class="text-[10px] text-slate-400 font-medium shrink-0">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <p class="text-[11px] text-slate-500 line-clamp-1 mt-1 font-normal leading-normal">
                  {{ msg.body }}
                </p>
              </div>
            } @empty {
              <div class="p-8 text-center text-slate-400 text-xs italic">
                No {{ activeFolder().toLowerCase() }} messages found.
              </div>
            }
          </div>
        </div>

        <!-- Right Pane: Thread View -->
        <div 
          [class]="activeMobileView() === 'list' ? 'hidden md:flex' : 'flex'"
          class="flex-1 flex-col bg-white min-w-0"
        >
          @if (selectedMessage()) {
            @let msg = selectedMessage()!;

            <!-- Mobile Back Button Header -->
            <div class="md:hidden p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <button (click)="activeMobileView.set('list')" class="text-xs font-bold text-[#6D42E8] flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-sm">arrow_back</mat-icon> Back to Messages
              </button>
            </div>

            <!-- Thread Header -->
            <div class="p-4 sm:p-6 border-b border-slate-200 flex items-start sm:items-center justify-between flex-wrap gap-3 sm:gap-4">
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-extrabold text-slate-900">{{ msg.subject }}</h2>
                <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-1">
                  <span>From: <strong class="text-slate-800">{{ msg.senderName }}</strong> ({{ msg.senderRole }})</span>
                  <span>• To: <strong class="text-slate-800">{{ msg.recipientName }}</strong></span>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
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
              <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-200/60 pb-2">
                  <span class="font-bold text-slate-800">{{ msg.senderName }}</span>
                  <span class="text-slate-400 font-mono text-[11px]">{{ formatDateTime(msg.timestamp) }}</span>
                </div>
                <div class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {{ msg.body }}
                </div>
              </div>

              <!-- Thread Reply List if any -->
              @for (reply of threadReplies(); track reply.id) {
                <div class="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2 ml-0 sm:ml-6">
                  <div class="flex items-center justify-between gap-2 text-xs text-purple-900 font-bold border-b border-purple-100 pb-1.5">
                    <span>{{ reply.senderName }}</span>
                    <span class="text-[10px] text-purple-400 font-normal shrink-0">{{ formatTime(reply.timestamp) }}</span>
                  </div>
                  <p class="text-xs text-slate-700 leading-relaxed">{{ reply.body }}</p>
                </div>
              }
            </div>

            <!-- Reply Composer -->
            <div class="p-4 border-t border-slate-200 bg-slate-50/60 space-y-3">
              <div class="space-y-2">
                <textarea
                  [value]="replyText()"
                  (input)="onReplyInput($event)"
                  rows="2"
                  placeholder="Write a reply..."
                  class="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
                ></textarea>
                <div class="flex justify-end">
                  <button
                    type="button"
                    (click)="sendReply()"
                    [disabled]="!replyText().trim()"
                    class="w-full sm:w-auto justify-center gradient-accent text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-md hover:scale-105 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <mat-icon class="text-sm shrink-0">send</mat-icon> Send Reply
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <!-- Empty Selected State -->
            <div class="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center">
              <div class="w-16 h-16 rounded-2xl bg-purple-50 text-[#6D42E8] flex items-center justify-center mb-3 border border-purple-100">
                <mat-icon class="text-3xl">chat_bubble_outline</mat-icon>
              </div>
              <p class="font-bold text-sm text-slate-800">Select a message from the list</p>
              <p class="text-xs text-slate-400 mt-1 max-w-xs">Choose a conversation to view correspondence details or compose a new message.</p>
            </div>
          }
        </div>
      </div>

      <!-- Compose Drawer -->
      <app-form-drawer
        [isOpen]="isComposeOpen()"
        title="Compose Message"
        subtitle="Send direct message to admin, section students, or parents"
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
            <label for="msg-recipient" class="text-xs font-semibold text-slate-800">Select Recipient <span class="text-rose-500">*</span></label>
            <select
              id="msg-recipient"
              formControlName="recipientId"
              class="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            >
              <option value="">Select Recipient</option>
              @for (opt of recipientOptions(); track opt.id) {
                <option [value]="opt.id">
                  [{{ opt.roleGroup }}] {{ opt.name }} - {{ opt.subtext }}
                </option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="msg-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-rose-500">*</span></label>
            <input
              id="msg-subject"
              formControlName="subject"
              placeholder="e.g. Assignment Extension Request / Parent Consultation"
              class="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <div class="space-y-1.5">
            <label for="msg-body" class="text-xs font-semibold text-slate-800">Message Content <span class="text-rose-500">*</span></label>
            <textarea
              id="msg-body"
              formControlName="body"
              rows="5"
              placeholder="Type your message details..."
              class="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
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
export class FacultyMessageCenterPage {
  private readonly commsService = inject(CommunicationService);
  private readonly userService = inject(CurrentUserService);
  private readonly facade = inject(FacultyPortalFacade);
  private readonly studentsService = inject(StudentsService);
  private readonly parentsService = inject(ParentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly replyText = signal<string>('');
  protected readonly activeFolder = signal<'Inbox' | 'Sent'>('Inbox');
  protected readonly activeMobileView = signal<'list' | 'thread'>('list');
  protected readonly selectedMessage = signal<Message | null>(null);

  protected readonly isComposeOpen = signal<boolean>(false);
  protected readonly formError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly messageToDeleteId = signal<string | null>(null);

  protected readonly currentFaculty = this.userService.currentFaculty;

  // Local thread replies in memory
  protected readonly threadReplies = signal<{ id: string; senderName: string; body: string; timestamp: Date }[]>([]);

  // Filter recipient options limited to Admin, section students, section parents, section groups
  protected readonly recipientOptions = computed<RecipientOption[]>(() => {
    const myAllocs = this.facade.myAllocations();
    const myStudents = this.facade.myStudents();

    const list: RecipientOption[] = [
      { id: 'admin', name: 'Administrator / Admin Office', roleGroup: 'Admin', subtext: 'Central Administration' }
    ];

    // Add Section Broadcast Groups
    myAllocs.forEach(a => {
      list.push({
        id: `group-${a.id}`,
        name: `All Students - ${a.subject} (${a.section})`,
        roleGroup: 'Section Group',
        subtext: `${a.course} ${a.semester}`
      });
    });

    // Add Section Students
    myStudents.forEach(entry => {
      const s = entry.student;
      list.push({
        id: s.id,
        name: s.name,
        roleGroup: 'Section Student',
        subtext: `${s.enrollmentNo} (${s.course})`
      });
    });

    // Add Section Parents
    const secStudentIds = new Set(myStudents.map(e => e.student.id));
    const allParents = this.parentsService.parentsList();

    allParents.forEach(p => {
      const isLinked = p.studentIds.some(stId => secStudentIds.has(stId));
      if (isLinked) {
        list.push({
          id: p.id,
          name: `${p.name} (${p.relation} of ${p.studentNames.join(', ')})`,
          roleGroup: 'Section Parent',
          subtext: `Phone: ${p.phone}`
        });
      }
    });

    return list;
  });

  // Filter messages for active folder
  protected readonly folderMessages = computed(() => {
    const fac = this.currentFaculty();
    const all = this.commsService.messages();
    const folder = this.activeFolder();

    if (folder === 'Inbox') {
      return all.filter(m => m.recipientId === fac.id || m.recipientId === 'admin' || m.folder === 'Inbox');
    } else {
      return all.filter(m => m.senderId === fac.id || m.folder === 'Sent');
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

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onReplyInput(event: Event): void {
    this.replyText.set((event.target as HTMLTextAreaElement).value);
  }

  protected readonly unreadInboxCount = computed(() => {
    const fac = this.currentFaculty();
    return this.commsService.messages().filter(m => (m.recipientId === fac.id || m.folder === 'Inbox') && !m.isRead).length;
  });

  protected readonly form = new FormGroup({
    recipientId: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required),
    body: new FormControl('', Validators.required)
  });

  protected selectMessage(msg: Message): void {
    this.selectedMessage.set(msg);
    this.commsService.markMessageRead(msg.id);
    this.activeMobileView.set('thread');
    this.threadReplies.set([]);
  }

  protected openCompose(): void {
    this.formError.set('');
    this.form.reset();
    this.isComposeOpen.set(true);
  }

  protected handleSend(): void {
    if (this.form.invalid) {
      this.formError.set('Please select a recipient and fill subject & body.');
      return;
    }

    const val = this.form.getRawValue();
    const recipient = this.recipientOptions().find(r => r.id === val.recipientId);
    const fac = this.currentFaculty();

    this.commsService.sendMessage({
      senderId: fac.id,
      senderName: fac.name,
      senderRole: fac.designation,
      recipientId: val.recipientId!,
      recipientName: recipient ? recipient.name : 'Recipient',
      subject: val.subject!,
      body: val.body!,
      priority: 'Normal'
    });

    this.isComposeOpen.set(false);
    this.studentsService.showToast('success', 'Message dispatched successfully.');
    this.activeFolder.set('Sent');
  }

  protected sendReply(): void {
    const text = this.replyText().trim();
    if (!text) return;

    const fac = this.currentFaculty();
    this.threadReplies.update(list => [
      ...list,
      { id: `rep-${Date.now()}`, senderName: fac.name, body: text, timestamp: new Date() }
    ]);

    this.replyText.set('');
    this.studentsService.showToast('success', 'Reply posted.');
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
      this.studentsService.showToast('info', 'Message deleted.');
    }
  }

  protected formatTime(d: Date | string): string {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDateTime(d: Date | string): string {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
