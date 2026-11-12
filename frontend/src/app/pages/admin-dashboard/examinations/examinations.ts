import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { StatusBadge } from '../../../components/shared/status-badge';
import { ExaminationsService, Examination, ExamType } from '../../../services/examinations.service';
import { AcademicService } from '../../../services/academic.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-examinations-page',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeader, StatStrip, DataToolbar, DataTable, FormDrawer, ConfirmDialog, StatusBadge],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Examinations" subtitle="Schedule and manage academic exams, internal tests, and practicals." primaryActionLabel="Add Exam" (primaryActionClicked)="openAdd()" />
      
      <app-stat-strip [items]="stats()" />

      <app-data-toolbar 
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseOptions()"
        (filter1Change)="selectedCourse.set($event)"
        [filter2Value]="selectedType()"
        [filter2Options]="typeOptions"
        (filter2Change)="selectedType.set($event)"
        searchPlaceholder="Search by exam title or subject..."
      />

      <app-data-table 
        [columns]="columns" 
        [data]="filteredExams()" 
        idKey="id" 
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)" 
      />
      
      <app-form-drawer 
        [isOpen]="isDrawerOpen()" 
        [title]="drawerTitle()" 
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Exam' : 'Schedule Exam')"
        (closed)="closeDrawer()" 
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <!-- Basic Info -->
          <div class="space-y-1.5">
            <label for="ex-title" class="text-xs font-semibold text-slate-800">Exam Title <span class="text-red-500">*</span></label>
            <input id="ex-title" formControlName="title" [readonly]="isViewOnly()" placeholder="e.g. End-Term Theory Exam" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:bg-slate-50" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="ex-type" class="text-xs font-semibold text-slate-800">Exam Type <span class="text-red-500">*</span></label>
              <select id="ex-type" formControlName="type" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Internal">Internal</option>
                <option value="Mid-Term">Mid-Term</option>
                <option value="End-Term">End-Term</option>
                <option value="Practical">Practical</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="ex-semester" class="text-xs font-semibold text-slate-800">Semester <span class="text-red-500">*</span></label>
              <select id="ex-semester" formControlName="semester" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="ex-course" class="text-xs font-semibold text-slate-800">Course / Program <span class="text-red-500">*</span></label>
            <select id="ex-course" formControlName="courseId" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Course</option>
              @for (c of academicService.courses(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="ex-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
            <select id="ex-subject" formControlName="subjectId" [attr.disabled]="isViewOnly() || !form.get('courseId')?.value ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Subject</option>
              @for (sub of availableSubjects(); track sub.id) {
                <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="ex-date" class="text-xs font-semibold text-slate-800">Date <span class="text-red-500">*</span></label>
              <input id="ex-date" formControlName="date" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-time" class="text-xs font-semibold text-slate-800">Start Time <span class="text-red-500">*</span></label>
              <input id="ex-time" formControlName="time" [readonly]="isViewOnly()" type="time" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label for="ex-duration" class="text-xs font-semibold text-slate-800">Duration (Min) <span class="text-red-500">*</span></label>
              <input id="ex-duration" formControlName="duration" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-max" class="text-xs font-semibold text-slate-800">Max Marks <span class="text-red-500">*</span></label>
              <input id="ex-max" formControlName="maxMarks" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="ex-pass" class="text-xs font-semibold text-slate-800">Passing Marks <span class="text-red-500">*</span></label>
              <input id="ex-pass" formControlName="passingMarks" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog 
        [isOpen]="isConfirmOpen()" 
        title="Delete Examination" 
        [message]="deleteMessage()"
        confirmLabel="Remove Exam"
        (closed)="isConfirmOpen.set(false)" 
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
  
  protected readonly isConfirmOpen = signal(false);
  protected readonly examToDelete = signal<Examination | null>(null);

  protected readonly searchQuery = signal('');
  protected readonly selectedCourse = signal('All');
  protected readonly selectedType = signal('All');

  protected readonly form = new FormGroup({
    title: new FormControl('', Validators.required),
    type: new FormControl<ExamType>('Internal', Validators.required),
    courseId: new FormControl('', Validators.required),
    semester: new FormControl('Semester 2', Validators.required),
    subjectId: new FormControl('', Validators.required),
    date: new FormControl('', Validators.required),
    time: new FormControl('', Validators.required),
    duration: new FormControl(180, [Validators.required, Validators.min(1)]),
    maxMarks: new FormControl(100, [Validators.required, Validators.min(1)]),
    passingMarks: new FormControl(40, [Validators.required, Validators.min(1)])
  });

  protected readonly availableSubjects = computed(() => {
    const courseId = this.form.get('courseId')?.value;
    const semester = this.form.get('semester')?.value;
    const courseName = this.academicService.courses().find(c => c.id === courseId)?.name;
    return this.academicService.subjects().filter(s => s.course === courseName && s.semester === semester);
  });

  protected readonly filteredExams = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const course = this.selectedCourse();
    const type = this.selectedType();
    
    return this.examService.exams().filter(e => {
      if (course !== 'All' && e.courseId !== course) return false;
      if (type !== 'All' && e.type !== type) return false;
      if (query && !e.title.toLowerCase().includes(query) && !e.subjectName.toLowerCase().includes(query)) return false;
      return true;
    });
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const exams = this.examService.exams();
    const upcoming = exams.filter(e => e.status === 'Scheduled').length;
    const completed = exams.filter(e => e.status === 'Completed').length;
    return [
      { label: 'Total Exams', value: exams.length, icon: 'assignment', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Upcoming', value: upcoming, icon: 'event', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Completed', value: completed, icon: 'check_circle', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' }
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
    { key: 'courseName', header: 'Course' },
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time' },
    { key: 'maxMarks', header: 'Max' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  openAdd() {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      type: 'Internal',
      semester: 'Semester 2',
      duration: 180,
      maxMarks: 100,
      passingMarks: 40
    });
    this.isDrawerOpen.set(true);
  }

  openView(exam: Examination) {
    this.isViewOnly.set(true);
    this.editingId.set(exam.id);
    this.formError.set('');
    this.form.patchValue(exam);
    this.isDrawerOpen.set(true);
  }

  openEdit(exam: Examination) {
    this.isViewOnly.set(false);
    this.editingId.set(exam.id);
    this.formError.set('');
    this.form.patchValue(exam);
    this.isDrawerOpen.set(true);
  }

  openDelete(exam: Examination) {
    this.examToDelete.set(exam);
    this.isConfirmOpen.set(true);
  }

  deleteMessage() {
    return `Are you sure you want to cancel and remove the scheduled exam "${this.examToDelete()?.title}"? This cannot be undone.`;
  }

  deleteExam() {
    if (this.examToDelete()) {
      this.examService.delete(this.examToDelete()!.id);
      this.isConfirmOpen.set(false);
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formError.set('');
  }

  drawerTitle() {
    if (this.isViewOnly()) return 'Examination Details';
    return this.editingId() ? 'Edit Examination' : 'Schedule New Examination';
  }

  drawerSubtitle() {
    if (this.isViewOnly()) return 'View examination schedule and requirements.';
    return 'Set date, time, and marking criteria for the exam.';
  }

  handleSave() {
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

    // Date validation for new exams
    if (!this.editingId()) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(val.date!) < today) {
        this.formError.set('Exam date cannot be in the past.');
        return;
      }
    }

    const courseName = this.academicService.courses().find(c => c.id === val.courseId)?.name || '';
    const subjectName = this.academicService.subjects().find(s => s.id === val.subjectId)?.name || '';

    const examData: Omit<Examination, 'id'> = {
      title: val.title!,
      type: val.type!,
      courseId: val.courseId!,
      courseName,
      semester: val.semester!,
      subjectId: val.subjectId!,
      subjectName,
      date: val.date!,
      time: val.time!,
      duration: val.duration!,
      maxMarks: val.maxMarks!,
      passingMarks: val.passingMarks!
    };

    let res;
    if (this.editingId()) {
      res = this.examService.update(this.editingId()!, examData);
    } else {
      res = this.examService.add(examData);
    }

    if (res.success) {
      this.closeDrawer();
    } else {
      this.formError.set(res.error || 'Failed to save exam.');
    }
  }
}
