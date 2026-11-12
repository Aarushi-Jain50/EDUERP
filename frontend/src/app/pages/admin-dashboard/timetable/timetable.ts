import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { TimetableService } from '../../../services/timetable.service';
import { AcademicService } from '../../../services/academic.service';
import { FacultyService } from '../../../services/faculty.service';
import { TimetableEntry } from '../../../models/timetable.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timetable-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeader, StatStrip, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header 
        title="Timetable" 
        subtitle="Schedule and organize weekly academic lecture periods." 
        primaryActionLabel="Add Entry" 
        (primaryActionClicked)="openAdd()" 
      />

      <app-stat-strip [items]="stats()" />

      <!-- Filter Bar -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[180px] space-y-1.5">
          <label for="tt-course" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Course</label>
          <select id="tt-course" [(ngModel)]="filters.courseId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
            <option value="">Select Course</option>
            @for (c of academicService.courses(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>
        <div class="flex-1 min-w-[150px] space-y-1.5">
          <label for="tt-semester" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semester</label>
          <select id="tt-semester" [(ngModel)]="filters.semester" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
            <option value="">Select Semester</option>
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Semester 3">Semester 3</option>
            <option value="Semester 4">Semester 4</option>
          </select>
        </div>
        <div class="flex-1 min-w-[150px] space-y-1.5">
          <label for="tt-section" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Section</label>
          <select id="tt-section" [(ngModel)]="filters.sectionId" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
            <option value="">Select Section</option>
            @for (s of academicService.sections(); track s.id) {
              <option [value]="s.id">{{ s.section }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Weekly Grid -->
      @if (isFilterComplete()) {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <!-- Desktop Grid -->
          <div class="hidden lg:grid grid-cols-[110px_repeat(6,1fr)] bg-slate-50 border-b border-[#E2E8F0]">
            <div class="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-[#E2E8F0]">Period</div>
            @for (day of days; track day) {
              <div class="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">{{ day }}</div>
            }
          </div>

          <div class="hidden lg:flex flex-col">
            @for (period of periods; track period.id) {
              @if (period.id === '13:00') {
                <!-- Lunch Break Row -->
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
                    <div 
                      (keydown.enter)="slot ? selectedSlotMenu.set(slot.id === selectedSlotMenu() ? null : slot.id) : openAddAt(day, period.id)"
                      tabindex="0"
                      class="h-[100px] p-2 border-r border-[#E2E8F0] last:border-r-0 hover:bg-slate-50/50 transition-all cursor-pointer group relative"
                    >
                      @if (slot) {
                        <div 
                          [class]="getTypeClass(slot.subjectType)" 
                          (click)="selectedSlotMenu.set(slot.id === selectedSlotMenu() ? null : slot.id)"
                          (keydown.enter)="selectedSlotMenu.set(slot.id === selectedSlotMenu() ? null : slot.id)"
                          tabindex="0"
                          class="h-full w-full rounded-lg p-2 flex flex-col justify-between shadow-sm border border-black/5 transition-transform group-hover:scale-[1.02]"
                        >
                          <div class="flex flex-col gap-1">
                            <span class="text-[11px] font-bold leading-tight line-clamp-2 text-slate-900">{{ slot.subjectName }}</span>
                            <span class="text-[10px] text-slate-600 font-medium truncate">{{ slot.facultyName }}</span>
                          </div>
                          <div class="flex justify-between items-center mt-auto">
                            <span class="px-1.5 py-0.5 rounded bg-white/60 text-[9px] font-bold text-slate-700 uppercase tracking-tighter border border-black/5">{{ slot.room }}</span>
                          </div>

                          <!-- Mini Menu Popover -->
                          @if (selectedSlotMenu() === slot.id) {
                            <div class="absolute top-2 right-2 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 w-24">
                               <button (click)="openEdit(slot); selectedSlotMenu.set(null)" class="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  <span class="material-icons text-sm text-indigo-500">edit</span> Edit
                               </button>
                               <button (click)="openDeleteConfirm(slot); selectedSlotMenu.set(null)" class="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <span class="material-icons text-sm">delete</span> Remove
                               </button>
                            </div>
                          }
                        </div>
                      } @else {
                        <div 
                          (click)="openAddAt(day, period.id)"
                          (keydown.enter)="openAddAt(day, period.id)"
                          tabindex="0"
                          class="h-full w-full border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center group-hover:border-slate-300 group-hover:bg-slate-50 transition-all"
                        >
                          <span class="material-icons text-slate-200 text-lg opacity-0 group-hover:opacity-100 transition-opacity">add</span>
                        </div>
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
                      <div 
                        (click)="slot ? openEdit(slot) : openAddAt(day, period.id)"
                        (keydown.enter)="slot ? openEdit(slot) : openAddAt(day, period.id)"
                        tabindex="0"
                        class="p-3 border border-[#E2E8F0] rounded-xl flex items-center gap-4 bg-white cursor-pointer"
                      >
                        <div class="flex flex-col items-center justify-center min-w-[50px] border-r border-slate-100 pr-3">
                          <span class="text-[10px] font-bold text-slate-400">{{ period.id }}</span>
                        </div>
                        @if (slot) {
                          <div class="flex-1 flex flex-col gap-0.5">
                            <div class="flex justify-between items-start">
                              <span class="text-xs font-bold text-slate-900">{{ slot.subjectName }}</span>
                              <span [class]="getTypeBadgeClass(slot.subjectType)" class="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase">{{ slot.subjectType }}</span>
                            </div>
                            <span class="text-[10px] text-slate-500 font-medium">{{ slot.facultyName }} • {{ slot.room }}</span>
                          </div>
                        } @else {
                          <span class="text-[10px] font-medium text-slate-300 italic">No class scheduled</span>
                          <span class="material-icons text-slate-200 text-sm ml-auto">add_circle_outline</span>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
            <span class="material-icons text-4xl">calendar_month</span>
          </div>
          <h3 class="text-lg font-bold text-slate-800">Select filters to view timetable</h3>
          <p class="text-slate-500 text-sm max-w-xs mt-1">Please choose a course, semester, and section to load the weekly schedule grid.</p>
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
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="tt-day-input" class="text-xs font-semibold text-slate-800">Day <span class="text-red-500">*</span></label>
              <select id="tt-day-input" formControlName="day" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                @for (d of days; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="tt-period-input" class="text-xs font-semibold text-slate-800">Period <span class="text-red-500">*</span></label>
              <select id="tt-period-input" formControlName="periodId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                @for (p of academicPeriods; track p.id) { <option [value]="p.id">{{ p.id }} ({{ p.end }})</option> }
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="tt-subject-input" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
            <select id="tt-subject-input" formControlName="subjectId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Subject</option>
              @for (sub of availableSubjects(); track sub.id) {
                <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="tt-faculty-input" class="text-xs font-semibold text-slate-800">Faculty <span class="text-red-500">*</span></label>
            <select id="tt-faculty-input" formControlName="facultyId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Faculty</option>
              @for (fac of facultyService.facultyList(); track fac.id) {
                <option [value]="fac.id">{{ fac.name }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="tt-room-input" class="text-xs font-semibold text-slate-800">Room / Lab No <span class="text-red-500">*</span></label>
            <input id="tt-room-input" formControlName="room" placeholder="e.g. L-101 or Lab-2" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          @if (editingId()) {
            <button 
              type="button"
              (click)="openDeleteConfirm()"
              class="w-full mt-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span class="material-icons text-sm">delete_outline</span>
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
        (closed)="isConfirmOpen.set(false)" 
        (confirmed)="deleteEntry()" 
      />
    </div>
  `
})
export class TimetablePage {
  protected readonly timetableService = inject(TimetableService);
  protected readonly academicService = inject(AcademicService);
  protected readonly facultyService = inject(FacultyService);

  protected filters = {
    courseId: 'course-mca',
    semester: 'Semester 2',
    sectionId: 'sec-1'
  };

  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  protected readonly periods = [
    { id: '09:00', end: '10:00' },
    { id: '10:00', end: '11:00' },
    { id: '11:00', end: '12:00' },
    { id: '12:00', end: '13:00' },
    { id: '13:00', end: '14:00' }, // Lunch
    { id: '14:00', end: '15:00' },
    { id: '15:00', end: '16:00' }
  ];

  protected readonly academicPeriods = this.periods.filter(p => p.id !== '13:00');

  protected readonly isDrawerOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly selectedSlotMenu = signal<string | null>(null);
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

  protected readonly stats = computed<StatItem[]>(() => {
    const slots = this.timetableService.slots().filter(s => 
      s.courseId === this.filters.courseId && 
      s.semester === Number(this.filters.semester.replace('Semester ', '')) && 
      s.sectionId === this.filters.sectionId
    );
    const facultyCount = new Set(slots.map(s => s.facultyId)).size;
    const totalPossible = this.academicPeriods.length * this.days.length;

    return [
      { label: 'Periods Scheduled', value: slots.length, icon: 'calendar_month', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Faculty Involved', value: facultyCount, icon: 'badge', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Free Slots', value: totalPossible - slots.length, icon: 'event_available', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  isFilterComplete() {
    return this.filters.courseId && this.filters.semester && this.filters.sectionId;
  }

  getSlot(day: string, periodId: string) {
    const sem = Number(this.filters.semester.replace('Semester ', ''));
    return this.timetableService.slots().find(s => 
      s.day === day && 
      s.periodId === periodId && 
      s.courseId === this.filters.courseId && 
      s.semester === sem && 
      s.sectionId === this.filters.sectionId
    );
  }

  getTypeClass(type: string) {
    switch (type) {
      case 'Theory': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Practical': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Elective': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  }

  getTypeBadgeClass(type: string) {
    switch (type) {
      case 'Theory': return 'bg-purple-100 text-purple-700';
      case 'Practical': return 'bg-emerald-100 text-emerald-700';
      case 'Elective': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  protected readonly availableSubjects = computed(() => {
    const courseName = this.academicService.courses().find(c => c.id === this.filters.courseId)?.name;
    return this.academicService.subjects().filter(s => s.course === courseName && s.semester === this.filters.semester);
  });

  openAdd() {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ day: 'Mon', periodId: '09:00' });
    this.isDrawerOpen.set(true);
  }

  openAddAt(day: string, periodId: string) {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ day, periodId });
    this.isDrawerOpen.set(true);
  }

  openEdit(entry: TimetableEntry) {
    this.editingId.set(entry.id);
    this.formError.set('');
    this.form.patchValue(entry);
    this.isDrawerOpen.set(true);
  }

  drawerSubtitle() {
    const courseName = this.academicService.courses().find(c => c.id === this.filters.courseId)?.name || 'Course';
    return `${courseName} • ${this.filters.semester}`;
  }

  handleSave() {
    if (this.form.invalid) {
      this.formError.set('Please fill all required fields.');
      return;
    }

    const val = this.form.getRawValue();
    const subject = this.academicService.subjects().find(s => s.id === val.subjectId);
    const faculty = this.facultyService.facultyList().find(f => f.id === val.facultyId);
    
    const sem = Number(this.filters.semester.replace('Semester ', ''));

    const entryData: Omit<TimetableEntry, 'id'> = {
      courseId: this.filters.courseId,
      semester: sem,
      sectionId: this.filters.sectionId,
      day: val.day as 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat',
      periodId: val.periodId!,
      subjectId: val.subjectId!,
      subjectName: subject?.name || '',
      subjectType: subject?.type || 'Theory',
      facultyId: val.facultyId!,
      facultyName: faculty?.name || '',
      room: val.room!
    };

    let res;
    if (this.editingId()) {
      res = this.timetableService.update(this.editingId()!, entryData);
    } else {
      res = this.timetableService.add(entryData);
    }

    if (res.success) {
      this.isDrawerOpen.set(false);
    } else {
      this.formError.set(res.error || 'Failed to save timetable entry.');
    }
  }

  openDeleteConfirm(entry?: TimetableEntry) {
    if (entry) this.itemToDelete.set(entry);
    this.isConfirmOpen.set(true);
  }

  deleteEntry() {
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
}
