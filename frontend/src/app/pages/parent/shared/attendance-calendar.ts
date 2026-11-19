import { ChangeDetectionStrategy, Component, input, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ParentAttendanceDayRecord } from './parent-portal.facade';

interface CalendarDayCell {
  isoDate: string;
  dayNum: number;
  inCurrentMonth: boolean;
  statuses: ('Present' | 'Absent' | 'Leave')[];
}

@Component({
  selector: 'app-attendance-calendar',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-5 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="shiftMonth(-1)"
            aria-label="Previous month"
            class="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer"
          >
            <mat-icon class="text-base">chevron_left</mat-icon>
          </button>
          <span class="text-sm font-bold text-[#172554] min-w-[140px] text-center">
            {{ monthLabel() }}
          </span>
          <button
            type="button"
            (click)="shiftMonth(1)"
            aria-label="Next month"
            class="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer"
          >
            <mat-icon class="text-base">chevron_right</mat-icon>
          </button>
        </div>

        <div class="flex items-center gap-4 text-xs text-[#64748B]">
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
      <div class="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        @for (wk of weekHeaders; track wk) {
          <div class="py-1.5 text-[11px] font-semibold uppercase text-[#64748B]">{{ wk }}</div>
        }

        @for (cell of calendarCells(); track cell.isoDate) {
          <button
            type="button"
            (click)="selectDate(cell.isoDate)"
            class="p-2 min-h-[60px] rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer"
            [class]="selectedDate() === cell.isoDate
              ? 'border-[#6D42E8] bg-purple-50/70'
              : cell.inCurrentMonth
                ? 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                : 'border-slate-100 bg-slate-50/40 text-slate-400'"
          >
            <span class="text-xs font-semibold tabular-nums">{{ cell.dayNum }}</span>
            @if (cell.statuses.length > 0) {
              <div class="flex items-center gap-1 flex-wrap mt-1">
                @for (st of cell.statuses; track $index) {
                  <span
                    class="w-2 h-2 rounded-full"
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
            Classes on {{ selectedDate() ? formatDate(selectedDate()!) : 'Selected Date' }}
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
                <span
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0"
                  [class]="log.status === 'Present'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : log.status === 'Absent'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'"
                >
                  {{ log.status }}
                </span>
              </div>
            }
          </div>
        } @else {
          <p class="text-xs text-[#64748B]">Click a date with dots to inspect subject-wise attendance status.</p>
        }
      </div>
    </div>
  `
})
export class AttendanceCalendar {
  readonly logs = input.required<ParentAttendanceDayRecord[]>();

  protected readonly weekHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly currentMonth = signal<{ year: number; month: number }>({ year: 2026, month: 10 }); // Nov 2026
  protected readonly selectedDate = signal<string | null>('2026-11-10');

  protected readonly monthLabel = computed(() => {
    const { year, month } = this.currentMonth();
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  });

  protected readonly calendarCells = computed<CalendarDayCell[]>(() => {
    const { year, month } = this.currentMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);

    const logsByDate = new Map<string, ('Present' | 'Absent' | 'Leave')[]>();
    for (const log of this.logs()) {
      const list = logsByDate.get(log.date) || [];
      list.push(log.status);
      logsByDate.set(log.date, list);
    }

    const cells: CalendarDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        isoDate,
        dayNum: d.getDate(),
        inCurrentMonth: d.getMonth() === month,
        statuses: logsByDate.get(isoDate) || []
      });
    }
    return cells;
  });

  protected readonly selectedDayLogs = computed(() => {
    const d = this.selectedDate();
    if (!d) return [];
    return this.logs().filter(l => l.date === d);
  });

  protected shiftMonth(delta: number): void {
    const { year, month } = this.currentMonth();
    const d = new Date(year, month + delta, 1);
    this.currentMonth.set({ year: d.getFullYear(), month: d.getMonth() });
  }

  protected selectDate(isoDate: string): void {
    this.selectedDate.set(isoDate);
  }

  protected formatDate(isoDate: string): string {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }
}
