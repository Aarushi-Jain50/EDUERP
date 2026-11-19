import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { StudentPortalFacade } from '../shared/student-portal.facade';
import { LeaveType, StudentFirebaseService } from '../../../services/student-firebase.service';

interface CalendarDayCell {
  isoDate: string;
  dayNum: number;
  inCurrentMonth: boolean;
  statuses: ('Present' | 'Absent' | 'Leave')[];
}

@Component({
  selector: 'app-student-attendance',
  imports: [ReactiveFormsModule, MatIconModule, PageHeader, StatStrip, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="My Attendance"
        [subtitle]="'Lecture-wise attendance summary, calendar log, and leave regularization for ' + facade.currentStudent().course + ' · ' + facade.currentStudent().section + '.'"
        actionLabel="Request Leave"
        actionIcon="event_busy"
        (actionClicked)="openLeaveModal()"
      />

      <!-- Top Summary: SVG Ring + 3 Stat Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        <div class="lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
          <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
            <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" stroke-width="10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                [attr.stroke]="overall().isBelowThreshold ? '#E11D48' : '#6D42E8'"
                stroke-width="10"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset()"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                class="text-lg font-bold tabular-nums"
                [class]="overall().isBelowThreshold ? 'text-rose-600' : 'text-[#172554]'"
              >
                {{ overall().percentage }}%
              </span>
            </div>
          </div>

          <div class="space-y-1 min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Overall Standing</p>
            <p class="text-sm font-bold text-[#172554]">
              {{ overall().isBelowThreshold ? 'Below Minimum Threshold' : 'On Track' }}
            </p>
            <p class="text-xs text-[#64748B]">
              Minimum required: {{ overall().threshold }}%
            </p>
          </div>
        </div>

        <div class="lg:col-span-8 flex flex-col justify-center">
          <app-stat-strip [items]="stats()" />
        </div>
      </div>

      <!-- Calm Threshold Recovery Strip -->
      @if (overall().isBelowThreshold) {
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start sm:items-center gap-3 text-amber-900">
          <mat-icon class="text-lg text-amber-700 shrink-0">info</mat-icon>
          <p class="text-[13px] font-medium">
            You need <strong class="font-bold">{{ overall().classesNeeded }}</strong> more consecutive {{ overall().classesNeeded === 1 ? 'class' : 'classes' }} to reach {{ overall().threshold }}% overall attendance.
          </p>
        </div>
      }

      <!-- View Tabs -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="px-5 pt-3 border-b border-[#E2E8F0] flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            (click)="activeTab.set('subject')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap"
            [class]="activeTab() === 'subject' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Subject-wise
          </button>
          <button
            type="button"
            (click)="activeTab.set('calendar')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap"
            [class]="activeTab() === 'calendar' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Calendar
          </button>
          <button
            type="button"
            (click)="activeTab.set('leaves')"
            class="pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap"
            [class]="activeTab() === 'leaves' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Leave Requests ({{ studentLeaves().length }})
          </button>
        </div>

        @if (activeTab() === 'subject') {
          @if (facade.subjectAttendances().length > 0) {
            <!-- Mobile Card View (< md) -->
            <div class="md:hidden divide-y divide-[#E2E8F0]">
              @for (sub of facade.subjectAttendances(); track sub.subjectId) {
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-[13px] text-[#172554] leading-snug">{{ sub.name }}</p>
                      <p class="text-[11px] font-mono text-[#64748B] mt-0.5">{{ sub.code }}</p>
                    </div>
                    @if (sub.isLow) {
                      <span class="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold whitespace-nowrap shrink-0">
                        Low
                      </span>
                    } @else {
                      <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap shrink-0">
                        On Track
                      </span>
                    }
                  </div>

                  <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      [style.width.%]="sub.percentage"
                      [class]="sub.isLow ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                    ></div>
                  </div>

                  <div class="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div>
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Held</p>
                      <p class="font-semibold text-[#172554] tabular-nums mt-0.5">{{ sub.held }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Attended</p>
                      <p class="font-semibold text-[#172554] tabular-nums mt-0.5">{{ sub.attended }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Percentage</p>
                      <p
                        class="font-bold tabular-nums mt-0.5"
                        [class]="sub.isLow ? 'text-rose-600' : 'text-[#172554]'"
                      >
                        {{ sub.percentage }}%
                      </p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Tablet & Desktop Table View (>= md) -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th scope="col" class="px-4 py-3">Subject</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Held</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Attended</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">%</th>
                    <th scope="col" class="px-4 py-3 min-w-[160px] whitespace-nowrap">Progress</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                  @for (sub of facade.subjectAttendances(); track sub.subjectId) {
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="px-4 py-3.5">
                        <p class="font-semibold text-[#172554]">{{ sub.name }}</p>
                        <p class="text-[11px] font-mono text-[#64748B]">{{ sub.code }}</p>
                      </td>
                      <td class="px-4 py-3.5 text-right tabular-nums text-[#64748B] whitespace-nowrap">{{ sub.held }}</td>
                      <td class="px-4 py-3.5 text-right tabular-nums font-medium text-[#172554] whitespace-nowrap">{{ sub.attended }}</td>
                      <td
                        class="px-4 py-3.5 text-right tabular-nums font-bold whitespace-nowrap"
                        [class]="sub.isLow ? 'text-rose-600' : 'text-[#172554]'"
                      >
                        {{ sub.percentage }}%
                      </td>
                      <td class="px-4 py-3.5">
                        <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            class="h-full rounded-full"
                            [style.width.%]="sub.percentage"
                            [class]="sub.isLow ? 'bg-rose-500' : 'bg-[#6D42E8]'"
                          ></div>
                        </div>
                      </td>
                      <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        @if (sub.isLow) {
                          <span class="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold whitespace-nowrap">
                            Low
                          </span>
                        } @else {
                          <span class="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap">
                            On Track
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state
              icon="how_to_reg"
              title="No attendance sessions recorded"
              message="Subject-wise records will appear here once faculty mark lecture attendance for your section."
            />
          }
        }

        @if (activeTab() === 'calendar') {
          <div class="p-3.5 sm:p-5 space-y-4 sm:space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="shiftMonth(-1)"
                  aria-label="Previous month"
                  class="w-10 h-10 sm:w-9 sm:h-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer"
                >
                  <mat-icon class="text-base">chevron_left</mat-icon>
                </button>
                <span class="text-sm font-bold text-[#172554] min-w-[116px] sm:min-w-[140px] text-center">
                  {{ monthLabel() }}
                </span>
                <button
                  type="button"
                  (click)="shiftMonth(1)"
                  aria-label="Next month"
                  class="w-10 h-10 sm:w-9 sm:h-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer"
                >
                  <mat-icon class="text-base">chevron_right</mat-icon>
                </button>
              </div>

              <div class="flex items-center gap-3 sm:gap-4 text-xs text-[#64748B] flex-wrap">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Present
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Absent
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Leave
                </span>
              </div>
            </div>

            <!-- Month Grid -->
            <div class="grid grid-cols-7 gap-1 sm:gap-2 text-center">
              @for (wk of weekHeaders; track wk) {
                <div class="py-1 text-[10px] sm:text-[11px] font-semibold uppercase text-[#64748B]">{{ wk }}</div>
              }

              @for (cell of calendarCells(); track cell.isoDate) {
                <button
                  type="button"
                  (click)="selectDate(cell.isoDate)"
                  class="p-1.5 sm:p-2 min-h-[46px] sm:min-h-[60px] rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer"
                  [class]="selectedDate() === cell.isoDate
                    ? 'border-[#6D42E8] bg-purple-50/70'
                    : cell.inCurrentMonth
                      ? 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                      : 'border-slate-100 bg-slate-50/40 text-slate-400'"
                >
                  <span class="text-[11px] sm:text-xs font-semibold tabular-nums">{{ cell.dayNum }}</span>
                  @if (cell.statuses.length > 0) {
                    <div class="flex items-center gap-0.5 sm:gap-1 flex-wrap mt-1">
                      @for (st of cell.statuses; track $index) {
                        <span
                          class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                          [class]="st === 'Present' ? 'bg-emerald-500' : st === 'Absent' ? 'bg-rose-500' : 'bg-amber-500'"
                        ></span>
                      }
                    </div>
                  }
                </button>
              }
            </div>

            <!-- Selected Day Subject Breakdown -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-3">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Classes on {{ selectedDate() ? facade.formatShortDate(selectedDate()!) : 'Selected Date' }}
                </h3>
                <span class="text-xs font-semibold text-[#6D42E8]">
                  {{ selectedDayLogs().length }} {{ selectedDayLogs().length === 1 ? 'Session' : 'Sessions' }}
                </span>
              </div>

              @if (selectedDayLogs().length > 0) {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  @for (log of selectedDayLogs(); track log.sessionId) {
                    <div class="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-semibold text-[#172554] truncate">{{ log.subjectName }}</p>
                        <p class="text-[11px] font-mono text-[#64748B]">{{ log.subjectCode }}</p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        @if (log.status === 'Absent') {
                          <button
                            type="button"
                            (click)="openLeaveModal(log.date, log.subjectCode + ' - ' + log.subjectName)"
                            class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#6D42E8] border border-purple-200 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            Regularize
                          </button>
                        }
                        <span
                          class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                          [class]="log.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.status === 'Absent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'"
                        >
                          {{ log.status }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-xs text-[#64748B]">Click a date with dots to inspect subject-wise attendance status.</p>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'leaves') {
          <div class="p-4 sm:p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-bold text-[#172554]">Leave &amp; Regularization History</h2>
                <p class="text-xs text-[#64748B]">Submit Medical, On-Duty (OD), or Academic Event leave applications synced to your student profile.</p>
              </div>
              <button
                type="button"
                (click)="openLeaveModal()"
                class="gradient-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                New Application
              </button>
            </div>

            @if (studentLeaves().length > 0) {
              <div class="space-y-3">
                @for (lr of studentLeaves(); track lr.id) {
                  <div class="p-4 rounded-xl bg-slate-50/70 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-[13px] text-[#172554]">{{ lr.leaveType }}</span>
                        <span aria-hidden="true" class="text-slate-300">·</span>
                        <span class="text-xs font-semibold text-[#64748B] tabular-nums">
                          {{ facade.formatShortDate(lr.fromDate) }}
                          @if (lr.toDate !== lr.fromDate) {
                            <span> – {{ facade.formatShortDate(lr.toDate) }}</span>
                          }
                        </span>
                        @if (lr.sessionRef) {
                          <span aria-hidden="true" class="text-slate-300">·</span>
                          <span class="text-[11px] font-mono text-[#6D42E8]">{{ lr.sessionRef }}</span>
                        }
                      </div>
                      <p class="text-xs text-[#172554] leading-relaxed">{{ lr.reason }}</p>
                    </div>

                    <div class="flex items-center gap-2.5 shrink-0">
                      <span
                        class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap"
                        [class]="leaveStatusClass(lr.status)"
                      >
                        {{ lr.status }}
                      </span>

                      @if (lr.status === 'Pending') {
                        <button
                          type="button"
                          (click)="withdrawLeave(lr.id)"
                          class="px-3 py-1 rounded-xl border border-slate-300 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
                        >
                          Withdraw
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state
                icon="event_available"
                title="No leave applications filed"
                message="Use the Request Leave button above or click Regularize on an absent calendar entry."
              />
            }
          </div>
        }
      </div>

      <!-- Request Leave / Regularization Modal -->
      @if (isLeaveModalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-heading"
        >
          <button
            type="button"
            aria-label="Close modal overlay"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
            (click)="isLeaveModalOpen.set(false)"
          ></button>

          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 border border-[#E2E8F0] space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 id="leave-modal-heading" class="text-base font-bold text-[#172554]">Request Leave / Regularization</h3>
                <p class="text-xs text-[#64748B]">Submitted directly to your Mentor &amp; Department Coordinator.</p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                (click)="isLeaveModalOpen.set(false)"
                class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="leaveForm" (ngSubmit)="submitLeave()" class="space-y-4">
              <div class="space-y-1.5">
                <label for="leave-type" class="text-xs font-semibold text-[#172554]">Leave Category</label>
                <select
                  id="leave-type"
                  formControlName="leaveType"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                >
                  @for (lt of leaveTypes; track lt) {
                    <option [value]="lt">{{ lt }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label for="leave-from" class="text-xs font-semibold text-[#172554]">From Date</label>
                  <input
                    id="leave-from"
                    type="date"
                    formControlName="fromDate"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>
                <div class="space-y-1.5">
                  <label for="leave-to" class="text-xs font-semibold text-[#172554]">To Date</label>
                  <input
                    id="leave-to"
                    type="date"
                    formControlName="toDate"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>
              </div>

              <div class="space-y-1.5">
                <label for="leave-reason" class="text-xs font-semibold text-[#172554]">Reason &amp; Supporting Details</label>
                <textarea
                  id="leave-reason"
                  rows="3"
                  formControlName="reason"
                  placeholder="Describe medical event, hackathons, or academic duty details..."
                  class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                ></textarea>
              </div>

              <div class="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  (click)="isLeaveModalOpen.set(false)"
                  class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="leaveForm.invalid"
                  class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentAttendance {
  protected readonly facade = inject(StudentPortalFacade);
  private readonly firebaseService = inject(StudentFirebaseService);

  protected readonly activeTab = signal<'subject' | 'calendar' | 'leaves'>('subject');
  protected readonly weekHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly circumference = 2 * Math.PI * 40;
  protected readonly leaveTypes: LeaveType[] = ['Medical', 'On-Duty (OD)', 'Academic Event', 'Personal'];

  protected readonly currentMonth = signal<{ year: number; month: number }>({ year: 2026, month: 10 });
  protected readonly selectedDate = signal<string | null>('2026-11-10');
  protected readonly isLeaveModalOpen = signal<boolean>(false);
  protected readonly sessionRefForLeave = signal<string | undefined>(undefined);

  protected readonly leaveForm = new FormGroup({
    leaveType: new FormControl<LeaveType>('Medical', { nonNullable: true }),
    fromDate: new FormControl<string>('2026-11-18', { nonNullable: true, validators: [Validators.required] }),
    toDate: new FormControl<string>('2026-11-18', { nonNullable: true, validators: [Validators.required] }),
    reason: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  protected readonly overall = this.facade.overallAttendanceSummary;

  protected readonly studentLeaves = computed(() => {
    const stuId = this.facade.currentStudent().id;
    return this.firebaseService.leaveRequests().filter(l => l.studentId === stuId);
  });

  protected readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.overall().percentage));
    return this.circumference * (1 - pct / 100);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const o = this.overall();
    return [
      {
        label: 'Total Classes',
        value: o.total,
        subtext: 'Sessions held for section',
        icon: 'event_note',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100',
      },
      {
        label: 'Present',
        value: o.present,
        subtext: o.leave > 0 ? o.leave + ' approved leave' : 'Attended lectures',
        icon: 'check_circle',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
      },
      {
        label: 'Absent',
        value: o.absent,
        subtext: 'Missed sessions',
        icon: 'cancel',
        iconColorClass: 'text-rose-600',
        iconBgClass: 'bg-rose-50 border-rose-100',
      },
    ];
  });

  protected readonly monthLabel = computed(() => {
    const { year, month } = this.currentMonth();
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
      new Date(year, month, 1)
    );
  });

  protected readonly calendarCells = computed<CalendarDayCell[]>(() => {
    const { year, month } = this.currentMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);

    const logsByDate = new Map<string, ('Present' | 'Absent' | 'Leave')[]>();
    for (const log of this.facade.studentAttendanceLogs()) {
      const list = logsByDate.get(log.date) || [];
      list.push(log.status);
      logsByDate.set(log.date, list);
    }

    const cells: CalendarDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      cells.push({
        isoDate,
        dayNum: d.getDate(),
        inCurrentMonth: d.getMonth() === month,
        statuses: logsByDate.get(isoDate) || [],
      });
    }
    return cells;
  });

  protected readonly selectedDayLogs = computed(() => {
    const d = this.selectedDate();
    if (!d) return [];
    return this.facade.studentAttendanceLogs().filter(l => l.date === d);
  });

  protected shiftMonth(delta: number): void {
    const { year, month } = this.currentMonth();
    const d = new Date(year, month + delta, 1);
    this.currentMonth.set({ year: d.getFullYear(), month: d.getMonth() });
  }

  protected selectDate(isoDate: string): void {
    this.selectedDate.set(isoDate);
  }

  protected openLeaveModal(prefillDate?: string, sessionRef?: string): void {
    const defaultDate = prefillDate || new Date().toISOString().split('T')[0];
    this.sessionRefForLeave.set(sessionRef);
    this.leaveForm.reset({
      leaveType: sessionRef ? 'On-Duty (OD)' : 'Medical',
      fromDate: defaultDate,
      toDate: defaultDate,
      reason: sessionRef ? `Attendance regularization request for missed session (${sessionRef}).` : '',
    });
    this.isLeaveModalOpen.set(true);
  }

  protected async submitLeave(): Promise<void> {
    if (this.leaveForm.invalid) return;
    const val = this.leaveForm.getRawValue();
    await this.firebaseService.submitLeaveRequest({
      leaveType: val.leaveType,
      fromDate: val.fromDate,
      toDate: val.toDate,
      reason: val.reason,
      sessionRef: this.sessionRefForLeave(),
    });
    this.isLeaveModalOpen.set(false);
    this.activeTab.set('leaves');
  }

  protected async withdrawLeave(id: string): Promise<void> {
    await this.firebaseService.withdrawLeaveRequest(id);
  }

  protected leaveStatusClass(status: string): string {
    if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Rejected' || status === 'Withdrawn') {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
}
