import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { CurrentUserService } from '../../../services/current-user.service';
import { TimetableService } from '../../../services/timetable.service';
import { TimetableEntry } from '../../../models/timetable.model';
import { StudentPortalFacade } from '../shared/student-portal.facade';

type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

@Component({
  selector: 'app-student-timetable',
  imports: [MatIconModule, PageHeader, StatStrip, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="Weekly Timetable"
        [subtitle]="'Class schedule for ' + student().course + ' · ' + student().semester + ' · ' + student().section + '.'"
      />

      <app-stat-strip [items]="stats()" />

      <!-- View Toggle Bar -->
      <div class="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="grid grid-cols-2 sm:inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-[#E2E8F0] w-full sm:w-auto">
          <button
            type="button"
            (click)="viewMode.set('week')"
            class="min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            [class]="viewMode() === 'week' ? 'bg-[#6D42E8] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172554]'"
          >
            Week
          </button>
          <button
            type="button"
            (click)="viewMode.set('today')"
            class="min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            [class]="viewMode() === 'today' ? 'bg-[#6D42E8] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172554]'"
          >
            Today ({{ todayLabel() }})
          </button>
        </div>

        <div class="flex items-center gap-3.5 flex-wrap text-[11px] font-medium text-[#64748B]">
          <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            Theory
          </span>
          <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Practical
          </span>
          <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Elective
          </span>
        </div>
      </div>

      @if (viewMode() === 'week') {
        <!-- Desktop Weekly Matrix (Mon-Sat, 7 Periods + Lunch Row) -->
        <div class="hidden lg:block bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div class="grid grid-cols-[110px_repeat(6,minmax(0,1fr))] bg-slate-50 border-b border-[#E2E8F0]">
            <div class="p-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] border-r border-[#E2E8F0]">
              Period
            </div>
            @for (day of days; track day) {
              <div
                class="p-3.5 text-[11px] font-semibold uppercase tracking-wider text-center border-r border-[#E2E8F0] last:border-r-0"
                [class]="day === todayDay() ? 'bg-purple-50/70 text-[#6D42E8]' : 'text-[#64748B]'"
              >
                {{ day }}{{ day === todayDay() ? ' · Today' : '' }}
              </div>
            }
          </div>

          <div class="divide-y divide-[#E2E8F0]">
            @for (period of periods; track period.id) {
              @if (period.isLunch) {
                <div class="grid grid-cols-[110px_1fr] bg-slate-50/80 h-11">
                  <div class="px-3 text-[11px] font-mono font-semibold text-[#64748B] flex items-center justify-center border-r border-[#E2E8F0]">
                    {{ period.id }}
                  </div>
                  <div class="flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.25em] text-[#64748B]">
                    Lunch Break ({{ period.id }} - {{ period.end }})
                  </div>
                </div>
              } @else {
                <div class="grid grid-cols-[110px_repeat(6,minmax(0,1fr))] min-h-[96px]">
                  <div
                    class="p-3 border-r border-[#E2E8F0] bg-slate-50/50 flex flex-col items-center justify-center text-center gap-0.5"
                    [class.bg-purple-50]="isCurrentPeriod(period.id)"
                  >
                    <span class="text-xs font-mono font-semibold text-[#172554]">{{ period.id }}</span>
                    <span class="text-[11px] font-mono text-[#64748B]">{{ period.end }}</span>
                    @if (isCurrentPeriod(period.id)) {
                      <span class="mt-1 px-1.5 py-0.5 rounded-full bg-[#6D42E8] text-white text-[10px] font-semibold">Now</span>
                    }
                  </div>

                  @for (day of days; track day) {
                    @let slot = getSlot(day, period.id);
                    <div
                      class="p-2 border-r border-[#E2E8F0] last:border-r-0 flex items-stretch"
                      [class]="day === todayDay() ? 'bg-purple-50/25' : ''"
                    >
                      @if (slot) {
                        <div
                          class="w-full rounded-xl p-2.5 border flex flex-col justify-between gap-2 min-w-0"
                          [class]="slotTypeClass(slot.subjectType) + (day === todayDay() && isCurrentPeriod(period.id) ? ' ring-2 ring-[#6D42E8]' : '')"
                        >
                          <div class="min-w-0 space-y-1">
                            <p class="text-xs font-semibold leading-snug line-clamp-2">{{ slot.subjectName }}</p>
                            <p class="text-[11px] opacity-80 truncate">{{ slot.facultyName }}</p>
                          </div>
                          <div class="flex items-center justify-between gap-1 text-[11px]">
                            <span class="px-1.5 py-0.5 rounded bg-white/85 border border-black/5 font-mono font-semibold text-[#172554]">
                              {{ slot.room }}
                            </span>
                            <span class="font-semibold">{{ slot.subjectType }}</span>
                          </div>
                        </div>
                      } @else {
                        <div class="w-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                          <span class="text-[11px] text-slate-400">Free</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>

        <!-- Mobile & Tablet Week View: Day Tabs + List -->
        <div class="lg:hidden space-y-4">
          <div class="grid grid-cols-6 sm:flex sm:items-center gap-1.5 sm:gap-2.5">
            @for (day of days; track day) {
              <button
                type="button"
                (click)="selectedMobileDay.set(day)"
                class="min-h-[42px] px-1 sm:px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
                [class]="selectedMobileDay() === day
                  ? 'bg-[#6D42E8] text-white border-[#6D42E8]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0]'"
              >
                {{ day }}{{ day === todayDay() ? ' •' : '' }}
              </button>
            }
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm divide-y divide-[#E2E8F0]">
            @for (period of periods; track period.id) {
              @if (period.isLunch) {
                <div class="px-4 py-3 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
                  Lunch Break · {{ period.id }} - {{ period.end }}
                </div>
              } @else {
                @let slot = getSlot(selectedMobileDay(), period.id);
                <div class="p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3">
                  <div class="w-13 sm:w-16 shrink-0">
                    <p class="text-xs font-mono font-bold text-[#172554]">{{ period.id }}</p>
                    <p class="text-[11px] font-mono text-[#64748B]">{{ period.end }}</p>
                  </div>
                  @if (slot) {
                    <div
                      class="flex-1 min-w-0 p-3 rounded-xl border space-y-1"
                      [class]="slotTypeClass(slot.subjectType)"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <p class="font-semibold text-[13px] truncate">{{ slot.subjectName }}</p>
                        @if (selectedMobileDay() === todayDay() && isCurrentPeriod(period.id)) {
                          <span class="px-2 py-0.5 rounded-full bg-[#6D42E8] text-white text-[10px] font-semibold shrink-0 whitespace-nowrap">Now</span>
                        }
                      </div>
                      <p class="text-xs opacity-80 truncate">{{ slot.facultyName }} · Room {{ slot.room }}</p>
                    </div>
                  } @else {
                    <div class="flex-1 text-xs text-[#64748B]">Free period</div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }

      @if (viewMode() === 'today') {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div class="flex items-center gap-2">
              <mat-icon class="text-lg text-[#6D42E8]">today</mat-icon>
              <h2 class="text-sm font-bold text-[#172554]">Today's Classes ({{ todayLabel() }})</h2>
            </div>
            <span class="text-xs font-semibold text-[#6D42E8] whitespace-nowrap">{{ todaysSlots().length }} Scheduled</span>
          </div>

          @if (todaysSlots().length > 0) {
            <div class="space-y-3">
              @for (slot of todaysSlots(); track slot.id) {
                <div
                  class="p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  [class]="slotTypeClass(slot.subjectType) + (isCurrentPeriod(slot.periodId) ? ' ring-2 ring-[#6D42E8]' : '')"
                >
                  <div class="flex items-start sm:items-center gap-3 min-w-0">
                    <div class="px-3 py-2 rounded-xl bg-white/90 border border-black/5 text-center shrink-0">
                      <p class="text-xs font-mono font-bold text-[#172554]">{{ slot.periodId }}</p>
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-semibold text-[13px] text-[#172554]">{{ slot.subjectName }}</p>
                        @if (isCurrentPeriod(slot.periodId)) {
                          <span class="px-2 py-0.5 rounded-full bg-[#6D42E8] text-white text-[10px] font-semibold whitespace-nowrap">Current Period</span>
                        }
                      </div>
                      <p class="text-xs opacity-85 mt-0.5">{{ slot.facultyName }} · Room {{ slot.room }}</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-white/90 border border-black/5 text-[11px] font-semibold self-start sm:self-auto shrink-0 whitespace-nowrap">
                    {{ slot.subjectType }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="event_available"
              title="No classes scheduled today"
              message="Switch to Week view to inspect the rest of your semester schedule."
              actionLabel="View Full Week"
              (actionClicked)="viewMode.set('week')"
            />
          }
        </div>
      }
    </div>
  `
})
export class StudentTimetable {
  private readonly userService = inject(CurrentUserService);
  private readonly timetableService = inject(TimetableService);
  private readonly facade = inject(StudentPortalFacade);

  protected readonly student = this.userService.currentStudent;
  protected readonly viewMode = signal<'week' | 'today'>('week');

  protected readonly days: readonly WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly periods = [
    { id: '09:00', end: '10:00', isLunch: false },
    { id: '10:00', end: '11:00', isLunch: false },
    { id: '11:00', end: '12:00', isLunch: false },
    { id: '12:00', end: '13:00', isLunch: false },
    { id: '13:00', end: '14:00', isLunch: true },
    { id: '14:00', end: '15:00', isLunch: false },
    { id: '15:00', end: '16:00', isLunch: false },
    { id: '16:00', end: '17:00', isLunch: false }
  ];

  protected readonly todayDay = computed<WeekDay | 'Sun'>(() => {
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    return map[new Date().getDay()] || 'Mon';
  });

  protected readonly todayLabel = computed(() =>
    new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date())
  );

  protected readonly selectedMobileDay = signal<WeekDay>(
    (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()])
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
      : 'Mon') as WeekDay
  );

  protected readonly sectionSlots = computed(() => {
    const s = this.student();
    const semNum = this.facade.parseSemesterNumber(s.semester);
    return this.timetableService
      .slots()
      .filter(slot => slot.courseId === s.courseId && slot.semester === semNum && slot.sectionId === s.sectionId);
  });

  protected readonly todaysSlots = computed(() => {
    const today = this.todayDay();
    if (today === 'Sun') return [];
    return this.sectionSlots()
      .filter(slot => slot.day === today)
      .slice()
      .sort((a, b) => a.periodId.localeCompare(b.periodId));
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const slots = this.sectionSlots();
    return [
      {
        label: 'Weekly Periods',
        value: slots.length,
        subtext: this.student().section + ' schedule',
        icon: 'calendar_month',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: "Today's Classes",
        value: this.todaysSlots().length,
        subtext: this.todayLabel(),
        icon: 'today',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Practical Labs',
        value: slots.filter(s => s.subjectType === 'Practical').length,
        subtext: 'Weekly lab periods',
        icon: 'science',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      }
    ];
  });

  protected getSlot(day: WeekDay, periodId: string): TimetableEntry | undefined {
    return this.sectionSlots().find(s => s.day === day && s.periodId === periodId);
  }

  protected isCurrentPeriod(periodId: string): boolean {
    const now = new Date();
    const [h, m] = periodId.split(':').map(Number);
    const start = (h || 0) * 60 + (m || 0);
    const current = now.getHours() * 60 + now.getMinutes();
    return current >= start && current < start + 60;
  }

  protected slotTypeClass(type: string): string {
    switch (type) {
      case 'Theory':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'Practical':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Elective':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  }
}
