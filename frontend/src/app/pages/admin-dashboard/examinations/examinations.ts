import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import {
  ExaminationsService,
  Examination,
  ExamMode,
  ExamType,
  HallTicketStudentEntry
} from '../../../services/examinations.service';
import { AcademicService } from '../../../services/academic.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

interface ExaminationRow extends Examination {
  hallTicketState: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-examinations-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Examinations & Hall Tickets"
        subtitle="Schedule exams with conflict prevention, assign invigilators, audit <75% attendance eligibility, and issue admit cards."
        actionLabel="Schedule Exam"
        actionIcon="add"
        (actionClicked)="openAdd()"
      />

      <app-stat-strip [items]="stats()" />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex-1 min-w-[280px]">
          <app-data-toolbar
            [searchValue]="searchQuery()"
            (searchChange)="searchQuery.set($event)"
            [filter1Value]="selectedCourse()"
            [filter1Options]="courseOptions()"
            (filter1Change)="selectedCourse.set($event)"
            [filter2Value]="selectedType()"
            [filter2Options]="typeOptions"
            (filter2Change)="selectedType.set($event)"
            searchPlaceholder="Search by exam title, subject, venue, or invigilator..."
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="exportScheduleExcel()"
            class="h-10 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">table_view</mat-icon>
            Excel
          </button>
          <button
            type="button"
            (click)="exportSchedulePdf()"
            class="h-10 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">picture_as_pdf</mat-icon>
            Date Sheet PDF
          </button>
        </div>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="filteredExams()"
        idKey="id"
        [customActions]="customActions"
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Schedule / Edit Exam Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Exam' : 'Schedule Exam')"
        [showSaveButton]="!isViewOnly()"
        (closed)="closeDrawer()"
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-red-600 shrink-0">error_outline</mat-icon>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="ex-title" class="text-xs font-semibold text-slate-800">Exam Title <span class="text-red-500">*</span></label>
            <input id="ex-title" formControlName="title" [readonly]="isViewOnly()" placeholder="e.g. End-Term Theory Exam" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1.5">
              <label for="ex-type" class="text-xs font-semibold text-slate-800">Type <span class="text-red-500">*</span></label>
              <select id="ex-type" formControlName="type" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="Internal">Internal</option>
                <option value="Mid-Term">Mid-Term</option>
                <option value="End-Term">End-Term</option>
                <option value="Practical">Practical</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="ex-mode" class="text-xs font-semibold text-slate-800">Mode <span class="text-red-500">*</span></label>
              <select id="ex-mode" formControlName="mode" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="Online">Online (Proctored)</option>
                <option value="Offline">Offline (Hall)</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="ex-semester" class="text-xs font-semibold text-slate-800">Semester <span class="text-red-500">*</span></label>
              <select id="ex-semester" formControlName="semester" (change)="syncSemesterSelection()" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="ex-course" class="text-xs font-semibold text-slate-800">Course / Program <span class="text-red-500">*</span></label>
              <select id="ex-course" formControlName="courseId" (change)="syncCourseSelection()" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="">Select Course</option>
                @for (c of academicService.courses(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="ex-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
              <select id="ex-subject" formControlName="subjectId" [attr.disabled]="isViewOnly() || !selectedFormCourseId() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="">Select Subject</option>
                @for (sub of availableSubjects(); track sub.id) {
                  <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="ex-venue" class="text-xs font-semibold text-slate-800">Hall / Platform Venue</label>
              <input id="ex-venue" formControlName="venue" [readonly]="isViewOnly()" placeholder="e.g. Block C Hall 204" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-invigilator" class="text-xs font-semibold text-slate-800">Chief Invigilator</label>
              <input id="ex-invigilator" formControlName="invigilator" [readonly]="isViewOnly()" placeholder="e.g. Dr. Amit Joshi" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="ex-seat" class="text-xs font-semibold text-slate-800">Seat Block Prefix</label>
              <input id="ex-seat" formControlName="seatNo" [readonly]="isViewOnly()" placeholder="e.g. C-204" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-capacity" class="text-xs font-semibold text-slate-800">Hall Capacity</label>
              <input id="ex-capacity" formControlName="roomCapacity" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
          </div>

          <label for="ex-proctored" class="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input id="ex-proctored" type="checkbox" formControlName="proctored" [attr.disabled]="isViewOnly() ? true : null" class="w-4 h-4 rounded accent-[#6D42E8]" />
            <span>Enable strict browser proctoring &amp; tab-switch protection</span>
          </label>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label for="ex-date" class="text-xs font-semibold text-slate-800">Exam Date <span class="text-red-500">*</span></label>
              <input id="ex-date" formControlName="date" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-time" class="text-xs font-semibold text-slate-800">Start Time <span class="text-red-500">*</span></label>
              <input id="ex-time" formControlName="time" [readonly]="isViewOnly()" type="time" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-result-date" class="text-xs font-semibold text-slate-800">Result Date</label>
              <input id="ex-result-date" formControlName="resultAnnouncementDate" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label for="ex-duration" class="text-xs font-semibold text-slate-800">Duration (Min) <span class="text-red-500">*</span></label>
              <input id="ex-duration" formControlName="duration" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-max" class="text-xs font-semibold text-slate-800">Max Marks <span class="text-red-500">*</span></label>
              <input id="ex-max" formControlName="maxMarks" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-pass" class="text-xs font-semibold text-slate-800">Passing Marks <span class="text-red-500">*</span></label>
              <input id="ex-pass" formControlName="passingMarks" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
          </div>
        </form>
      </app-form-drawer>

      <!-- Hall Ticket & Seating Roster Drawer -->
      <app-form-drawer
        [isOpen]="rosterExam() !== null"
        [title]="'Hall Ticket & Seating Plan'"
        [subtitle]="rosterExam() ? rosterExam()!.title + ' · ' + rosterExam()!.date + ' ' + rosterExam()!.time : ''"
        [showSaveButton]="false"
        widthClass="max-w-2xl"
        (closed)="rosterExam.set(null)"
      >
        @if (rosterExam(); as ex) {
          <div class="space-y-4 pt-2">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-0.5 text-xs">
                <p class="font-bold text-slate-900">{{ ex.subjectName }} ({{ ex.courseName }})</p>
                <p class="text-slate-600">Venue: {{ ex.venue || ex.mode }} · Invigilator: {{ ex.invigilator || 'Assigned Faculty' }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="examService.publishHallTickets(ex.id)"
                  class="px-3 py-1.5 rounded-lg bg-[#6D42E8] text-white text-xs font-bold hover:bg-[#5b35c9] cursor-pointer flex items-center gap-1"
                >
                  <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">badge</mat-icon>
                  {{ ex.publishedHallTickets ? 'Unpublish Admit Cards' : 'Publish Admit Cards' }}
                </button>
                <button
                  type="button"
                  (click)="downloadSeatingPlanPdf(ex)"
                  class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">picture_as_pdf</mat-icon>
                  Seating PDF
                </button>
              </div>
            </div>

            <div class="border rounded-xl overflow-hidden divide-y divide-slate-100">
              @for (entry of hallTicketRoster(); track entry.student.id) {
                <div class="p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold text-slate-900">{{ entry.student.name }}</p>
                    <p class="text-[11px] text-slate-500 font-mono">{{ entry.student.enrollmentNo }} · Seat: {{ entry.seatAllocation }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold text-slate-600">Att: {{ entry.attendancePct }}%</span>
                    @if (entry.eligible) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Eligible</span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Shortage</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Delete Examination"
        [message]="deleteMessage()"
        confirmLabel="Remove Exam"
        variant="danger"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="deleteExam()"
      />
    </div>
  `
})
export class ExaminationsPage {
  protected readonly examService = inject(ExaminationsService);
  protected readonly academicService = inject(AcademicService);

  protected readonly isDrawerOpen = signal(false);
  protected readonly isViewOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal('');

  protected readonly selectedFormCourseId = signal('');
  protected readonly selectedFormSemester = signal('Semester 2');

  protected readonly rosterExam = signal<Examination | null>(null);
  protected readonly isConfirmOpen = signal(false);
  protected readonly examToDelete = signal<Examination | null>(null);

  protected readonly searchQuery = signal('');
  protected readonly selectedCourse = signal('All');
  protected readonly selectedType = signal('All');

  protected readonly form = new FormGroup({
    title: new FormControl('', Validators.required),
    type: new FormControl<ExamType>('Internal', Validators.required),
    mode: new FormControl<ExamMode>('Offline', Validators.required),
    venue: new FormControl(''),
    invigilator: new FormControl(''),
    seatNo: new FormControl(''),
    roomCapacity: new FormControl(50, [Validators.min(1)]),
    proctored: new FormControl(false),
    courseId: new FormControl('', Validators.required),
    semester: new FormControl('Semester 2', Validators.required),
    subjectId: new FormControl('', Validators.required),
    date: new FormControl('', Validators.required),
    time: new FormControl('', Validators.required),
    resultAnnouncementDate: new FormControl(''),
    duration: new FormControl(180, [Validators.required, Validators.min(1)]),
    maxMarks: new FormControl(100, [Validators.required, Validators.min(1)]),
    passingMarks: new FormControl(40, [Validators.required, Validators.min(1)])
  });

  protected readonly availableSubjects = computed(() => {
    const courseId = this.selectedFormCourseId();
    const semester = this.selectedFormSemester();
    const courseName = this.academicService.courses().find(c => c.id === courseId)?.name;
    return this.academicService.subjects().filter(s => s.course === courseName && s.semester === semester);
  });

  protected readonly hallTicketRoster = computed<HallTicketStudentEntry[]>(() => {
    const ex = this.rosterExam();
    return ex ? this.examService.getEligibleStudentsForExam(ex.id) : [];
  });

  protected readonly filteredExams = computed<ExaminationRow[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const course = this.selectedCourse();
    const type = this.selectedType();

    return this.examService
      .exams()
      .filter(e => {
        if (course !== 'All' && e.courseId !== course) return false;
        if (type !== 'All' && e.type !== type) return false;
        if (
          query &&
          !e.title.toLowerCase().includes(query) &&
          !e.subjectName.toLowerCase().includes(query) &&
          !(e.venue || '').toLowerCase().includes(query) &&
          !(e.invigilator || '').toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .map(e => ({
        ...e,
        hallTicketState: e.publishedHallTickets ? 'Published' : 'Draft'
      }));
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const exams = this.examService.exams();
    const upcoming = exams.filter(e => e.status === 'Scheduled').length;
    const completed = exams.filter(e => e.status === 'Completed').length;
    const publishedCards = exams.filter(e => e.publishedHallTickets).length;
    return [
      { label: 'Total Exams', value: exams.length, icon: 'assignment', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Upcoming', value: upcoming, icon: 'event', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Completed', value: completed, icon: 'check_circle', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Admit Cards Live', value: publishedCards, icon: 'badge', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  protected readonly courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id }))
  ]);

  protected readonly typeOptions: FilterOption[] = [
    { label: 'Type: All', value: 'All' },
    { label: 'Internal', value: 'Internal' },
    { label: 'Mid-Term', value: 'Mid-Term' },
    { label: 'End-Term', value: 'End-Term' },
    { label: 'Practical', value: 'Practical' }
  ];

  protected readonly columns: TableColumn[] = [
    { key: 'title', header: 'Examination', isBold: true },
    { key: 'subjectName', header: 'Subject' },
    { key: 'mode', header: 'Mode', isBadge: true },
    { key: 'date', header: 'Exam Date' },
    { key: 'venue', header: 'Venue / Hall' },
    { key: 'hallTicketState', header: 'Admit Card', isBadge: true },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customActions: TableCustomAction<ExaminationRow>[] = [
    { id: 'hall-tickets', label: 'Hall Tickets & Seating', icon: 'badge' }
  ];

  syncCourseSelection(): void {
    this.selectedFormCourseId.set(this.form.get('courseId')?.value || '');
    this.form.patchValue({ subjectId: '' });
  }

  syncSemesterSelection(): void {
    this.selectedFormSemester.set(this.form.get('semester')?.value || 'Semester 2');
    this.form.patchValue({ subjectId: '' });
  }

  openAdd(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.selectedFormCourseId.set('');
    this.selectedFormSemester.set('Semester 2');
    this.form.reset({
      type: 'Internal',
      mode: 'Offline',
      venue: '',
      invigilator: '',
      seatNo: '',
      roomCapacity: 50,
      proctored: false,
      semester: 'Semester 2',
      resultAnnouncementDate: '',
      duration: 180,
      maxMarks: 100,
      passingMarks: 40
    });
    this.isDrawerOpen.set(true);
  }

  openView(exam: ExaminationRow): void {
    this.isViewOnly.set(true);
    this.editingId.set(exam.id);
    this.formError.set('');
    this.selectedFormCourseId.set(exam.courseId);
    this.selectedFormSemester.set(exam.semester);
    this.form.patchValue(exam);
    this.isDrawerOpen.set(true);
  }

  openEdit(exam: ExaminationRow): void {
    this.isViewOnly.set(false);
    this.editingId.set(exam.id);
    this.formError.set('');
    this.selectedFormCourseId.set(exam.courseId);
    this.selectedFormSemester.set(exam.semester);
    this.form.patchValue(exam);
    this.isDrawerOpen.set(true);
  }

  handleCustomAction(ev: { actionId: string; row: ExaminationRow }): void {
    if (ev.actionId === 'hall-tickets') {
      this.rosterExam.set(ev.row);
    }
  }

  openDelete(exam: ExaminationRow): void {
    this.examToDelete.set(exam);
    this.isConfirmOpen.set(true);
  }

  deleteMessage(): string {
    return `Are you sure you want to cancel and remove "${this.examToDelete()?.title}"? This action cannot be undone.`;
  }

  deleteExam(): void {
    const target = this.examToDelete();
    if (target) {
      this.examService.delete(target.id);
      this.isConfirmOpen.set(false);
      this.examToDelete.set(null);
    }
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.formError.set('');
  }

  drawerTitle(): string {
    if (this.isViewOnly()) return 'Examination Details';
    return this.editingId() ? 'Edit Examination' : 'Schedule New Examination';
  }

  drawerSubtitle(): string {
    if (this.isViewOnly()) return 'View examination schedule, venue, and invigilation details.';
    return 'Room, invigilator, and student cohort clashes are validated automatically.';
  }

  handleSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }

    if (this.form.invalid) {
      this.formError.set('Please fill all required fields correctly.');
      return;
    }

    const val = this.form.getRawValue();
    const passingMarks = val.passingMarks ?? 0;
    const maxMarks = val.maxMarks ?? 0;

    if (passingMarks >= maxMarks) {
      this.formError.set('Passing marks must be less than maximum marks.');
      return;
    }

    if (val.resultAnnouncementDate && val.date && val.resultAnnouncementDate < val.date) {
      this.formError.set('Result announcement date cannot be earlier than the exam date.');
      return;
    }

    const courseName = this.academicService.courses().find(c => c.id === val.courseId)?.name || '';
    const subjectName = this.academicService.subjects().find(s => s.id === val.subjectId)?.name || '';
    const mode: ExamMode = val.mode || 'Offline';

    const examData: Omit<Examination, 'id'> = {
      title: val.title!,
      type: val.type!,
      mode,
      venue: val.venue?.trim() || (mode === 'Online' ? 'Protected Online Exam Browser' : 'Examination Hall'),
      invigilator: val.invigilator?.trim() || undefined,
      seatNo: val.seatNo?.trim() || undefined,
      roomCapacity: val.roomCapacity ?? 50,
      proctored: Boolean(val.proctored) || mode === 'Online',
      reportingMinutesBefore: mode === 'Offline' ? 30 : mode === 'Hybrid' ? 15 : undefined,
      courseId: val.courseId!,
      courseName,
      semester: val.semester!,
      subjectId: val.subjectId!,
      subjectName,
      date: val.date!,
      time: val.time!,
      resultAnnouncementDate: val.resultAnnouncementDate?.trim() || undefined,
      resultAnnouncementTime: '17:00',
      duration: val.duration!,
      maxMarks: val.maxMarks!,
      passingMarks: val.passingMarks!
    };

    const res = this.editingId()
      ? this.examService.update(this.editingId()!, examData)
      : this.examService.add(examData);

    if (res.success) {
      this.closeDrawer();
    } else {
      this.formError.set(res.error || 'Failed to save exam.');
    }
  }

  downloadSeatingPlanPdf(exam: Examination): void {
    const roster = this.examService.getEligibleStudentsForExam(exam.id);
    const cols = ['Roll No', 'Student Name', 'Seat Allocation', 'Attendance %', 'Hall Ticket'];
    const rows = roster.map(r => [
      r.student.enrollmentNo,
      r.student.name,
      r.seatAllocation,
      `${r.attendancePct}%`,
      r.eligible ? 'Cleared' : 'Hold (<75%)'
    ]);
    exportToPdf(
      `Seating Plan: ${exam.title}`,
      cols,
      rows,
      `seating-${exam.id}`,
      [`Course: ${exam.courseName} (${exam.semester})`, `Venue: ${exam.venue || exam.mode} · Date: ${exam.date} ${exam.time}`]
    );
  }

  exportScheduleExcel(): void {
    const rows = this.filteredExams().map(e => ({
      Title: e.title,
      Type: e.type,
      Mode: e.mode,
      Course: e.courseName,
      Semester: e.semester,
      Subject: e.subjectName,
      Date: e.date,
      Time: e.time,
      Venue: e.venue || '-',
      Invigilator: e.invigilator || '-',
      MaxMarks: e.maxMarks,
      AdmitCard: e.hallTicketState,
      Status: e.status || 'Scheduled'
    }));
    exportToExcel(rows, 'eduerp-exam-datesheet');
  }

  exportSchedulePdf(): void {
    const cols = ['Examination', 'Subject', 'Course', 'Date & Time', 'Venue', 'Max', 'Status'];
    const rows = this.filteredExams().map(e => [
      e.title,
      e.subjectName,
      e.courseName,
      `${e.date} ${e.time}`,
      e.venue || e.mode,
      e.maxMarks,
      e.status || 'Scheduled'
    ]);
    exportToPdf('Institutional Examination Date Sheet', cols, rows, 'eduerp-exam-datesheet');
  }
}
