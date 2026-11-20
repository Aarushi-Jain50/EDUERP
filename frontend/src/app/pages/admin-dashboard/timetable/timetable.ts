import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { TimetableService } from '../../../services/timetable.service';
import { AcademicService } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { TimetableEntry } from '../../../models/timetable.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timetable-page',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader, StatStrip, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Timetable & Room Allocation"
        subtitle="Build conflict-free class schedules, inspect faculty weekly teaching loads, and monitor room utilization."
        actionLabel="Add Period"
        actionIcon="add"
        (actionClicked)="openAdd()"
      />

      <app-stat-strip [items]="stats()" />

      <!-- View Switch & Export Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex border-b border-[#E2E8F0]">
          <button
            type="button"
            (click)="viewMode.set('section')"
            [class]="viewMode() === 'section' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
            class="px-5 py-2.5 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">calendar_view_week</mat-icon>
            Section Timetable
          </button>
          <button
            type="button"
            (click)="viewMode.set('faculty')"
            [class]="viewMode() === 'faculty' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
            class="px-5 py-2.5 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">badge</mat-icon>
            Faculty Schedule
          </button>
          <button
            type="button"
            (click)="viewMode.set('rooms')"
            [class]="viewMode() === 'rooms' ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-700'"
            class="px-5 py-2.5 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">meeting_room</mat-icon>
            Room Utilization
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="exportTimetableExcel()"
            class="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">table_view</mat-icon>
            Excel
          </button>
          <button
            type="button"
            (click)="exportTimetablePdf()"
            class="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">picture_as_pdf</mat-icon>
            PDF
          </button>
        </div>
      </div>

      @if (viewMode() === 'section') {
        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[180px] space-y-1.5">
            <label for="tt-course" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Course</label>
            <select id="tt-course" [value]="courseFilter()" (change)="onCourseFilter($event)" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Course</option>
              @for (c of academicService.courses(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>
          <div class="flex-1 min-w-[150px] space-y-1.5">
            <label for="tt-semester" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semester</label>
            <select id="tt-semester" [value]="semesterFilter()" (change)="onSemesterFilter($event)" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
              <option value="Semester 3">Semester 3</option>
              <option value="Semester 4">Semester 4</option>
            </select>
          </div>
          <div class="flex-1 min-w-[150px] space-y-1.5">
            <label for="tt-section" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Section</label>
            <select id="tt-section" [value]="sectionFilter()" (change)="onSectionFilter($event)" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Section</option>
              @for (s of academicService.sections(); track s.id) {
                <option [value]="s.id">{{ s.section }} ({{ s.course }})</option>
              }
            </select>
          </div>
        </div>

        @if (isFilterComplete()) {
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div class="hidden lg:grid grid-cols-[110px_repeat(6,1fr)] bg-slate-50 border-b border-[#E2E8F0]">
              <div class="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-[#E2E8F0]">Period</div>
              @for (day of days; track day) {
                <div class="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">{{ day }}</div>
              }
            </div>

            <div class="hidden lg:flex flex-col">
              @for (period of periods; track period.id) {
                @if (period.id === '13:00') {
                  <div class="grid grid-cols-[110px_1fr] bg-indigo-50/30 border-b border-[#E2E8F0] h-12">
                    <div class="p-3 text-[11px] font-bold text-indigo-400 flex items-center justify-center border-r border-indigo-100 italic">{{ period.id }}</div>
                    <div class="flex items-center justify-center text-[10px] font-black text-indigo-300 uppercase tracking-[0.5em]">Lunch Break (60 Min)</div>
                  </div>
                } @else {
                  <div class="grid grid-cols-[110px_repeat(6,1fr)] border-b border-[#E2E8F0] last:border-b-0">
                    <div class="p-4 text-[11px] font-bold text-slate-400 flex flex-col items-center justify-center gap-0.5 border-r border-[#E2E8F0] bg-slate-50/30">
                      <span>{{ period.id }}</span>
                      <span class="text-[9px] font-medium opacity-60">{{ period.end }}</span>
                    </div>
                    @for (day of days; track day) {
                      @let slot = getSlot(day, period.id);
                      <div class="h-[104px] p-2 border-r border-[#E2E8F0] last:border-r-0 hover:bg-slate-50/50 transition-all group relative">
                        @if (slot) {
                          <div
                            [class]="getTypeClass(slot.subjectType)"
                            (click)="openEdit(slot)"
                            (keydown.enter)="openEdit(slot)"
                            tabindex="0"
                            class="h-full w-full rounded-lg p-2 flex flex-col justify-between shadow-sm border border-black/5 transition-transform group-hover:scale-[1.02] cursor-pointer"
                          >
                            <div class="flex flex-col gap-0.5">
                              <span class="text-[11px] font-bold leading-tight line-clamp-2 text-slate-900">{{ slot.subjectName }}</span>
                              <span class="text-[10px] text-slate-600 font-medium truncate">{{ slot.facultyName }}</span>
                            </div>
                            <div class="flex justify-between items-center mt-auto">
                              <span class="px-1.5 py-0.5 rounded bg-white/70 text-[9px] font-bold text-slate-700 uppercase border border-black/5">{{ slot.room }}</span>
                              <span class="text-[9px] font-semibold opacity-70">{{ slot.subjectType }}</span>
                            </div>
                          </div>
                        } @else {
                          <button
                            type="button"
                            (click)="openAddAt(day, period.id)"
                            class="h-full w-full border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center group-hover:border-slate-300 group-hover:bg-slate-50 transition-all cursor-pointer"
                          >
                            <mat-icon class="text-slate-300 !text-[18px] !w-[18px] !h-[18px] opacity-0 group-hover:opacity-100 transition-opacity">add</mat-icon>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>

            <!-- Mobile View -->
            <div class="lg:hidden p-4 space-y-6">
              @for (day of days; track day) {
                <div class="space-y-3">
                  <h3 class="text-xs font-black text-[#6D42E8] uppercase tracking-widest flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#6D42E8]"></span>
                    {{ day }}
                  </h3>
                  <div class="grid gap-2">
                    @for (period of periods; track period.id) {
                      @if (period.id === '13:00') {
                        <div class="p-2 bg-slate-50 rounded-lg text-center text-[10px] font-bold text-slate-400 italic">Lunch Break</div>
                      } @else {
                        @let slot = getSlot(day, period.id);
                        <button
                          type="button"
                          (click)="slot ? openEdit(slot) : openAddAt(day, period.id)"
                          class="p-3 border border-[#E2E8F0] rounded-xl flex items-center gap-4 bg-white cursor-pointer text-left w-full"
                        >
                          <div class="flex flex-col items-center justify-center min-w-[50px] border-r border-slate-100 pr-3">
                            <span class="text-[10px] font-bold text-slate-400">{{ period.id }}</span>
                          </div>
                          @if (slot) {
                            <div class="flex-1 flex flex-col gap-0.5">
                              <span class="text-xs font-bold text-slate-900">{{ slot.subjectName }}</span>
                              <span class="text-[10px] text-slate-500 font-medium">{{ slot.facultyName }} · {{ slot.room }}</span>
                            </div>
                          } @else {
                            <span class="text-[10px] font-medium text-slate-300 italic">No class scheduled</span>
                          }
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500 text-xs">
            Choose Course, Semester, and Section above to load the weekly schedule grid.
          </div>
        }
      } @else if (viewMode() === 'faculty') {
        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 space-y-4 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Faculty Weekly Teaching Schedule</h3>
              <p class="text-xs text-slate-500">Select a faculty member to verify their assigned lecture/lab blocks across all sections.</p>
            </div>
            <select [value]="facultyFilter()" (change)="onFacultyFilter($event)" class="h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs min-w-[240px]">
              @for (fac of facultyService.facultyList(); track fac.id) {
                <option [value]="fac.id">{{ fac.name }} ({{ fac.department }})</option>
              }
            </select>
          </div>

          @if (facultyScheduleSlots().length === 0) {
            <div class="py-10 text-center text-xs text-slate-500">No timetable periods assigned to this faculty member yet.</div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (slot of facultyScheduleSlots(); track slot.id) {
                <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">{{ slot.day }} · {{ slot.periodId }}</span>
                    <span class="text-[11px] font-bold text-slate-600">Room {{ slot.room }}</span>
                  </div>
                  <p class="text-xs font-bold text-slate-900">{{ slot.subjectName }}</p>
                  <p class="text-[11px] text-slate-500">{{ slot.courseId }} · Sem {{ slot.semester }} · {{ slot.sectionId }}</p>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 space-y-4 shadow-sm">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Classroom &amp; Lab Weekly Utilization</h3>
            <p class="text-xs text-slate-500">Computed across 36 active weekly periods per hall/laboratory.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (r of timetableService.roomUtilization(); track r.room) {
              <div class="p-4 rounded-xl border border-slate-200 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-900">{{ r.room }}</span>
                  <span class="text-[11px] font-bold text-[#6D42E8]">{{ r.periods }} hrs/wk ({{ r.utilizationPct }}%)</span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full bg-[#6D42E8] rounded-full" [style.width.%]="r.utilizationPct"></div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Form Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="editingId() ? 'Edit Period' : 'Schedule Period'"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="editingId() ? 'Update Slot' : 'Confirm Slot'"
        (closed)="isDrawerOpen.set(false)"
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-red-600 shrink-0">error_outline</mat-icon>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="tt-day-input" class="text-xs font-semibold text-slate-800">Day <span class="text-red-500">*</span></label>
              <select id="tt-day-input" formControlName="day" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                @for (d of days; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="tt-period-input" class="text-xs font-semibold text-slate-800">Period <span class="text-red-500">*</span></label>
              <select id="tt-period-input" formControlName="periodId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                @for (p of academicPeriods; track p.id) { <option [value]="p.id">{{ p.id }} ({{ p.end }})</option> }
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="tt-subject-input" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
            <select id="tt-subject-input" formControlName="subjectId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
              <option value="">Select Subject</option>
              @for (sub of availableSubjects(); track sub.id) {
                <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="tt-faculty-input" class="text-xs font-semibold text-slate-800">Faculty <span class="text-red-500">*</span></label>
            <select id="tt-faculty-input" formControlName="facultyId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
              <option value="">Select Faculty</option>
              @for (fac of facultyService.facultyList(); track fac.id) {
                <option [value]="fac.id">{{ fac.name }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="tt-room-input" class="text-xs font-semibold text-slate-800">Room / Lab No <span class="text-red-500">*</span></label>
            <input id="tt-room-input" formControlName="room" placeholder="e.g. L-101 or Lab-2" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
          </div>

          @if (editingId()) {
            <button
              type="button"
              (click)="openDeleteConfirm()"
              class="w-full mt-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">delete_outline</mat-icon>
              Remove this entry
            </button>
          }
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Remove Timetable Entry"
        message="Are you sure you want to remove this period from the weekly schedule?"
        confirmLabel="Remove Entry"
        variant="danger"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="deleteEntry()"
      />
    </div>
  `
})
export class TimetablePage {
  protected readonly timetableService = inject(TimetableService);
  protected readonly academicService = inject(AcademicService);
  protected readonly facultyService = inject(FacultyService);

  protected readonly viewMode = signal<'section' | 'faculty' | 'rooms'>('section');
  protected readonly courseFilter = signal('course-mca');
  protected readonly semesterFilter = signal('Semester 2');
  protected readonly sectionFilter = signal('sec-1');
  protected readonly facultyFilter = signal('fac-1');

  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  protected readonly periods = [
    { id: '09:00', end: '10:00' },
    { id: '10:00', end: '11:00' },
    { id: '11:00', end: '12:00' },
    { id: '12:00', end: '13:00' },
    { id: '13:00', end: '14:00' },
    { id: '14:00', end: '15:00' },
    { id: '15:00', end: '16:00' }
  ];
  protected readonly academicPeriods = this.periods.filter(p => p.id !== '13:00');

  protected readonly isDrawerOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal('');
  protected readonly isConfirmOpen = signal(false);
  protected readonly itemToDelete = signal<TimetableEntry | null>(null);

  protected readonly form = new FormGroup({
    day: new FormControl('Mon', Validators.required),
    periodId: new FormControl('09:00', Validators.required),
    subjectId: new FormControl('', Validators.required),
    facultyId: new FormControl('', Validators.required),
    room: new FormControl('', Validators.required)
  });

  protected readonly facultyScheduleSlots = computed(() =>
    this.timetableService.getFacultyWeeklySchedule(this.facultyFilter())
  );

  protected readonly stats = computed<StatItem[]>(() => {
    const sem = Number(this.semesterFilter().replace('Semester ', ''));
    const slots = this.timetableService.slots().filter(
      s => s.courseId === this.courseFilter() && s.semester === sem && s.sectionId === this.sectionFilter()
    );
    const facultyCount = new Set(slots.map(s => s.facultyId)).size;
    const totalPossible = this.academicPeriods.length * this.days.length;

    return [
      { label: 'Section Periods', value: slots.length, icon: 'calendar_month', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Faculty Assigned', value: facultyCount, icon: 'badge', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Free Weekly Slots', value: Math.max(0, totalPossible - slots.length), icon: 'event_available', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'Active Rooms', value: this.timetableService.roomUtilization().length, icon: 'meeting_room', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' }
    ];
  });

  onCourseFilter(ev: Event): void {
    this.courseFilter.set((ev.target as HTMLSelectElement).value);
  }

  onSemesterFilter(ev: Event): void {
    this.semesterFilter.set((ev.target as HTMLSelectElement).value);
  }

  onSectionFilter(ev: Event): void {
    this.sectionFilter.set((ev.target as HTMLSelectElement).value);
  }

  onFacultyFilter(ev: Event): void {
    this.facultyFilter.set((ev.target as HTMLSelectElement).value);
  }

  isFilterComplete(): boolean {
    return Boolean(this.courseFilter() && this.semesterFilter() && this.sectionFilter());
  }

  getSlot(day: string, periodId: string): TimetableEntry | undefined {
    const sem = Number(this.semesterFilter().replace('Semester ', ''));
    return this.timetableService.slots().find(
      s =>
        s.day === day &&
        s.periodId === periodId &&
        s.courseId === this.courseFilter() &&
        s.semester === sem &&
        s.sectionId === this.sectionFilter()
    );
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'Theory': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Practical': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Elective': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  }

  protected readonly availableSubjects = computed(() => {
    const courseName = this.academicService.courses().find(c => c.id === this.courseFilter())?.name;
    return this.academicService.subjects().filter(
      s => s.course === courseName && s.semester === this.semesterFilter()
    );
  });

  openAdd(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ day: 'Mon', periodId: '09:00', subjectId: '', facultyId: '', room: '' });
    this.isDrawerOpen.set(true);
  }

  openAddAt(day: string, periodId: string): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ day, periodId, subjectId: '', facultyId: '', room: '' });
    this.isDrawerOpen.set(true);
  }

  openEdit(entry: TimetableEntry): void {
    this.editingId.set(entry.id);
    this.formError.set('');
    this.form.patchValue({
      day: entry.day,
      periodId: entry.periodId,
      subjectId: entry.subjectId,
      facultyId: entry.facultyId,
      room: entry.room
    });
    this.isDrawerOpen.set(true);
  }

  drawerSubtitle(): string {
    const courseName = this.academicService.courses().find(c => c.id === this.courseFilter())?.name || 'Course';
    return `${courseName} • ${this.semesterFilter()}`;
  }

  handleSave(): void {
    if (this.form.invalid) {
      this.formError.set('Please fill all required fields.');
      return;
    }

    const val = this.form.getRawValue();
    const subject = this.academicService.subjects().find(s => s.id === val.subjectId);
    const faculty = this.facultyService.facultyList().find(f => f.id === val.facultyId);
    const sem = Number(this.semesterFilter().replace('Semester ', ''));

    const entryData: Omit<TimetableEntry, 'id'> = {
      courseId: this.courseFilter(),
      semester: sem,
      sectionId: this.sectionFilter(),
      day: val.day as 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat',
      periodId: val.periodId!,
      subjectId: val.subjectId!,
      subjectName: subject?.name || '',
      subjectType: subject?.type || 'Theory',
      facultyId: val.facultyId!,
      facultyName: faculty?.name || '',
      room: val.room!
    };

    const res = this.editingId()
      ? this.timetableService.update(this.editingId()!, entryData)
      : this.timetableService.add(entryData);

    if (res.success) {
      this.isDrawerOpen.set(false);
    } else {
      this.formError.set(res.error || 'Failed to save timetable entry.');
    }
  }

  openDeleteConfirm(entry?: TimetableEntry): void {
    if (entry) this.itemToDelete.set(entry);
    this.isConfirmOpen.set(true);
  }

  deleteEntry(): void {
    const target = this.itemToDelete();
    if (target) {
      this.timetableService.delete(target.id);
      this.isConfirmOpen.set(false);
      this.isDrawerOpen.set(false);
      this.itemToDelete.set(null);
    } else if (this.editingId()) {
      this.timetableService.delete(this.editingId()!);
      this.isConfirmOpen.set(false);
      this.isDrawerOpen.set(false);
    }
  }

  exportTimetableExcel(): void {
    const sem = Number(this.semesterFilter().replace('Semester ', ''));
    const slots = this.timetableService.slots().filter(
      s => s.courseId === this.courseFilter() && s.semester === sem && s.sectionId === this.sectionFilter()
    );
    exportToExcel(
      slots.map(s => ({
        Day: s.day,
        Time: s.periodId,
        Subject: s.subjectName,
        Type: s.subjectType,
        Faculty: s.facultyName,
        Room: s.room
      })),
      'eduerp-timetable'
    );
  }

  exportTimetablePdf(): void {
    const sem = Number(this.semesterFilter().replace('Semester ', ''));
    const slots = this.timetableService.slots().filter(
      s => s.courseId === this.courseFilter() && s.semester === sem && s.sectionId === this.sectionFilter()
    );
    const cols = ['Day', 'Time', 'Subject', 'Type', 'Faculty', 'Room'];
    const rows = slots.map(s => [s.day, s.periodId, s.subjectName, s.subjectType, s.facultyName, s.room]);
    exportToPdf('Weekly Academic Timetable', cols, rows, 'eduerp-timetable', [this.drawerSubtitle()]);
  }
}
