import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatItem, StatStrip } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import {
  StudentFirebaseService,
  SupportTicketRecord,
  TicketCategory,
  TicketPriority,
} from '../../../services/student-firebase.service';
import { StudentPortalFacade } from '../shared/student-portal.facade';

@Component({
  selector: 'app-student-helpdesk',
  imports: [ReactiveFormsModule, MatIconModule, PageHeader, StatStrip, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="Helpdesk & Student Support"
        [subtitle]="'Track administrative requests, bonafide certificates, fee queries, and ID card tickets for ' + facade.currentStudent().enrollmentNo + '.'"
        actionLabel="Raise New Ticket"
        actionIcon="add_circle"
        (actionClicked)="openNewTicketModal()"
      />

      <app-stat-strip [items]="stats()" />

      <!-- Filter & Search Bar -->
      <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            @for (tab of statusTabs; track tab) {
              <button
                type="button"
                (click)="statusFilter.set(tab)"
                class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer"
                [class]="statusFilter() === tab
                  ? 'bg-[#6D42E8] text-white border-[#6D42E8]'
                  : 'bg-slate-50 text-[#64748B] border-[#E2E8F0] hover:text-[#172554]'"
              >
                {{ tab }}
              </button>
            }
          </div>

          <div class="relative w-full sm:w-72">
            <mat-icon class="text-base text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</mat-icon>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              placeholder="Search ticket no., subject, category..."
              aria-label="Search support tickets"
              class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            />
          </div>
        </div>
      </section>

      <!-- Master-Detail Layout -->
      @if (filteredTickets().length > 0) {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <!-- Ticket List -->
          <div class="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm divide-y divide-[#E2E8F0] overflow-hidden">
            @for (tkt of filteredTickets(); track tkt.id) {
              <button
                type="button"
                (click)="selectedTicketId.set(tkt.id)"
                class="w-full text-left p-4 transition-colors cursor-pointer space-y-2 hover:bg-slate-50/80"
                [class]="activeTicket()?.id === tkt.id ? 'bg-purple-50/60 ring-1 ring-inset ring-[#6D42E8]/40' : ''"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[11px] font-bold text-[#6D42E8]">{{ tkt.ticketNo }}</span>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap"
                    [class]="statusBadgeClass(tkt.status)"
                  >
                    {{ tkt.status }}
                  </span>
                </div>
                <p class="font-bold text-[13px] text-[#172554] line-clamp-1">{{ tkt.subject }}</p>
                <div class="flex items-center gap-2 text-[11px] text-[#64748B] flex-wrap">
                  <span>{{ tkt.category }}</span>
                  <span aria-hidden="true">·</span>
                  <span [class]="tkt.priority === 'Urgent' ? 'text-rose-600 font-semibold' : tkt.priority === 'High' ? 'text-amber-700 font-semibold' : ''">
                    {{ tkt.priority }} Priority
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{{ tkt.replies.length }} {{ tkt.replies.length === 1 ? 'reply' : 'replies' }}</span>
                </div>
              </button>
            }
          </div>

          <!-- Active Ticket Detail & Thread -->
          @if (activeTicket(); as current) {
            <div class="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                <div class="space-y-1.5 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs font-bold text-[#6D42E8]">{{ current.ticketNo }}</span>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <span class="text-xs font-medium text-[#64748B]">{{ current.category }}</span>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <span class="text-xs font-semibold text-[#172554]">{{ current.priority }} Priority</span>
                  </div>
                  <h2 class="text-base font-bold text-[#172554]">{{ current.subject }}</h2>
                  <p class="text-[11px] text-[#64748B]">
                    Submitted on {{ formatDateTime(current.createdAt) }} · Last updated {{ formatDateTime(current.updatedAt) }}
                  </p>
                </div>

                <span
                  class="px-3 py-1 rounded-full text-xs font-bold border self-start whitespace-nowrap"
                  [class]="statusBadgeClass(current.status)"
                >
                  {{ current.status }}
                </span>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-1.5">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Request Details</p>
                <p class="text-[13px] text-[#172554] leading-relaxed whitespace-pre-wrap">{{ current.description }}</p>
              </div>

              <!-- Conversation Thread -->
              <div class="space-y-3">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Support Correspondence ({{ current.replies.length }})
                </p>

                @if (current.replies.length > 0) {
                  <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    @for (rep of current.replies; track rep.id) {
                      <div
                        class="p-3.5 rounded-xl border space-y-1"
                        [class]="rep.senderRole === 'admin'
                          ? 'bg-purple-50/70 border-purple-200'
                          : 'bg-slate-50 border-[#E2E8F0] ml-4'"
                      >
                        <div class="flex items-center justify-between gap-2 text-[11px]">
                          <span class="font-bold text-[#172554]">{{ rep.sender }}</span>
                          <span class="text-[#64748B]">{{ formatDateTime(rep.timestamp) }}</span>
                        </div>
                        <p class="text-xs text-[#172554] leading-relaxed">{{ rep.message }}</p>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-xs text-[#64748B] bg-slate-50 border border-[#E2E8F0] rounded-xl p-3">
                    No staff replies yet. Our helpdesk team reviews open tickets within 1 working day.
                  </p>
                }

                @if (current.status !== 'Closed') {
                  <form (ngSubmit)="postReply(current.id)" class="pt-2 space-y-2">
                    <label for="ticket-reply" class="text-xs font-semibold text-[#172554] block">
                      Post Follow-up Note
                    </label>
                    <div class="flex flex-col sm:flex-row gap-2">
                      <input
                        id="ticket-reply"
                        type="text"
                        [formControl]="replyControl"
                        placeholder="Add clarification, reference number, or follow-up question..."
                        class="flex-1 h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                      />
                      <button
                        type="submit"
                        [disabled]="replyControl.invalid"
                        class="gradient-accent text-white px-4 h-10 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <mat-icon class="text-sm">send</mat-icon>
                        <span>Send Reply</span>
                      </button>
                    </div>
                  </form>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="support_agent"
            title="No support tickets found"
            message="Raise a ticket for bonafide certificates, ID card replacement, fee discrepancies, or IT assistance."
            actionLabel="Raise New Ticket"
            (actionClicked)="openNewTicketModal()"
          />
        </div>
      }

      <!-- Raise New Ticket Modal -->
      @if (isModalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-ticket-heading"
        >
          <button
            type="button"
            aria-label="Close modal overlay"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
            (click)="isModalOpen.set(false)"
          ></button>

          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 border border-[#E2E8F0] space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 id="new-ticket-heading" class="text-base font-bold text-[#172554]">Raise Support Ticket</h3>
                <p class="text-xs text-[#64748B]">Requests are logged directly to the Student Cell queue.</p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                (click)="isModalOpen.set(false)"
                class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="ticketForm" (ngSubmit)="submitNewTicket()" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label for="ticket-category" class="text-xs font-semibold text-[#172554]">Category</label>
                  <select
                    id="ticket-category"
                    formControlName="category"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  >
                    @for (cat of categories; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label for="ticket-priority" class="text-xs font-semibold text-[#172554]">Priority</label>
                  <select
                    id="ticket-priority"
                    formControlName="priority"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div class="space-y-1.5">
                <label for="ticket-subject" class="text-xs font-semibold text-[#172554]">Subject</label>
                <input
                  id="ticket-subject"
                  formControlName="subject"
                  placeholder="Brief title for your request"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                />
              </div>

              <div class="space-y-1.5">
                <label for="ticket-desc" class="text-xs font-semibold text-[#172554]">Description</label>
                <textarea
                  id="ticket-desc"
                  rows="4"
                  formControlName="description"
                  placeholder="Provide full details, dates, receipt numbers, or document requirements..."
                  class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                ></textarea>
              </div>

              <div class="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  (click)="isModalOpen.set(false)"
                  class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="ticketForm.invalid"
                  class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentHelpdesk {
  protected readonly facade = inject(StudentPortalFacade);
  private readonly firebaseService = inject(StudentFirebaseService);

  protected readonly statusTabs = ['All', 'Open', 'In Progress', 'Resolved'] as const;
  protected readonly categories: TicketCategory[] = [
    'Bonafide Certificate',
    'ID Card Replacement',
    'Fee / Scholarship Discrepancy',
    'Exam / Admit Card',
    'Hostel / Transport',
    'Technical Support',
  ];

  protected readonly statusFilter = signal<(typeof this.statusTabs)[number]>('All');
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedTicketId = signal<string | null>(null);
  protected readonly isModalOpen = signal<boolean>(false);

  protected readonly replyControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)],
  });

  protected readonly ticketForm = new FormGroup({
    category: new FormControl<TicketCategory>('Bonafide Certificate', { nonNullable: true }),
    priority: new FormControl<TicketPriority>('Normal', { nonNullable: true }),
    subject: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    description: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
  });

  private readonly studentTickets = computed(() => {
    const stuId = this.facade.currentStudent().id;
    return this.firebaseService.supportTickets().filter(t => t.studentId === stuId);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.studentTickets();
    return [
      {
        label: 'Total Tickets',
        value: list.length,
        subtext: 'All helpdesk inquiries',
        icon: 'confirmation_number',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100',
      },
      {
        label: 'Active Queue',
        value: list.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
        subtext: 'Awaiting resolution',
        icon: 'pending_actions',
        iconColorClass: 'text-amber-600',
        iconBgClass: 'bg-amber-50 border-amber-100',
      },
      {
        label: 'Resolved',
        value: list.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
        subtext: 'Completed requests',
        icon: 'task_alt',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
      },
    ];
  });

  protected readonly filteredTickets = computed(() => {
    const filter = this.statusFilter();
    const q = this.searchQuery().trim().toLowerCase();
    return this.studentTickets().filter(t => {
      if (filter !== 'All' && t.status !== filter) return false;
      if (q) {
        const hay = `${t.ticketNo} ${t.subject} ${t.category} ${t.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  protected readonly activeTicket = computed<SupportTicketRecord | null>(() => {
    const list = this.filteredTickets();
    if (list.length === 0) return null;
    const chosenId = this.selectedTicketId();
    return list.find(t => t.id === chosenId) ?? list[0];
  });

  protected openNewTicketModal(): void {
    this.ticketForm.reset({
      category: 'Bonafide Certificate',
      priority: 'Normal',
      subject: '',
      description: '',
    });
    this.isModalOpen.set(true);
  }

  protected async submitNewTicket(): Promise<void> {
    if (this.ticketForm.invalid) return;
    const val = this.ticketForm.getRawValue();
    const created = await this.firebaseService.createSupportTicket({
      category: val.category,
      priority: val.priority,
      subject: val.subject,
      description: val.description,
    });
    this.selectedTicketId.set(created.id);
    this.isModalOpen.set(false);
  }

  protected async postReply(ticketId: string): Promise<void> {
    if (this.replyControl.invalid) return;
    const msg = this.replyControl.value;
    this.replyControl.reset('');
    await this.firebaseService.replyToSupportTicket(ticketId, msg);
  }

  protected statusBadgeClass(status: string): string {
    if (status === 'Resolved' || status === 'Closed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'In Progress') {
      return 'bg-purple-50 text-[#6D42E8] border-purple-200';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }

  protected formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
}
