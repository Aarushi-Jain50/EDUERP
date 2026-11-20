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
import {
  Assignment,
  AssignmentTaskType,
  AssignmentsService
} from '../../../services/assignments.service';
import { QuestionPaperService } from '../../../services/question-paper.service';
import { AssignmentQuestion } from '../../../data/assignment-questions';

interface DraftQuestionRow {
  uid: string;
  topic: string;
  prompt: string;
  hint: string;
}

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
        title="Assignments & Homework"
        subtitle="Create coursework assignments or daily homework with custom questions, configure late policies, and evaluate submissions."
        actionLabel="Create Task"
        actionIcon="add"
        (actionClicked)="openCreate('Assignment')"
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Toolbar / Filters -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Type Tabs -->
          <div class="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            @for (tab of taskTypeTabs; track tab.value) {
              <button
                type="button"
                (click)="selectedTaskType.set(tab.value)"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                [class]="selectedTaskType() === tab.value
                  ? 'bg-[#6D42E8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'"
              >
                {{ tab.label }}
              </button>
            }
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="openCreate('Homework')"
              class="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#6D42E8] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <mat-icon class="text-sm">menu_book</mat-icon>
              <span>New Homework</span>
            </button>
            <a
              routerLink="/faculty/question-papers"
              class="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:border-[#6D42E8] text-xs font-semibold text-[#172554] hover:text-[#6D42E8] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <mat-icon class="text-sm text-[#6D42E8]">quiz</mat-icon>
              <span>Question Bank</span>
            </a>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 w-full sm:max-w-md">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
              <mat-icon class="text-base">search</mat-icon>
            </span>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Search assignments or homework by title..."
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
      </div>

      <!-- Assignments & Homework Table / Mobile Cards -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        @if (assignmentRows().length > 0) {
          <!-- Phone Card List (< sm) -->
          <div class="sm:hidden divide-y divide-[#E2E8F0]">
            @for (row of assignmentRows(); track row.assignment.id) {
              <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <app-status-badge [status]="row.assignment.taskType || 'Assignment'" />
                      <app-status-badge [status]="row.assignment.status" />
                    </div>
                    <a
                      [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                      class="font-semibold text-sm text-[#172554] hover:text-[#6D42E8] transition-colors block"
                    >
                      {{ row.assignment.title }}
                    </a>
                    <p class="text-[11px] text-[#64748B]">
                      {{ row.assignment.subjectName }} · {{ row.assignment.sectionName }}
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                  <span class="tabular-nums">
                    Max Marks: <strong class="text-[#172554]">{{ row.assignment.maxMarks }}</strong> ·
                    {{ row.assignment.questions?.length ?? 25 }} Questions
                  </span>
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
                      {{ row.pendingReview }} awaiting evaluation
                    </p>
                  }
                </div>

                <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                    class="flex-1 py-2 px-3 rounded-xl bg-purple-50 hover:bg-[#6D42E8] text-[#6D42E8] hover:text-white border border-purple-200 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <mat-icon class="text-sm shrink-0">grading</mat-icon>
                    <span>Evaluate Submissions</span>
                  </a>
                  <button
                    type="button"
                    (click)="openEdit(row.assignment)"
                    aria-label="Edit task"
                    class="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#6D42E8] hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                    title="Edit"
                  >
                    <mat-icon class="text-base">edit</mat-icon>
                  </button>
                  <button
                    type="button"
                    (click)="openDeleteConfirm(row.assignment)"
                    aria-label="Delete task"
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
                  <th class="px-5 py-3">Title & Questions</th>
                  <th class="px-5 py-3">Type</th>
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
                    <td class="px-5 py-4 min-w-[210px]">
                      <a
                        [routerLink]="['/faculty/assignments', row.assignment.id, 'submissions']"
                        class="font-semibold text-[#172554] hover:text-[#6D42E8] transition-colors block"
                      >
                        {{ row.assignment.title }}
                      </a>
                      <span class="block text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                        Max Marks: {{ row.assignment.maxMarks }} · {{ row.assignment.questions?.length ?? 25 }} Questions · {{ row.assignment.allowLateSubmission === false ? 'Late blocked' : 'Late allowed' }}
                      </span>
                    </td>
                    <td class="px-5 py-4 whitespace-nowrap">
                      <app-status-badge [status]="row.assignment.taskType || 'Assignment'" />
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
                          aria-label="Edit task"
                          class="p-1.5 rounded-xl text-[#64748B] hover:text-[#6D42E8] hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <mat-icon class="text-base">edit</mat-icon>
                        </button>
                        <button
                          type="button"
                          (click)="openDeleteConfirm(row.assignment)"
                          aria-label="Delete task"
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
            title="No assignments or homework found"
            message="No tasks match your current filter criteria for your allocated subjects."
            [actionLabel]="hasFilters() ? 'Reset Filters' : 'Create Assignment'"
            (actionClicked)="hasFilters() ? resetFilters() : openCreate('Assignment')"
          />
        }
      </div>

      <!-- Create / Edit Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="editingId() ? 'Edit ' + form.controls.taskType.value : 'Create Assignment / Homework'"
        subtitle="Configure coursework or homework details, due date, marks, and custom questions"
        [saveLabel]="editingId() ? 'Save Changes' : 'Publish Task'"
        widthClass="max-w-[580px]"
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

          <!-- Task Type Toggle -->
          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-[#172554] block">Task Category <span class="text-rose-500">*</span></span>
            <div class="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                (click)="form.controls.taskType.setValue('Assignment')"
                class="py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                [class]="form.controls.taskType.value === 'Assignment'
                  ? 'bg-[#6D42E8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'"
              >
                <mat-icon class="text-sm">assignment</mat-icon>
                <span>Graded Assignment</span>
              </button>
              <button
                type="button"
                (click)="form.controls.taskType.setValue('Homework')"
                class="py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                [class]="form.controls.taskType.value === 'Homework'
                  ? 'bg-[#6D42E8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'"
              >
                <mat-icon class="text-sm">menu_book</mat-icon>
                <span>Daily Homework</span>
              </button>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="asg-title" class="text-xs font-semibold text-[#172554]">Title <span class="text-rose-500">*</span></label>
            <input
              id="asg-title"
              formControlName="title"
              placeholder="e.g. AVL Rotations Practice Homework"
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
              rows="3"
              placeholder="Enter instructions for students..."
              class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:outline-none focus:border-[#6D42E8]"
            ></textarea>
          </div>

          <!-- Custom Questions Builder -->
          <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-xs font-bold text-[#172554]">Custom Worksheet Questions ({{ draftQuestions().length }})</p>
                <p class="text-[11px] text-[#64748B]">
                  Add custom questions or import from your Subject Question Bank. Leave empty to auto-attach standard 25-question sheet.
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="importFromQuestionBank()"
                  class="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#6D42E8] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <mat-icon class="text-xs">download</mat-icon>
                  <span>Import Bank Qs</span>
                </button>
                <button
                  type="button"
                  (click)="addDraftQuestion()"
                  class="px-2.5 py-1.5 rounded-lg bg-[#6D42E8] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-[#5b34cc]"
                >
                  <mat-icon class="text-xs">add</mat-icon>
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            @if (draftQuestions().length > 0) {
              <div class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                @for (q of draftQuestions(); track q.uid; let i = $index) {
                  <div class="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[11px] font-bold text-[#6D42E8]">Question {{ i + 1 }}</span>
                      <button
                        type="button"
                        (click)="removeDraftQuestion(q.uid)"
                        aria-label="Remove question"
                        class="text-rose-600 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                      >
                        <mat-icon class="text-sm">close</mat-icon>
                      </button>
                    </div>
                    <input
                      type="text"
                      [value]="q.topic"
                      (input)="updateDraftQuestion(q.uid, 'topic', $event)"
                      placeholder="Topic (e.g. Dynamic Programming)"
                      class="w-full h-8 px-2.5 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                    <textarea
                      rows="2"
                      [value]="q.prompt"
                      (input)="updateDraftQuestion(q.uid, 'prompt', $event)"
                      placeholder="Enter question statement..."
                      class="w-full p-2 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    ></textarea>
                    <input
                      type="text"
                      [value]="q.hint"
                      (input)="updateDraftQuestion(q.uid, 'hint', $event)"
                      placeholder="Optional rubric / hint for students"
                      class="w-full h-8 px-2.5 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs text-[#64748B] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>
                }
              </div>
            }
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
        title="Delete Task"
        message="Are you sure you want to delete this assignment or homework? All student submission records will be removed."
        confirmLabel="Delete"
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
  protected readonly questionPaperService = inject(QuestionPaperService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedSubject = signal<string>('');
  protected readonly selectedTaskType = signal<'All' | AssignmentTaskType>('All');

  protected readonly isDrawerOpen = signal<boolean>(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly itemToDelete = signal<Assignment | null>(null);
  protected readonly draftQuestions = signal<DraftQuestionRow[]>([]);

  protected readonly taskTypeTabs: { label: string; value: 'All' | AssignmentTaskType }[] = [
    { label: 'All Tasks', value: 'All' },
    { label: 'Assignments', value: 'Assignment' },
    { label: 'Homework', value: 'Homework' }
  ];

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

  protected readonly hasFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.selectedSubject().length > 0 ||
      this.selectedTaskType() !== 'All'
  );

  protected readonly filteredAssignments = computed(() => {
    let list = this.facultyAssignments();
    const tType = this.selectedTaskType();
    if (tType !== 'All') {
      list = list.filter(a => (a.taskType || 'Assignment') === tType);
    }
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
    taskType: new FormControl<AssignmentTaskType>('Assignment', { nonNullable: true }),
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
    this.selectedTaskType.set('All');
  }

  protected openCreate(taskType: AssignmentTaskType = 'Assignment'): void {
    this.editingId.set(null);
    this.formError.set('');
    this.draftQuestions.set([]);
    this.form.reset({
      taskType,
      title: '',
      allocationId: '',
      dueDate: '',
      maxMarks: taskType === 'Homework' ? 20 : 50,
      description: '',
      allowLateSubmission: true
    });
    this.isDrawerOpen.set(true);
  }

  protected openEdit(item: Assignment): void {
    this.editingId.set(item.id);
    this.formError.set('');
    const alloc =
      this.myAllocations().find(
        a => a.subject.toLowerCase() === item.subjectName.toLowerCase() && a.section === item.sectionName
      ) || this.myAllocations().find(a => a.subject.toLowerCase() === item.subjectName.toLowerCase());

    this.form.patchValue({
      taskType: item.taskType ?? 'Assignment',
      title: item.title,
      allocationId: alloc?.id || '',
      dueDate: item.dueDate,
      maxMarks: item.maxMarks,
      description: item.description || '',
      allowLateSubmission: item.allowLateSubmission ?? true
    });

    const existingQs = item.questions ?? [];
    // Pre-load editable draft rows only if custom sized (< 25) or editing
    if (existingQs.length > 0 && existingQs.length < 25) {
      this.draftQuestions.set(
        existingQs.map((q, idx) => ({
          uid: q.id || `dq-${idx}`,
          topic: q.topic,
          prompt: q.prompt,
          hint: q.hint
        }))
      );
    } else {
      this.draftQuestions.set([]);
    }

    this.isDrawerOpen.set(true);
  }

  protected addDraftQuestion(): void {
    this.draftQuestions.update(list => [
      ...list,
      {
        uid: `dq-${Date.now()}-${list.length}`,
        topic: '',
        prompt: '',
        hint: ''
      }
    ]);
  }

  protected removeDraftQuestion(uid: string): void {
    this.draftQuestions.update(list => list.filter(q => q.uid !== uid));
  }

  protected updateDraftQuestion(uid: string, field: 'topic' | 'prompt' | 'hint', event: Event): void {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.draftQuestions.update(list =>
      list.map(q => (q.uid === uid ? { ...q, [field]: val } : q))
    );
  }

  protected importFromQuestionBank(): void {
    const allocId = this.form.controls.allocationId.value;
    const alloc = this.myAllocations().find(a => a.id === allocId);
    const pool = alloc
      ? this.questionPaperService
          .questions()
          .filter(q => q.subjectName.toLowerCase() === alloc.subject.toLowerCase())
      : this.questionPaperService.questions();

    const slice = pool.slice(0, 5);
    if (slice.length === 0) {
      this.formError.set('No questions found in Question Bank for the selected subject yet.');
      return;
    }

    this.draftQuestions.update(curr => {
      const existingPrompts = new Set(curr.map(c => c.prompt.trim().toLowerCase()));
      const additions: DraftQuestionRow[] = slice
        .filter(q => !existingPrompts.has(q.prompt.trim().toLowerCase()))
        .map((q, idx) => ({
          uid: `imp-${q.id}-${Date.now()}-${idx}`,
          topic: q.topic,
          prompt: q.prompt,
          hint: q.rubricHint || (q.correctAnswer ? `Key concept: ${q.correctAnswer.slice(0, 80)}` : '')
        }));
      return [...curr, ...additions];
    });
  }

  protected handleSave(): void {
    if (this.form.invalid) {
      this.formError.set('Please fill all required fields correctly.');
      return;
    }

    const val = this.form.getRawValue();
    const alloc = this.myAllocations().find(a => a.id === val.allocationId);
    if (!alloc) {
      this.formError.set('Please select a valid subject allocation.');
      return;
    }

    const matchedSubject =
      this.academicService.subjects().find(
        s => s.name.toLowerCase() === alloc.subject.toLowerCase() && s.course === alloc.course
      ) || this.academicService.subjects().find(s => s.name.toLowerCase() === alloc.subject.toLowerCase());

    const matchedSection =
      this.academicService.sections().find(
        sec => sec.section === alloc.section && sec.course === alloc.course && sec.semester === alloc.semester
      ) || this.academicService.sections().find(sec => sec.section === alloc.section);

    const existing = this.editingId()
      ? this.assignmentsService.assignments().find(a => a.id === this.editingId())
      : undefined;

    const validDrafts = this.draftQuestions().filter(q => q.prompt.trim().length > 0);
    const customQuestions: AssignmentQuestion[] | undefined =
      validDrafts.length > 0
        ? validDrafts.map((q, idx) => ({
            id: `${this.editingId() || 'custom'}-q${idx + 1}`,
            number: idx + 1,
            topic: q.topic.trim() || 'Core Topic',
            prompt: q.prompt.trim(),
            hint: q.hint.trim() || 'Explain clearly with relevant examples.'
          }))
        : existing?.questions;

    const assignmentData = {
      title: val.title.trim(),
      taskType: val.taskType,
      description: val.description.trim(),
      subjectId: matchedSubject?.id || existing?.subjectId || 'sub-1',
      subjectName: alloc.subject,
      sectionId: matchedSection?.id || existing?.sectionId || 'sec-1',
      sectionName: alloc.section,
      assignedOn: existing?.assignedOn || new Date().toISOString().split('T')[0],
      dueDate: val.dueDate,
      maxMarks: Number(val.maxMarks),
      status: existing?.status === 'Closed' ? ('Closed' as const) : ('Active' as const),
      allowLateSubmission: val.allowLateSubmission,
      questions: customQuestions
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

    const hwCount = list.filter(a => a.taskType === 'Homework').length;

    return [
      {
        label: 'Assignments & Homework',
        value: `${list.length} (${hwCount} HW)`,
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
