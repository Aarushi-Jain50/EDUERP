import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService } from '../../../services/academic.service';
import { AssignmentsService, Assignment } from '../../../services/assignments.service';

@Component({
  selector: 'app-faculty-assignments',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    FormDrawer,
    ConfirmDialog,
    StatusBadge,
    EmptyState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-16 min-w-0">
      <app-page-header
        title="Assignments & Submissions"
        subtitle="Create coursework assignments, configure late submission rules, and evaluate student submissions."
        actionLabel="Create Assignment"
        actionIcon="add"
        (actionClicked)="openCreate()"
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Toolbar / Filters -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="relative flex-1 w-full sm:max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
            <mat-icon class="text-base">search</mat-icon>
          </span>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Search assignments by title..."
            class="w-full h-10 pl-9 pr-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] placeholder-[#64748B] focus:outline-none focus:border-[#6D42E8]"
          />
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <select
            [value]="selectedSubject()"
            (change)="onSubjectChange($event)"
            aria-label="Filter by allocated subject"
            class="w-full sm:w-auto h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-medium text-[#172554] focus:outline-none focus:border-[#6D42E8] cursor-pointer"
          >
            <option value="">All Allocated Subjects</option>
            @for (a of myAllocations(); track a.id) {
              <option [value]="a.subject">{{ a.subject }} ({{ a.section }})</option>
            }
          </select>
        </div>
      </div>

      <!-- Assignments Table / Mobile Cards -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        @if (assignmentRows().length > 0) {
          <!-- Phone Card List (< sm) -->
          <div class="sm:hidden divide-y divide-[#E2E8F0]">
            @for (row of assignmentRows(); track row.assignment.id) {
              <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <a
                      [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                      class="font-semibold text-sm text-[#172554] hover:text-[#6D42E8] transition-colors block"
                    >
                      {{ row.assignment.title }}
                    </a>
                    <p class="text-[11px] text-[#64748B] mt-0.5">
                      {{ row.assignment.subjectName }} · {{ row.assignment.sectionName }}
                    </p>
                  </div>
                  <div class="shrink-0">
                    <app-status-badge [status]="row.assignment.status" />
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                  <span class="tabular-nums">Max Marks: <strong class="text-[#172554]">{{ row.assignment.maxMarks }}</strong> · {{ row.assignment.allowLateSubmission === false ? 'Late blocked' : 'Late allowed' }}</span>
                  <span class="font-mono">Due {{ row.assignment.dueDate }}</span>
                </div>

                <div class="space-y-1.5">
                  <div class="flex justify-between text-[11px] font-semibold tabular-nums">
                    <span class="text-[#172554]">Submissions: {{ row.stats.completedCount }} / {{ row.stats.total }}</span>
                    <span class="text-[#6D42E8]">{{ row.stats.completionPct }}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-[#6D42E8] rounded-full transition-all"
                      [style.width.%]="row.stats.completionPct"
                    ></div>
                  </div>
                  @if (row.pendingReview > 0) {
                    <p class="text-[11px] text-amber-700 font-medium">
                      {{ row.pendingReview }} awaiting review
                    </p>
                  }
                </div>

                <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                    class="flex-1 py-2 px-3 rounded-xl bg-purple-50 hover:bg-[#6D42E8] text-[#6D42E8] hover:text-white border border-purple-200 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <mat-icon class="text-sm shrink-0">grading</mat-icon>
                    <span>Submissions</span>
                  </a>
                  <button
                    type="button"
                    (click)="openEdit(row.assignment)"
                    aria-label="Edit assignment"
                    class="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#6D42E8] hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                    title="Edit"
                  >
                    <mat-icon class="text-base">edit</mat-icon>
                  </button>
                  <button
                    type="button"
                    (click)="openDeleteConfirm(row.assignment)"
                    aria-label="Delete assignment"
                    class="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Delete"
                  >
                    <mat-icon class="text-base">delete</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Tablet/Desktop Table (sm+) -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th class="px-5 py-3">Assignment Title</th>
                  <th class="px-5 py-3">Subject & Section</th>
                  <th class="px-5 py-3">Due Date</th>
                  <th class="px-5 py-3">Submissions</th>
                  <th class="px-5 py-3 text-center">Status</th>
                  <th class="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                @for (row of assignmentRows(); track row.assignment.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="px-5 py-4 min-w-[200px]">
                      <a
                        [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                        class="font-semibold text-[#172554] hover:text-[#6D42E8] transition-colors block"
                      >
                        {{ row.assignment.title }}
                      </a>
                      <span class="block text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                        Max Marks: {{ row.assignment.maxMarks }} · {{ row.assignment.allowLateSubmission === false ? 'Late blocked' : 'Late allowed' }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <span class="font-semibold text-[#172554] block">{{ row.assignment.subjectName }}</span>
                      <span class="text-[11px] text-[#64748B]">{{ row.assignment.sectionName }}</span>
                    </td>
                    <td class="px-5 py-4 text-xs text-[#64748B] font-mono whitespace-nowrap">
                      {{ row.assignment.dueDate }}
                    </td>
                    <td class="px-5 py-4">
                      <div class="space-y-1.5 w-36">
                        <div class="flex justify-between text-[11px] font-semibold tabular-nums">
                          <span class="text-[#172554]">{{ row.stats.completedCount }} / {{ row.stats.total }}</span>
                          <span class="text-[#6D42E8]">{{ row.stats.completionPct }}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            class="h-full bg-[#6D42E8] rounded-full transition-all"
                            [style.width.%]="row.stats.completionPct"
                          ></div>
                        </div>
                        @if (row.pendingReview > 0) {
                          <p class="text-[11px] text-amber-700 font-medium">
                            {{ row.pendingReview }} awaiting review
                          </p>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-4 text-center">
                      <app-status-badge [status]="row.assignment.status" />
                    </td>
                    <td class="px-5 py-4 text-right whitespace-nowrap">
                      <div class="inline-flex items-center gap-1.5">
                        <a
                          [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                          class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-[#6D42E8] text-[#6D42E8] hover:text-white border border-purple-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <mat-icon class="text-sm">grading</mat-icon>
                          <span>Submissions</span>
                        </a>
                        <button
                          type="button"
                          (click)="openEdit(row.assignment)"
                          aria-label="Edit assignment"
                          class="p-1.5 rounded-xl text-[#64748B] hover:text-[#6D42E8] hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <mat-icon class="text-base">edit</mat-icon>
                        </button>
                        <button
                          type="button"
                          (click)="openDeleteConfirm(row.assignment)"
                          aria-label="Delete assignment"
                          class="p-1.5 rounded-xl text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            icon="assignment"
            title="No assignments found"
            message="No assignments match your current filter criteria for your allocated subjects."
            [actionLabel]="searchQuery() || selectedSubject() ? 'Reset Filters' : 'Create Assignment'"
            (actionClicked)="searchQuery() || selectedSubject() ? resetFilters() : openCreate()"
          />
        }
      </div>

      <!-- Create / Edit Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="editingId() ? 'Edit Assignment' : 'Create New Assignment'"
        subtitle="Configure coursework details, due date, marks, and late policy"
        [saveLabel]="editingId() ? 'Update Assignment' : 'Publish Assignment'"
        (closed)="isDrawerOpen.set(false)"
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-1">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="asg-title" class="text-xs font-semibold text-[#172554]">Assignment Title <span class="text-rose-500">*</span></label>
            <input
              id="asg-title"
              formControlName="title"
              placeholder="e.g. Data Structures Programming Lab #1"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <div class="space-y-1.5">
            <label for="asg-alloc" class="text-xs font-semibold text-[#172554]">Allocated Subject & Section <span class="text-rose-500">*</span></label>
            <select
              id="asg-alloc"
              formControlName="allocationId"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            >
              <option value="">Select Class Allocation</option>
              @for (a of myAllocations(); track a.id) {
                <option [value]="a.id">{{ a.subject }} ({{ a.section }} - {{ a.semester }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="asg-date" class="text-xs font-semibold text-[#172554]">Due Date <span class="text-rose-500">*</span></label>
              <input
                id="asg-date"
                type="date"
                formControlName="dueDate"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:outline-none focus:border-[#6D42E8]"
              />
            </div>
            <div class="space-y-1.5">
              <label for="asg-marks" class="text-xs font-semibold text-[#172554]">Max Marks <span class="text-rose-500">*</span></label>
              <input
                id="asg-marks"
                type="number"
                formControlName="maxMarks"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:outline-none focus:border-[#6D42E8]"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="asg-desc" class="text-xs font-semibold text-[#172554]">Description & Guidelines <span class="text-rose-500">*</span></label>
            <textarea
              id="asg-desc"
              formControlName="description"
              rows="4"
              placeholder="Enter assignment instructions..."
              class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            ></textarea>
          </div>

          <label class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] cursor-pointer">
            <input
              type="checkbox"
              formControlName="allowLateSubmission"
              class="mt-0.5 rounded border-[#E2E8F0] text-[#6D42E8] focus:ring-[#6D42E8]"
            />
            <span class="text-xs text-[#172554]">
              <strong class="block font-semibold">Allow Late Submissions</strong>
              <span class="text-[11px] text-[#64748B]">
                When unchecked, students are blocked from submitting after the due date.
              </span>
            </span>
          </label>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isConfirmOpen()"
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? All student submission records will be removed."
        confirmLabel="Delete Assignment"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="deleteAssignment()"
      />
    </div>
  `
})
export class FacultyAssignmentsPage {
  protected readonly userService = inject(CurrentUserService);
  protected readonly academicService = inject(AcademicService);
  protected readonly assignmentsService = inject(AssignmentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedSubject = signal<string>('');

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly itemToDelete = signal<Assignment | null>(null);

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly myAllocations = computed(() => {
    const fac = this.currentFaculty();
    return this.academicService.subjectAllocations().filter(
      a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim()
    );
  });

  protected readonly facultyAssignments = computed(() => {
    const allocs = this.myAllocations();
    const subNames = new Set(allocs.map(a => a.subject.toLowerCase()));
    return this.assignmentsService.assignments().filter(a => subNames.has(a.subjectName.toLowerCase()));
  });

  protected readonly filteredAssignments = computed(() => {
    let list = this.facultyAssignments();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    const sub = this.selectedSubject();
    if (sub) {
      list = list.filter(a => a.subjectName.toLowerCase() === sub.toLowerCase());
    }
    return list;
  });

  protected readonly assignmentRows = computed(() => {
    // Re-run whenever submissions change
    void this.assignmentsService.submissions();
    return this.filteredAssignments().map(assignment => {
      const stats = this.assignmentsService.getAssignmentStats(assignment.id);
      return {
        assignment,
        stats,
        pendingReview: stats.submitted + stats.late
      };
    });
  });

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    allocationId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    dueDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    maxMarks: new FormControl(50, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    allowLateSubmission: new FormControl(true, { nonNullable: true })
  });

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onSubjectChange(event: Event): void {
    this.selectedSubject.set((event.target as HTMLSelectElement).value);
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.selectedSubject.set('');
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      title: '',
      allocationId: '',
      dueDate: '',
      maxMarks: 50,
      description: '',
      allowLateSubmission: true
    });
    this.isDrawerOpen.set(true);
  }

  protected openEdit(item: Assignment): void {
    this.editingId.set(item.id);
    this.formError.set('');
    const alloc = this.myAllocations().find(
      a => a.subject.toLowerCase() === item.subjectName.toLowerCase() && a.section === item.sectionName
    ) || this.myAllocations().find(a => a.subject.toLowerCase() === item.subjectName.toLowerCase());

    this.form.patchValue({
      title: item.title,
      allocationId: alloc?.id || '',
      dueDate: item.dueDate,
      maxMarks: item.maxMarks,
      description: item.description || '',
      allowLateSubmission: item.allowLateSubmission ?? true
    });
    this.isDrawerOpen.set(true);
  }

  protected handleSave(): void {
    if (this.form.invalid) {
      this.formError.set('Please fill all required assignment fields correctly.');
      return;
    }

    const val = this.form.getRawValue();
    const alloc = this.myAllocations().find(a => a.id === val.allocationId);
    if (!alloc) {
      this.formError.set('Please select a valid subject allocation.');
      return;
    }

    const matchedSubject = this.academicService.subjects().find(
      s => s.name.toLowerCase() === alloc.subject.toLowerCase() && s.course === alloc.course
    ) || this.academicService.subjects().find(s => s.name.toLowerCase() === alloc.subject.toLowerCase());

    const matchedSection = this.academicService.sections().find(
      sec => sec.section === alloc.section && sec.course === alloc.course && sec.semester === alloc.semester
    ) || this.academicService.sections().find(sec => sec.section === alloc.section);

    const existing = this.editingId()
      ? this.assignmentsService.assignments().find(a => a.id === this.editingId())
      : undefined;

    const assignmentData = {
      title: val.title.trim(),
      description: val.description.trim(),
      subjectId: matchedSubject?.id || existing?.subjectId || 'sub-1',
      subjectName: alloc.subject,
      sectionId: matchedSection?.id || existing?.sectionId || 'sec-1',
      sectionName: alloc.section,
      assignedOn: existing?.assignedOn || new Date().toISOString().split('T')[0],
      dueDate: val.dueDate,
      maxMarks: Number(val.maxMarks),
      status: existing?.status === 'Closed' ? ('Closed' as const) : ('Active' as const),
      allowLateSubmission: val.allowLateSubmission
    };

    if (this.editingId()) {
      this.assignmentsService.update(this.editingId()!, assignmentData);
    } else {
      this.assignmentsService.add(assignmentData);
    }

    this.isDrawerOpen.set(false);
  }

  protected openDeleteConfirm(item: Assignment): void {
    this.itemToDelete.set(item);
    this.isConfirmOpen.set(true);
  }

  protected deleteAssignment(): void {
    const item = this.itemToDelete();
    if (item) {
      this.assignmentsService.delete(item.id);
      this.isConfirmOpen.set(false);
      this.itemToDelete.set(null);
    }
  }

  protected readonly stats = computed<StatItem[]>(() => {
    void this.assignmentsService.submissions();
    const list = this.facultyAssignments();
    let totalSubmissions = 0;
    let pendingEvaluations = 0;

    for (const a of list) {
      const s = this.assignmentsService.getAssignmentStats(a.id);
      totalSubmissions += s.completedCount;
      pendingEvaluations += s.submitted + s.late;
    }

    return [
      {
        label: 'My Assignments',
        value: list.length,
        icon: 'assignment',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Total Submissions',
        value: totalSubmissions,
        icon: 'folder_open',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      },
      {
        label: 'Pending Evaluations',
        value: pendingEvaluations,
        icon: 'grading',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      }
    ];
  });
}
