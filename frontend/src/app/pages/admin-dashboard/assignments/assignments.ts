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
  AssignmentsService,
  Assignment,
  AssignmentStatus,
  AssignmentTaskType,
  AssignmentRosterRow
} from '../../../services/assignments.service';
import { AcademicService } from '../../../services/academic.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-assignments-page',
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
        title="Assignments & Submissions"
        subtitle="Create coursework & homework tasks, monitor student submission completion, grade work, and export evaluation sheets."
        actionLabel="Create Assignment"
        actionIcon="add_task"
        (actionClicked)="openAdd()"
      />

      <app-stat-strip [items]="stats()" />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex-1 min-w-[280px]">
          <app-data-toolbar
            [searchValue]="searchQuery()"
            (searchChange)="searchQuery.set($event)"
            [filter1Value]="selectedSubject()"
            [filter1Options]="subjectOptions()"
            (filter1Change)="selectedSubject.set($event)"
            searchPlaceholder="Search by assignment title or section..."
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="exportAssignmentsExcel()"
            class="h-10 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">table_view</mat-icon>
            Excel
          </button>
          <button
            type="button"
            (click)="exportAssignmentsPdf()"
            class="h-10 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">picture_as_pdf</mat-icon>
            PDF
          </button>
        </div>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="filteredAssignments()"
        idKey="id"
        [customActions]="customActions"
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Create / Edit Assignment Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Assignment' : 'Create Assignment')"
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
            <label for="as-title" class="text-xs font-semibold text-slate-800">Title <span class="text-red-500">*</span></label>
            <input id="as-title" formControlName="title" [readonly]="isViewOnly()" placeholder="e.g. Lab 1: Binary Search Trees" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="as-type" class="text-xs font-semibold text-slate-800">Task Type</label>
              <select id="as-type" formControlName="taskType" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="Assignment">Assignment</option>
                <option value="Homework">Homework</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="as-status" class="text-xs font-semibold text-slate-800">Status</label>
              <select id="as-status" formControlName="status" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="as-desc" class="text-xs font-semibold text-slate-800">Instructions &amp; Rubric</label>
            <textarea id="as-desc" formControlName="description" [readonly]="isViewOnly()" rows="3" placeholder="Provide detailed instructions..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"></textarea>
          </div>

          <div class="space-y-1.5">
            <label for="as-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
            <select id="as-subject" formControlName="subjectId" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
              <option value="">Select Subject</option>
              @for (sub of academicService.subjects(); track sub.id) {
                <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="as-section" class="text-xs font-semibold text-slate-800">Section <span class="text-red-500">*</span></label>
              <select id="as-section" formControlName="sectionId" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs">
                <option value="">Select Section</option>
                @for (s of academicService.sections(); track s.id) {
                  <option [value]="s.id">{{ s.section }} ({{ s.course }})</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="as-max" class="text-xs font-semibold text-slate-800">Max Marks</label>
              <input id="as-max" formControlName="maxMarks" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="as-due" class="text-xs font-semibold text-slate-800">Due Date <span class="text-red-500">*</span></label>
            <input id="as-due" formControlName="dueDate" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs" />
          </div>

          <label for="as-late" class="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input id="as-late" type="checkbox" formControlName="allowLateSubmission" [attr.disabled]="isViewOnly() ? true : null" class="w-4 h-4 accent-[#6D42E8]" />
            <span>Allow late submissions after due date</span>
          </label>
        </form>
      </app-form-drawer>

      <!-- Submission Tracker & Grading Drawer -->
      <app-form-drawer
        [isOpen]="rosterAssignment() !== null"
        [title]="'Submission Tracker & Grading'"
        [subtitle]="rosterAssignment() ? rosterAssignment()!.title + ' · Max ' + rosterAssignment()!.maxMarks + ' Marks' : ''"
        [showSaveButton]="false"
        widthClass="max-w-2xl"
        (closed)="rosterAssignment.set(null)"
      >
        @if (rosterAssignment(); as task) {
          @let taskStats = assignmentService.getAssignmentStats(task.id);
          <div class="space-y-4 pt-2">
            <div class="grid grid-cols-4 gap-2">
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div class="text-[10px] font-bold text-slate-500 uppercase">Total</div>
                <div class="text-lg font-black text-slate-900">{{ taskStats.total }}</div>
              </div>
              <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div class="text-[10px] font-bold text-emerald-700 uppercase">Submitted</div>
                <div class="text-lg font-black text-emerald-700">{{ taskStats.completedCount }}</div>
              </div>
              <div class="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <div class="text-[10px] font-bold text-[#6D42E8] uppercase">Evaluated</div>
                <div class="text-lg font-black text-[#6D42E8]">{{ taskStats.evaluated }}</div>
              </div>
              <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <div class="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
                <div class="text-lg font-black text-amber-700">{{ taskStats.pending }}</div>
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <button
                type="button"
                (click)="exportRosterPdf(task)"
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center gap-1"
              >
                <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">picture_as_pdf</mat-icon>
                Export Grading Sheet PDF
              </button>
            </div>

            <div class="border rounded-xl overflow-hidden divide-y divide-slate-100">
              @for (row of currentRoster(); track row.student.id) {
                <div class="p-3.5 space-y-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="text-xs font-bold text-slate-900">{{ row.student.name }}</p>
                      <p class="text-[11px] font-mono text-slate-500">{{ row.student.enrollmentNo }} · Submitted: {{ row.submittedOnDisplay }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        [class]="row.displayStatus === 'Evaluated' ? 'bg-purple-50 text-[#6D42E8] border-purple-200' : row.displayStatus === 'Submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : row.displayStatus === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      >
                        {{ row.displayStatus }}
                      </span>
                      <span class="text-xs font-bold text-slate-700">{{ row.marksDisplay }}</span>
                    </div>
                  </div>
                  @if (row.submission && row.submission.status !== 'Draft') {
                    <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">{{ row.submission.answerText }}</p>
                    <div class="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="0"
                        [max]="task.maxMarks"
                        [value]="getGradeDraftValue(row)"
                        (input)="setGradeDraft(row.student.id, $event)"
                        placeholder="Marks"
                        class="w-20 h-8 px-2 text-xs border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        [value]="getFeedbackDraftValue(row)"
                        (input)="setFeedbackDraft(row.student.id, $event)"
                        placeholder="Evaluation feedback..."
                        class="flex-1 h-8 px-2.5 text-xs border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        (click)="gradeStudent(task, row)"
                        class="px-3 h-8 rounded-lg bg-[#6D42E8] text-white text-xs font-bold hover:bg-[#5b35c9] cursor-pointer"
                      >
                        Grade
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Delete Assignment"
        [message]="deleteMessage()"
        confirmLabel="Delete Forever"
        variant="danger"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="deleteAssignment()"
      />
    </div>
  `
})
export class AssignmentsPage {
  protected readonly assignmentService = inject(AssignmentsService);
  protected readonly academicService = inject(AcademicService);
  private readonly userService = inject(CurrentUserService);

  protected readonly isDrawerOpen = signal(false);
  protected readonly isViewOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal('');

  protected readonly rosterAssignment = signal<Assignment | null>(null);
  protected readonly gradeInputMap = signal<Record<string, number>>({});
  protected readonly feedbackInputMap = signal<Record<string, string>>({});

  protected readonly isConfirmOpen = signal(false);
  protected readonly itemToDelete = signal<Assignment | null>(null);

  protected readonly searchQuery = signal('');
  protected readonly selectedSubject = signal('All');

  protected readonly form = new FormGroup({
    title: new FormControl('', Validators.required),
    taskType: new FormControl<AssignmentTaskType>('Assignment', Validators.required),
    description: new FormControl(''),
    subjectId: new FormControl('', Validators.required),
    sectionId: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    maxMarks: new FormControl(50, [Validators.required, Validators.min(0)]),
    status: new FormControl<AssignmentStatus>('Active', Validators.required),
    allowLateSubmission: new FormControl(true)
  });

  protected readonly currentRoster = computed<AssignmentRosterRow[]>(() => {
    const task = this.rosterAssignment();
    return task ? this.assignmentService.getAssignmentRoster(task.id) : [];
  });

  protected readonly filteredAssignments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sub = this.selectedSubject();

    return this.assignmentService.assignments().filter(a => {
      if (sub !== 'All' && a.subjectId !== sub) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.sectionName.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.assignmentService.assignments();
    const active = list.filter(a => a.status === 'Active').length;
    const overdue = list.filter(a => a.status === 'Overdue').length;
    const submissionsCount = this.assignmentService.submissions().filter(s => s.status !== 'Draft').length;
    return [
      { label: 'Active Tasks', value: active, icon: 'assignment', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Total Submissions', value: submissionsCount, icon: 'assignment_turned_in', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Overdue', value: overdue, icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
      { label: 'Closed', value: list.length - active - overdue, icon: 'check_circle', iconColorClass: 'text-slate-600', iconBgClass: 'bg-slate-50 border-slate-200' }
    ];
  });

  protected readonly subjectOptions = computed<FilterOption[]>(() => [
    { label: 'Subject: All', value: 'All' },
    ...this.academicService.subjects().map(s => ({ label: s.name, value: s.id }))
  ]);

  protected readonly columns: TableColumn[] = [
    { key: 'title', header: 'Assignment', isBold: true },
    { key: 'taskType', header: 'Type' },
    { key: 'subjectName', header: 'Subject' },
    { key: 'sectionName', header: 'Section' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'maxMarks', header: 'Max' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customActions: TableCustomAction<Assignment>[] = [
    { id: 'submissions', label: 'Submissions & Grading', icon: 'fact_check' },
    { id: 'toggle-status', label: 'Close / Reopen Task', icon: 'lock_clock' }
  ];

  openAdd(): void {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      taskType: 'Assignment',
      maxMarks: 50,
      status: 'Active',
      allowLateSubmission: true
    });
    this.isDrawerOpen.set(true);
  }

  openView(a: Assignment): void {
    this.isViewOnly.set(true);
    this.editingId.set(a.id);
    this.formError.set('');
    this.form.patchValue({
      ...a,
      taskType: a.taskType ?? 'Assignment',
      allowLateSubmission: a.allowLateSubmission ?? true
    });
    this.isDrawerOpen.set(true);
  }

  openEdit(a: Assignment): void {
    this.isViewOnly.set(false);
    this.editingId.set(a.id);
    this.formError.set('');
    this.form.patchValue({
      ...a,
      taskType: a.taskType ?? 'Assignment',
      allowLateSubmission: a.allowLateSubmission ?? true
    });
    this.isDrawerOpen.set(true);
  }

  handleCustomAction(ev: { actionId: string; row: Assignment }): void {
    if (ev.actionId === 'submissions') {
      this.rosterAssignment.set(ev.row);
    } else if (ev.actionId === 'toggle-status') {
      this.assignmentService.toggleAssignmentStatus(ev.row.id);
    }
  }

  getGradeDraftValue(row: AssignmentRosterRow): number {
    const map = this.gradeInputMap();
    if (Object.prototype.hasOwnProperty.call(map, row.student.id)) {
      return map[row.student.id];
    }
    return row.submission?.marks ?? 0;
  }

  getFeedbackDraftValue(row: AssignmentRosterRow): string {
    const map = this.feedbackInputMap();
    if (Object.prototype.hasOwnProperty.call(map, row.student.id)) {
      return map[row.student.id];
    }
    return row.submission?.feedback ?? '';
  }

  setGradeDraft(studentId: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.gradeInputMap.update(m => ({ ...m, [studentId]: Number.isFinite(val) ? val : 0 }));
  }

  setFeedbackDraft(studentId: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.feedbackInputMap.update(m => ({ ...m, [studentId]: val }));
  }

  gradeStudent(task: Assignment, row: AssignmentRosterRow): void {
    const marks = this.gradeInputMap()[row.student.id] ?? row.submission?.marks ?? 0;
    const feedback = this.feedbackInputMap()[row.student.id] ?? row.submission?.feedback ?? '';
    const reviewer = this.userService.userEmail() || 'Admin Evaluator';
    this.assignmentService.evaluateSubmission(task.id, row.student.id, marks, feedback, reviewer);
  }

  openDelete(a: Assignment): void {
    this.itemToDelete.set(a);
    this.isConfirmOpen.set(true);
  }

  deleteMessage(): string {
    return `Are you sure you want to delete "${this.itemToDelete()?.title}"? All student submissions will also be removed.`;
  }

  deleteAssignment(): void {
    if (this.itemToDelete()) {
      this.assignmentService.delete(this.itemToDelete()!.id);
      this.isConfirmOpen.set(false);
      this.itemToDelete.set(null);
    }
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.formError.set('');
  }

  drawerTitle(): string {
    if (this.isViewOnly()) return 'Assignment Details';
    return this.editingId() ? 'Edit Assignment' : 'Create New Assignment';
  }

  drawerSubtitle(): string {
    if (this.isViewOnly()) return 'View assignment instructions and deadlines.';
    return 'Set instructions, due date, late policy, and max marks.';
  }

  handleSave(): void {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }

    if (this.form.invalid) {
      this.formError.set('Please fill all required fields.');
      return;
    }

    const val = this.form.getRawValue();
    const subject = this.academicService.subjects().find(s => s.id === val.subjectId);
    const section = this.academicService.sections().find(s => s.id === val.sectionId);

    const data: Omit<Assignment, 'id'> = {
      title: val.title!,
      taskType: val.taskType || 'Assignment',
      description: val.description || '',
      subjectId: val.subjectId!,
      subjectName: subject?.name || '',
      sectionId: val.sectionId!,
      sectionName: section?.section || '',
      assignedOn: new Date().toISOString().split('T')[0],
      dueDate: val.dueDate!,
      maxMarks: val.maxMarks ?? 50,
      status: val.status || 'Active',
      allowLateSubmission: Boolean(val.allowLateSubmission)
    };

    if (this.editingId()) {
      this.assignmentService.update(this.editingId()!, data);
    } else {
      this.assignmentService.add(data);
    }
    this.closeDrawer();
  }

  exportRosterPdf(task: Assignment): void {
    const roster = this.assignmentService.getAssignmentRoster(task.id);
    const cols = ['Roll No', 'Student', 'Status', 'Submitted On', 'Score'];
    const rows = roster.map(r => [
      r.student.enrollmentNo,
      r.student.name,
      r.displayStatus,
      r.submittedOnDisplay,
      r.marksDisplay
    ]);
    exportToPdf(`Submissions: ${task.title}`, cols, rows, `submissions-${task.id}`);
  }

  exportAssignmentsExcel(): void {
    const rows = this.filteredAssignments().map(a => ({
      Title: a.title,
      Type: a.taskType || 'Assignment',
      Subject: a.subjectName,
      Section: a.sectionName,
      AssignedOn: a.assignedOn,
      DueDate: a.dueDate,
      MaxMarks: a.maxMarks,
      Status: a.status
    }));
    exportToExcel(rows, 'eduerp-assignments');
  }

  exportAssignmentsPdf(): void {
    const cols = ['Title', 'Type', 'Subject', 'Section', 'Due Date', 'Max', 'Status'];
    const rows = this.filteredAssignments().map(a => [
      a.title,
      a.taskType || 'Assignment',
      a.subjectName,
      a.sectionName,
      a.dueDate,
      a.maxMarks,
      a.status
    ]);
    exportToPdf('Assignments & Coursework Register', cols, rows, 'eduerp-assignments');
  }
}
