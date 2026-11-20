import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

export interface ParentTicket {
  id: string;
  ticketNo: string;
  category: string;
  subject: string;
  description: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  studentName: string;
  replies: { sender: string; text: string; time: string; isAdmin: boolean }[];
}

@Component({
  selector: 'app-parent-helpdesk',
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-900 text-[13px] pb-12 min-w-0">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold uppercase tracking-wider border border-purple-200">
              Parent Support Desk
            </span>
            <span class="text-slate-400">•</span>
            <span class="text-xs text-slate-500">Linked Student: <strong class="text-slate-800">{{ facade.selectedChild()?.name || 'Student' }}</strong></span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Helpdesk & Support Tickets</h1>
          <p class="text-xs text-slate-500 mt-0.5">Raise administrative inquiries, fee clarifications, or attendance corrections with the institution.</p>
        </div>
        <button
          type="button"
          (click)="isModalOpen.set(true)"
          class="bg-[#6D42E8] hover:bg-[#5b34cc] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <mat-icon class="text-base">add_circle</mat-icon>
          <span>Raise New Ticket</span>
        </button>
      </div>

      <!-- KPI Stat Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tickets</p>
            <p class="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{{ totalTicketsCount() }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center">
            <mat-icon class="text-xl">support_agent</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active / Open</p>
            <p class="text-2xl font-extrabold text-amber-600 mt-1 tabular-nums">
              {{ openTicketsCount() }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <mat-icon class="text-xl">hourglass_top</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved</p>
            <p class="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
              {{ resolvedTicketsCount() }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <mat-icon class="text-xl">check_circle</mat-icon>
          </div>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          @for (tab of statusTabs; track tab) {
            <button
              type="button"
              (click)="statusFilter.set(tab)"
              class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer"
              [class]="statusFilter() === tab
                ? 'bg-[#6D42E8] text-white border-[#6D42E8] shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'"
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
            (input)="onSearchInput($event)"
            placeholder="Search tickets by subject or no..."
            class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
          />
        </div>
      </div>

      <!-- Master-Detail Layout -->
      @if (filteredTickets().length > 0) {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- Ticket List (5 cols) -->
          <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            @for (tkt of filteredTickets(); track tkt.id) {
              <button
                type="button"
                (click)="selectedTicketId.set(tkt.id)"
                class="w-full text-left p-4 transition-colors cursor-pointer space-y-2 hover:bg-slate-50"
                [class]="activeTicket()?.id === tkt.id ? 'bg-purple-50/70 border-l-4 border-l-[#6D42E8]' : ''"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[11px] font-bold text-[#6D42E8]">{{ tkt.ticketNo }}</span>
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                    [class]="tkt.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : tkt.status === 'In Progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'"
                  >
                    {{ tkt.status }}
                  </span>
                </div>
                <p class="font-bold text-xs text-slate-900 line-clamp-1">{{ tkt.subject }}</p>
                <div class="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                  <span>{{ tkt.category }}</span>
                  <span>•</span>
                  <span [class]="tkt.priority === 'Urgent' ? 'text-rose-600 font-bold' : ''">{{ tkt.priority }}</span>
                  <span>•</span>
                  <span>{{ tkt.createdAt }}</span>
                </div>
              </button>
            }
          </div>

          <!-- Active Ticket Details & Thread (7 cols) -->
          @if (activeTicket(); as current) {
            <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
              <div class="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs font-bold text-[#6D42E8]">{{ current.ticketNo }}</span>
                    <span class="text-slate-300">•</span>
                    <span class="text-xs text-slate-500 font-medium">Category: {{ current.category }}</span>
                  </div>
                  <h2 class="text-base font-bold text-slate-900 mt-1">{{ current.subject }}</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Student: <strong class="text-slate-800">{{ current.studentName }}</strong> · Created on {{ current.createdAt }}</p>
                </div>
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shrink-0"
                  [class]="current.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'"
                >
                  {{ current.status }}
                </span>
              </div>

              <!-- Initial Description -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Initial Description</p>
                <p class="text-xs text-slate-700 leading-relaxed">{{ current.description }}</p>
              </div>

              <!-- Message Thread -->
              <div class="space-y-4">
                <p class="text-xs font-bold text-slate-900">Conversation Thread</p>
                <div class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  @for (reply of current.replies; track reply.time) {
                    <div
                      class="p-3.5 rounded-xl space-y-1 text-xs"
                      [class]="reply.isAdmin ? 'bg-purple-50/80 border border-purple-200 ml-4' : 'bg-slate-50 border border-slate-200 mr-4'"
                    >
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="font-bold text-slate-900">{{ reply.sender }}</span>
                        <span class="text-slate-400">{{ reply.time }}</span>
                      </div>
                      <p class="text-slate-700 leading-relaxed">{{ reply.text }}</p>
                    </div>
                  }
                </div>

                <!-- Reply Input -->
                @if (current.status !== 'Resolved') {
                  <div class="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      [value]="replyText()"
                      (input)="onReplyInput($event)"
                      placeholder="Type a reply to administration..."
                      class="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                    />
                    <button
                      type="button"
                      (click)="sendReply()"
                      class="bg-[#6D42E8] hover:bg-[#5b34cc] text-white px-4 h-10 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      Send
                    </button>
                  </div>
                } @else {
                  <p class="text-xs text-emerald-700 font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                    This support ticket has been marked as resolved.
                  </p>
                }
              </div>
            </div>
          }

        </div>
      } @else {
        <div class="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <mat-icon class="text-4xl text-slate-300">confirmation_number</mat-icon>
          <p class="text-sm font-bold text-slate-900">No support tickets found</p>
          <p class="text-xs text-slate-500">Raise a new ticket if you have any questions or requests for the institution.</p>
        </div>
      }

      <!-- New Ticket Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-900">Raise New Support Ticket</h2>
              <button
                type="button"
                (click)="isModalOpen.set(false)"
                class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="submitTicket()" class="space-y-4">
              <div class="space-y-1.5">
                <label for="cat-select" class="text-xs font-bold text-slate-700">Category</label>
                <select
                  id="cat-select"
                  formControlName="category"
                  class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                >
                  <option value="Fee Query">Fee Query / Installment</option>
                  <option value="Attendance Correction">Attendance Correction</option>
                  <option value="Academic Inquiry">Academic Inquiry / Results</option>
                  <option value="Bonafide Certificate">Bonafide Certificate Request</option>
                  <option value="General">General Inquiry</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label for="pri-select" class="text-xs font-bold text-slate-700">Priority</label>
                <select
                  id="pri-select"
                  formControlName="priority"
                  class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label for="subj-input" class="text-xs font-bold text-slate-700">Subject</label>
                <input
                  id="subj-input"
                  type="text"
                  formControlName="subject"
                  placeholder="e.g. Request for attendance correction in Data Structures"
                  class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                />
              </div>

              <div class="space-y-1.5">
                <label for="desc-textarea" class="text-xs font-bold text-slate-700">Detailed Description</label>
                <textarea
                  id="desc-textarea"
                  formControlName="description"
                  rows="4"
                  placeholder="Provide complete context..."
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#6D42E8]"
                ></textarea>
              </div>

              <div class="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  (click)="isModalOpen.set(false)"
                  class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="form.invalid"
                  class="bg-[#6D42E8] hover:bg-[#5b34cc] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class ParentHelpdesk {
  protected readonly facade = inject(ParentPortalFacade);
  protected readonly statusTabs = ['All', 'Open', 'In Progress', 'Resolved'];
  protected readonly statusFilter = signal<string>('All');
  protected readonly searchQuery = signal<string>('');
  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly replyText = signal<string>('');

  protected readonly tickets = signal<ParentTicket[]>([
    {
      id: 'tkt-1',
      ticketNo: 'TKT-2026-042',
      category: 'Fee Query',
      subject: 'Clarification regarding Semester IV installment late fine',
      description: 'We paid the installment on due date but late fine of Rs. 250 was applied. Please verify payment timestamp.',
      priority: 'High',
      status: 'In Progress',
      createdAt: '18 Nov 2026',
      studentName: 'Rahul Verma',
      replies: [
        { sender: 'Parent', text: 'Kindly check our receipt #RCP-9021.', time: '18 Nov, 10:30 AM', isAdmin: false },
        { sender: 'Accounts Desk', text: 'We have received your query. Verifying with bank gateway log.', time: '18 Nov, 02:15 PM', isAdmin: true }
      ]
    },
    {
      id: 'tkt-2',
      ticketNo: 'TKT-2026-019',
      category: 'Attendance Correction',
      subject: 'Attendance discrepancy in Software Engineering lecture',
      description: 'Rahul was present in the lab session on 12th Nov, but system shows absent.',
      priority: 'Normal',
      status: 'Resolved',
      createdAt: '12 Nov 2026',
      studentName: 'Rahul Verma',
      replies: [
        { sender: 'Parent', text: 'Please update attendance record.', time: '12 Nov, 11:00 AM', isAdmin: false },
        { sender: 'Faculty Admin', text: 'Verified with course instructor Prof. Sharma. Attendance corrected to Present.', time: '13 Nov, 09:00 AM', isAdmin: true }
      ]
    }
  ]);

  protected readonly selectedTicketId = signal<string>(this.tickets()[0]?.id || '');

  protected readonly totalTicketsCount = computed(() => this.tickets().length);
  protected readonly openTicketsCount = computed(() => this.tickets().filter(t => t.status !== 'Resolved').length);
  protected readonly resolvedTicketsCount = computed(() => this.tickets().filter(t => t.status === 'Resolved').length);

  protected readonly activeTicket = computed(() => {
    return this.tickets().find(t => t.id === this.selectedTicketId()) || this.tickets()[0] || null;
  });

  protected readonly filteredTickets = computed(() => {
    const filter = this.statusFilter();
    const q = this.searchQuery().trim().toLowerCase();
    return this.tickets().filter(t => {
      const matchStatus = filter === 'All' || t.status === filter;
      const matchQ = !q || t.subject.toLowerCase().includes(q) || t.ticketNo.toLowerCase().includes(q);
      return matchStatus && matchQ;
    });
  });

  protected readonly form = new FormGroup({
    category: new FormControl('Fee Query', { nonNullable: true, validators: [Validators.required] }),
    priority: new FormControl<'Normal' | 'High' | 'Urgent'>('Normal', { nonNullable: true, validators: [Validators.required] }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  protected onReplyInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.replyText.set(val);
  }

  protected submitTicket(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    const newTkt: ParentTicket = {
      id: `tkt-${Date.now()}`,
      ticketNo: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
      category: val.category,
      subject: val.subject,
      description: val.description,
      priority: val.priority,
      status: 'Open',
      createdAt: 'Today',
      studentName: this.facade.selectedChild()?.name || 'Student',
      replies: [
        { sender: 'Parent', text: val.description, time: 'Just now', isAdmin: false }
      ]
    };
    this.tickets.update(list => [newTkt, ...list]);
    this.selectedTicketId.set(newTkt.id);
    this.form.reset({ category: 'Fee Query', priority: 'Normal', subject: '', description: '' });
    this.isModalOpen.set(false);
  }

  protected sendReply(): void {
    const text = this.replyText().trim();
    const active = this.activeTicket();
    if (!text || !active) return;
    this.tickets.update(list =>
      list.map(t =>
        t.id === active.id
          ? {
              ...t,
              replies: [...t.replies, { sender: 'Parent', text, time: 'Just now', isAdmin: false }]
            }
          : t
      )
    );
    this.replyText.set('');
  }
}
