import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { TimetableEntry } from '../../../models/timetable.model';
import { StudentsService } from '../../../services/students.service';
import { exportToPdf } from '../../../utils/export.helper';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';

type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

@Component({
  selector: 'app-faculty-timetable',
  imports: [MatIconModule, PageHeader, StatStrip, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-16 min-w-0">
      <app-page-header
        title="Timetable & Academic Calendar"
        [subtitle]="'Teaching schedule and upcoming examination & holiday calendar for ' + currentFaculty().name + '.'"
        [actionLabel]="mySlots().length > 0 ? 'Export Timetable PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportTimetablePdf()"
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- View Toggle Toolbar -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div class="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 flex-wrap">
          <button
            type="button"
            (click)="viewMode.set('week')"
            [class]="viewMode() === 'week' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            class="px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Week
          </button>
          <button
            type="button"
            (click)="viewMode.set('today')"
            [class]="viewMode() === 'today' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            class="px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Today ({{ todayLabel() }})
          </button>
          <button
            type="button"
            (click)="viewMode.set('calendar')"
            [class]="viewMode() === 'calendar' ? 'bg-[#6D42E8] text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            class="px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Academic Calendar
          </button>
        </div>

        <div class="flex items-center gap-3 flex-wrap text-[11px] font-medium text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            Theory
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Practical
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Elective
          </span>
        </div>
      </div>

      <!-- Full Week View -->
      @if (viewMode() === 'week') {
        <!-- Desktop Grid -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hidden lg:block">
          <div class="grid grid-cols-[110px_repeat(6,minmax(0,1fr))] bg-slate-50 border-b border-slate-200">
            <div class="p-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-r border-slate-200">
              Period
            </div>
            @for (day of days; track day) {
              <div
                [class]="day === todayDay() ? 'bg-purple-50/70 text-[#6D42E8]' : 'text-slate-500'"
                class="p-3.5 text-[11px] font-semibold uppercase tracking-wider text-center border-r border-slate-200 last:border-r-0"
              >
                {{ day }}{{ day === todayDay() ? ' · Today' : '' }}
              </div>
            }
          </div>

          <div class="divide-y divide-slate-200">
            @for (period of periods; track period.id) {
              @if (period.isLunch) {
                <div class="grid grid-cols-[110px_1fr] bg-slate-50/80 h-11">
                  <div class="px-3 text-[11px] font-mono font-semibold text-slate-500 flex items-center justify-center border-r border-slate-200">
                    {{ period.id }}
                  </div>
                  <div class="flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Lunch Break ({{ period.id }} - {{ period.end }})
                  </div>
                </div>
              } @else {
                <div class="grid grid-cols-[110px_repeat(6,minmax(0,1fr))] min-h-[96px]">
                  <div
                    class="p-3 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center gap-0.5"
                    [class.bg-purple-50]="isCurrentPeriod(period.id)"
                  >
                    <span class="text-xs font-mono font-semibold text-slate-900">{{ period.id }}</span>
                    <span class="text-[11px] font-mono text-slate-500">{{ period.end }}</span>
                    @if (isCurrentPeriod(period.id)) {
                      <span class="mt-1 px-1.5 py-0.5 rounded-full bg-[#6D42E8] text-white text-[10px] font-semibold">Now</span>
                    }
                  </div>
                  @for (day of days; track day) {
                    @let slot = getFacultySlot(day, period.id);
                    <div
                      [class]="day === todayDay() ? 'bg-purple-50/25' : ''"
                      class="p-2 border-r border-slate-200 last:border-r-0 flex items-stretch"
                    >
                      @if (slot) {
                        <div
                          [class]="getTypeClass(slot.subjectType) + (day === todayDay() && isCurrentPeriod(period.id) ? ' ring-2 ring-[#6D42E8]' : '')"
                          class="w-full rounded-xl p-2.5 flex flex-col justify-between gap-2 border min-w-0"
                        >
                          <div class="min-w-0 space-y-1">
                            <p class="text-xs font-semibold leading-snug line-clamp-2">{{ slot.subjectName }}</p>
                            <p class="text-[11px] opacity-80 truncate">{{ slot.sectionId === 'sec-1' ? 'Section A' : 'Section B' }}</p>
                          </div>
                          <div class="flex justify-between items-center gap-1 text-[11px]">
                            <span class="px-1.5 py-0.5 rounded bg-white/85 font-mono font-semibold text-slate-900 border border-black/5">
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

        <!-- Mobile Week View: Day Tabs + List -->
        <div class="lg:hidden space-y-4">
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            @for (day of days; track day) {
              <button
                type="button"
                (click)="selectedMobileDay.set(day)"
                class="px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                [class]="selectedMobileDay() === day
                  ? 'bg-[#6D42E8] text-white border-[#6D42E8]'
                  : 'bg-white text-slate-600 border-slate-200'"
              >
                {{ day }}{{ day === todayDay() ? ' •' : '' }}
              </button>
            }
          </div>

          <div class="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-200">
            @for (period of periods; track period.id) {
              @if (period.isLunch) {
                <div class="px-4 py-3 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Lunch Break · {{ period.id }} - {{ period.end }}
                </div>
              } @else {
                @let slot = getFacultySlot(selectedMobileDay(), period.id);
                <div class="p-4 flex items-center justify-between gap-3">
                  <div class="w-16 shrink-0">
                    <p class="text-xs font-mono font-bold text-slate-900">{{ period.id }}</p>
                    <p class="text-[11px] font-mono text-slate-500">{{ period.end }}</p>
                  </div>
                  @if (slot) {
                    <div
                      class="flex-1 min-w-0 p-3 rounded-xl border space-y-1"
                      [class]="getTypeClass(slot.subjectType)"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <p class="font-semibold text-[13px] truncate">{{ slot.subjectName }}</p>
                        @if (selectedMobileDay() === todayDay() && isCurrentPeriod(period.id)) {
                          <span class="px-2 py-0.5 rounded-full bg-[#6D42E8] text-white text-[10px] font-semibold shrink-0">Now</span>
                        }
                      </div>
                      <p class="text-xs opacity-80 truncate">Room {{ slot.room }} · {{ slot.sectionId === 'sec-1' ? 'Section A' : 'Section B' }} · {{ slot.subjectType }}</p>
                    </div>
                  } @else {
                    <div class="flex-1 text-xs text-slate-500">Free period</div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- Today's View -->
      @if (viewMode() === 'today') {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <h3 class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <mat-icon class="text-[#6D42E8] shrink-0">today</mat-icon>
              <span>Today's Schedule ({{ todayLabel() }})</span>
            </h3>
            <span class="text-xs font-bold text-[#6D42E8] bg-purple-50 px-3 py-1 rounded-full self-start sm:self-auto whitespace-nowrap shrink-0">
              {{ todaysSlots().length }} Periods Scheduled
            </span>
          </div>

          @if (todaysSlots().length > 0) {
            <div class="space-y-3">
              @for (slot of todaysSlots(); track slot.id) {
                <div
                  class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  [class]="getTypeClass(slot.subjectType) + (isCurrentPeriod(slot.periodId) ? ' ring-2 ring-[#6D42E8]' : '')"
                >
                  <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div class="w-16 sm:w-20 py-2 rounded-xl bg-white/90 text-slate-900 font-bold text-xs text-center border border-black/5 font-mono shrink-0">
                      {{ slot.periodId }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-bold text-slate-900 text-xs">{{ slot.subjectName }}</p>
                        @if (isCurrentPeriod(slot.periodId)) {
                          <span class="px-2 py-0.5 rounded-full bg-[#6D42E8] text-white text-[10px] font-semibold">Current Period</span>
                        }
                      </div>
                      <p class="text-[11px] opacity-85 mt-0.5">
                        Room {{ slot.room }} • {{ slot.sectionId === 'sec-1' ? 'Section A' : 'Section B' }}
                      </p>
                    </div>
                  </div>
                  <span class="px-3 py-1 rounded-full bg-white/90 border border-black/5 font-bold text-[10px] self-start sm:self-auto whitespace-nowrap shrink-0">
                    {{ slot.subjectType }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="event_available"
              title="No lectures scheduled for you today"
              message="Switch to Week view or Academic Calendar to review upcoming teaching slots and exams."
              actionLabel="View Full Week"
              (actionClicked)="viewMode.set('week')"
            />
          }
        </div>
      }

      <!-- Academic Calendar View -->
      @if (viewMode() === 'calendar') {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Institutional Academic & Holiday Calendar</h2>
              <p class="text-xs text-slate-500 mt-0.5">Public holidays, departmental events, and examinations for your allocated subjects</p>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              @for (cat of calendarCategories; track cat) {
                <button
                  type="button"
                  (click)="calendarFilter.set(cat)"
                  class="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                  [class]="calendarFilter() === cat ? 'bg-[#6D42E8] text-white border-[#6D42E8]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'"
                >
                  {{ cat }}
                </button>
              }
            </div>
          </div>

          <div class="space-y-3">
            @for (ev of filteredCalendarEvents(); track ev.id) {
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-center shrink-0 min-w-[88px]">
                    <p class="text-xs font-bold text-slate-900">{{ facade.formatShortDate(ev.date) }}</p>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm font-bold text-slate-900">{{ ev.title }}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">{{ ev.description }}</p>
                  </div>
                </div>
                <span
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 self-start sm:self-center"
                  [class]="ev.category === 'Holiday'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : ev.category === 'Exam'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-purple-50 text-[#6D42E8] border-purple-200'"
                >
                  {{ ev.category }}
                </span>
              </div>
            } @empty {
              <div class="py-10 text-center text-xs text-slate-500">No calendar entries match the selected filter.</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyTimetablePage {
  protected readonly facade = inject(FacultyPortalFacade);
  private readonly studentsService = inject(StudentsService);

  protected readonly viewMode = signal<'week' | 'today' | 'calendar'>('week');
  protected readonly calendarCategories = ['All', 'Holiday', 'Exam', 'Event'] as const;
  protected readonly calendarFilter = signal<'All' | 'Holiday' | 'Exam' | 'Event'>('All');

  protected readonly currentFaculty = this.facade.currentFaculty;
  protected readonly mySlots = this.facade.mySlots;

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

  protected getFacultySlot(day: WeekDay, periodId: string): TimetableEntry | undefined {
    return this.mySlots().find(s => s.day === day && s.periodId === periodId);
  }

  protected readonly todaysSlots = computed(() => {
    const today = this.todayDay();
    if (today === 'Sun') return [];
    return this.mySlots()
      .filter(s => s.day === today)
      .slice()
      .sort((a, b) => a.periodId.localeCompare(b.periodId));
  });

  protected readonly calendarEvents = computed(() => {
    const baseEvents = [
      { id: 'cal-1', date: '2026-11-24', title: 'Guru Nanak Jayanti', category: 'Holiday' as const, description: 'Institutional public holiday — no regular lectures scheduled.' },
      { id: 'cal-2', date: '2026-12-05', title: 'Annual Tech & Innovation Symposium', category: 'Event' as const, description: 'Departmental showcase, project expo, and faculty panel review.' },
      { id: 'cal-3', date: '2026-12-21', title: 'Semester Winter Break Begins', category: 'Holiday' as const, description: 'Campus winter recess across undergraduate and postgraduate cohorts.' },
      { id: 'cal-4', date: '2026-12-25', title: 'Christmas Holiday', category: 'Holiday' as const, description: 'Closed campus administrative & academic holiday.' }
    ];

    const exams = this.facade.facultyExams().map(ex => ({
      id: `cal-ex-${ex.id}`,
      date: ex.date,
      title: `${ex.title} — ${ex.subjectName}`,
      category: 'Exam' as const,
      description: `${ex.mode} examination · ${ex.time} (${ex.duration} mins) · Max ${ex.maxMarks} marks`
    }));

    return [...baseEvents, ...exams].sort((a, b) => a.date.localeCompare(b.date));
  });

  protected readonly filteredCalendarEvents = computed(() => {
    const filter = this.calendarFilter();
    const list = this.calendarEvents();
    return filter === 'All' ? list : list.filter(ev => ev.category === filter);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const facSlots = this.mySlots();
    const uniqueSubjects = new Set(facSlots.map(s => s.subjectId || s.subjectName)).size;

    return [
      { label: 'Weekly Lecture Hours', value: facSlots.length, icon: 'schedule', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Subjects Taught', value: uniqueSubjects, icon: 'library_books', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Assigned Rooms', value: new Set(facSlots.map(s => s.room)).size, icon: 'meeting_room', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' }
    ];
  });

  protected isCurrentPeriod(periodId: string): boolean {
    const now = new Date();
    const [h, m] = periodId.split(':').map(Number);
    const start = (h || 0) * 60 + (m || 0);
    const current = now.getHours() * 60 + now.getMinutes();
    return current >= start && current < start + 60;
  }

  protected getTypeClass(type: string): string {
    switch (type) {
      case 'Theory': return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'Practical': return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Elective': return 'bg-amber-50 text-amber-900 border-amber-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  }

  protected exportTimetablePdf(): void {
    const rows = this.mySlots()
      .slice()
      .sort((a, b) => a.day.localeCompare(b.day) || a.periodId.localeCompare(b.periodId))
      .map(s => [
        s.day,
        s.periodId,
        s.subjectName,
        s.sectionId === 'sec-1' ? 'Section A' : 'Section B',
        s.room,
        s.subjectType
      ]);
    exportToPdf(
      'Faculty Weekly Lecture Timetable',
      ['Day', 'Start Time', 'Subject', 'Section', 'Room', 'Type'],
      rows.length > 0 ? rows : [['-', '-', 'No slots assigned', '-', '-', '-']],
      `${this.currentFaculty().employeeId}-timetable`,
      [
        `Faculty: ${this.currentFaculty().name} (${this.currentFaculty().employeeId}) | Department: ${this.currentFaculty().department}`,
        `Total Weekly Periods: ${this.mySlots().length}`
      ]
    );
    this.studentsService.showToast('success', 'Timetable PDF downloaded.');
  }
}
