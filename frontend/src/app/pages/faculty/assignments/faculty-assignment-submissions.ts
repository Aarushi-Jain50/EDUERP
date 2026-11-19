import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import {
  AssignmentRosterRow,
  AssignmentsService
} from '../../../services/assignments.service';
import { CurrentUserService } from '../../../services/current-user.service';

@Component({
  selector: 'app-faculty-assignment-submissions',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    DataToolbar,
    FormDrawer,
    StatusBadge,
    EmptyState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-16 min-w-0">
      <div>
        <a
          routerLink="/faculty/assignments"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#6D42E8] transition-colors"
        >
          <mat-icon class="text-base">arrow_back</mat-icon>
          <span>Back to Assignments</span>
        </a>
      </div>

      @if (assignment(); as asg) {
        <app-page-header
          [title]="asg.title + ' — Submissions'"
          [subtitle]="asg.subjectName + ' · ' + asg.sectionName + ' · Due ' + asg.dueDate + ' · Max ' + asg.maxMarks + ' marks'"
        />

        <!-- 5 Stats: Total Students, Submitted, Late, Pending, Evaluated -->
        <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
            <div class="min-w-0">
              <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Total Students</p>
              <p class="text-xl sm:text-2xl font-bold text-[#172554] mt-1 tabular-nums">{{ stats().total }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-slate-100 text-[#172554] border border-[#E2E8F0] flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">groups</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
            <div class="min-w-0">
              <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Submitted</p>
              <p class="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{{ stats().submitted }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">task_alt</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
            <div class="min-w-0">
              <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Late</p>
              <p class="text-xl sm:text-2xl font-bold text-amber-700 mt-1 tabular-nums">{{ stats().late }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">schedule</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
            <div class="min-w-0">
              <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Pending</p>
              <p class="text-xl sm:text-2xl font-bold text-rose-600 mt-1 tabular-nums">{{ stats().pending }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">pending_actions</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-2.5 sm:gap-3 col-span-2 sm:col-span-1 min-w-0">
            <div class="min-w-0">
              <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Evaluated</p>
              <p class="text-xl sm:text-2xl font-bold text-[#6D42E8] mt-1 tabular-nums">{{ stats().evaluated }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">verified</mat-icon>
            </div>
          </div>
        </section>

        <!-- Search & Status Filter -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <app-data-toolbar
            searchPlaceholder="Search by student name or enrollment no..."
            [searchValue]="searchQuery()"
            (searchChange)="searchQuery.set($event)"
            [filter1Value]="statusFilter()"
            [filter1Options]="statusOptions"
            (filter1Change)="statusFilter.set($event)"
            [hasActiveFilters]="hasActiveFilters()"
            (resetClicked)="resetFilters()"
          />
        </div>

        <!-- Roster Submissions Table / Mobile Cards -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          @if (filteredRoster().length > 0) {
            <!-- Phone Card List (< sm) -->
            <div class="sm:hidden divide-y divide-[#E2E8F0]">
              @for (row of filteredRoster(); track row.student.id) {
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-[#6D42E8] flex items-center justify-center text-xs font-bold shrink-0">
                        {{ row.student.initials }}
                      </div>
                      <div class="min-w-0">
                        <p class="font-semibold text-[#172554] text-xs truncate">{{ row.student.name }}</p>
                        <p class="text-[11px] font-mono text-[#64748B] truncate">{{ row.student.enrollmentNo }}</p>
                      </div>
                    </div>
                    <div class="shrink-0">
                      <app-status-badge [status]="row.displayStatus" />
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[11px]">
                    <div class="min-w-0">
                      <span class="block text-[#64748B] text-[10px]">Submitted</span>
                      <span class="font-medium text-[#172554] truncate block">{{ row.submittedOnDisplay }}</span>
                    </div>
                    <div>
                      <span class="block text-[#64748B] text-[10px]">Files</span>
                      <span class="font-semibold text-[#172554] tabular-nums">{{ row.attachmentsCount }}</span>
                    </div>
                    <div class="text-right">
                      <span class="block text-[#64748B] text-[10px]">Marks</span>
                      <span class="font-semibold text-[#172554] tabular-nums">{{ row.marksDisplay }}</span>
                    </div>
                  </div>

                  <div>
                    @if (row.submission && row.submission.status !== 'Draft') {
                      <button
                        type="button"
                        (click)="openReviewDrawer(row)"
                        class="w-full py-2 px-3.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        [class]="row.submission.status === 'Evaluated'
                          ? 'bg-slate-50 border border-[#E2E8F0] text-[#172554] hover:border-[#6D42E8] hover:text-[#6D42E8]'
                          : 'gradient-accent text-white shadow-sm hover:opacity-95'"
                      >
                        <mat-icon class="text-sm shrink-0">rate_review</mat-icon>
                        <span>{{ row.submission.status === 'Evaluated' ? 'Edit Review' : 'Review Submission' }}</span>
                      </button>
                    } @else {
                      <span class="block text-center py-1 text-xs text-[#64748B]">Awaiting submission</span>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Tablet/Desktop Table (sm+) -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th class="px-5 py-3">Student</th>
                    <th class="px-5 py-3">Enrollment No</th>
                    <th class="px-5 py-3">Submitted On</th>
                    <th class="px-5 py-3">Status</th>
                    <th class="px-5 py-3 text-center">Attachments</th>
                    <th class="px-5 py-3 text-center">Marks</th>
                    <th class="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                  @for (row of filteredRoster(); track row.student.id) {
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="px-5 py-3.5">
                        <div class="flex items-center gap-2.5 min-w-[160px]">
                          <div class="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-[#6D42E8] flex items-center justify-center text-xs font-bold shrink-0">
                            {{ row.student.initials }}
                          </div>
                          <div class="min-w-0">
                            <p class="font-semibold text-[#172554] truncate">{{ row.student.name }}</p>
                            <p class="text-[11px] text-[#64748B] truncate">{{ row.student.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-5 py-3.5 font-mono text-xs text-[#64748B] whitespace-nowrap">
                        {{ row.student.enrollmentNo }}
                      </td>
                      <td class="px-5 py-3.5 text-xs text-[#64748B] whitespace-nowrap">
                        {{ row.submittedOnDisplay }}
                      </td>
                      <td class="px-5 py-3.5">
                        <app-status-badge [status]="row.displayStatus" />
                      </td>
                      <td class="px-5 py-3.5 text-center text-xs font-medium text-[#172554] tabular-nums">
                        {{ row.attachmentsCount }}
                      </td>
                      <td class="px-5 py-3.5 text-center text-xs font-semibold text-[#172554] tabular-nums whitespace-nowrap">
                        {{ row.marksDisplay }}
                      </td>
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        @if (row.submission && row.submission.status !== 'Draft') {
                          <button
                            type="button"
                            (click)="openReviewDrawer(row)"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            [class]="row.submission.status === 'Evaluated'
                              ? 'bg-slate-50 border border-[#E2E8F0] text-[#172554] hover:border-[#6D42E8] hover:text-[#6D42E8]'
                              : 'gradient-accent text-white shadow-sm hover:opacity-95'"
                          >
                            <mat-icon class="text-sm">rate_review</mat-icon>
                            <span>{{ row.submission.status === 'Evaluated' ? 'Edit Review' : 'Review' }}</span>
                          </button>
                        } @else {
                          <span class="text-xs text-[#64748B]">Awaiting submission</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state
              icon="assignment_ind"
              title="No student submissions match"
              message="No students in this assignment roster match your current search or status filter."
              [actionLabel]="hasActiveFilters() ? 'Reset Filters' : ''"
              (actionClicked)="resetFilters()"
            />
          }
        </div>

        <!-- Evaluation Review Drawer -->
        <app-form-drawer
          [isOpen]="selectedRow() !== null"
          [title]="selectedRow() ? 'Review: ' + selectedRow()!.student.name : 'Review Submission'"
          [subtitle]="selectedRow() ? selectedRow()!.student.enrollmentNo + ' · Max ' + asg.maxMarks + ' marks' : ''"
          saveLabel="Save Evaluation"
          widthClass="max-w-[520px]"
          (closed)="closeReviewDrawer()"
          (saved)="saveEvaluation()"
        >
          @if (selectedRow(); as row) {
            @if (row.submission; as sub) {
              <div class="space-y-5">
                <!-- Submission Metadata -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-2 flex-wrap">
                  <div class="space-y-0.5 text-xs">
                    <p class="font-semibold text-[#172554]">Version v{{ sub.version }}</p>
                    <p class="text-[11px] text-[#64748B]">Submitted on {{ formatDateTime(sub.submittedAt || sub.submittedOn || '') }}</p>
                  </div>
                  <app-status-badge [status]="sub.status" />
                </div>

                <!-- Student Answer -->
                <div class="space-y-1.5">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Student Answer</p>
                  <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[13px] text-[#172554] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {{ sub.answerText }}
                  </div>
                </div>

                <!-- Attachment Metadata List -->
                <div class="space-y-2">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Attachments ({{ sub.attachments.length }})
                  </p>
                  @if (sub.attachments.length > 0) {
                    <div class="space-y-2">
                      @for (file of sub.attachments; track file.name) {
                        <div class="p-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2.5">
                          <mat-icon class="text-base text-[#6D42E8] shrink-0">description</mat-icon>
                          <div class="min-w-0 flex-1">
                            <p class="text-xs font-semibold text-[#172554] truncate">{{ file.name }}</p>
                            <p class="text-[11px] text-[#64748B]">{{ formatFileSize(file.sizeKB) }}</p>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-xs text-[#64748B]">No attachments uploaded.</p>
                  }
                </div>

                <!-- Evaluation Inputs -->
                <div class="pt-3 border-t border-[#E2E8F0] space-y-4">
                  @if (reviewError()) {
                    <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                      <span>{{ reviewError() }}</span>
                    </div>
                  }

                  <div class="space-y-1.5">
                    <label for="eval-marks" class="text-xs font-semibold text-[#172554]">
                      Marks Awarded (0 - {{ asg.maxMarks }}) <span class="text-rose-500">*</span>
                    </label>
                    <input
                      id="eval-marks"
                      type="number"
                      min="0"
                      [max]="asg.maxMarks"
                      [formControl]="marksControl"
                      (input)="reviewError.set('')"
                      class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-semibold text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label for="eval-feedback" class="text-xs font-semibold text-[#172554]">
                      Evaluation Feedback
                    </label>
                    <textarea
                      id="eval-feedback"
                      rows="4"
                      [formControl]="feedbackControl"
                      placeholder="Write constructive feedback on solution accuracy, code structure, or improvements..."
                      class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] placeholder-slate-400 focus:outline-none focus:border-[#6D42E8]"
                    ></textarea>
                  </div>
                </div>
              </div>
            }
          }
        </app-form-drawer>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="assignment_late"
            title="Assignment not found"
            message="The requested assignment does not exist or may have been deleted."
            actionLabel="Back to Assignments"
            (actionClicked)="navigateBack()"
          />
        </div>
      }
    </div>
  `
})
export class FacultyAssignmentSubmissionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly userService = inject(CurrentUserService);

  private readonly assignmentId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('assignmentId') ?? '')),
    { initialValue: '' }
  );

  protected readonly searchQuery = signal<string>('');
  protected readonly statusFilter = signal<string>('All');
  protected readonly selectedStudentId = signal<string | null>(null);
  protected readonly reviewError = signal<string>('');

  protected readonly marksControl = new FormControl<number | null>(null);
  protected readonly feedbackControl = new FormControl<string>('', { nonNullable: true });

  protected readonly statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Late', value: 'Late' },
    { label: 'Evaluated', value: 'Evaluated' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Draft', value: 'Draft' }
  ];

  protected readonly assignment = computed(() => {
    const id = this.assignmentId();
    return this.assignmentsService.assignments().find(a => a.id === id) ?? null;
  });

  protected readonly roster = computed<AssignmentRosterRow[]>(() => {
    void this.assignmentsService.submissions();
    const id = this.assignmentId();
    if (!id) return [];
    return this.assignmentsService.getAssignmentRoster(id);
  });

  protected readonly stats = computed(() => {
    void this.assignmentsService.submissions();
    const id = this.assignmentId();
    return this.assignmentsService.getAssignmentStats(id);
  });

  protected readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'All'
  );

  protected readonly filteredRoster = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.roster().filter(row => {
      if (status !== 'All' && row.displayStatus !== status) return false;
      if (q) {
        const matches =
          row.student.name.toLowerCase().includes(q) ||
          row.student.enrollmentNo.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  });

  protected readonly selectedRow = computed<AssignmentRosterRow | null>(() => {
    const stuId = this.selectedStudentId();
    if (!stuId) return null;
    return this.roster().find(r => r.student.id === stuId) ?? null;
  });

  protected openReviewDrawer(row: AssignmentRosterRow): void {
    if (!row.submission) return;
    this.reviewError.set('');
    this.marksControl.setValue(row.submission.marks ?? null);
    this.feedbackControl.setValue(row.submission.feedback ?? '');
    this.selectedStudentId.set(row.student.id);
  }

  protected closeReviewDrawer(): void {
    this.selectedStudentId.set(null);
    this.reviewError.set('');
  }

  protected saveEvaluation(): void {
    const asg = this.assignment();
    const row = this.selectedRow();
    if (!asg || !row?.submission) return;

    const rawMarks = this.marksControl.value;
    if (rawMarks === null || Number.isNaN(Number(rawMarks))) {
      this.reviewError.set(`Please enter numeric marks between 0 and ${asg.maxMarks}.`);
      return;
    }

    const numericMarks = Number(rawMarks);
    if (numericMarks < 0 || numericMarks > asg.maxMarks) {
      this.reviewError.set(`Marks must be between 0 and ${asg.maxMarks}.`);
      return;
    }

    const result = this.assignmentsService.evaluateSubmission(
      asg.id,
      row.student.id,
      numericMarks,
      this.feedbackControl.value,
      this.userService.currentFaculty().name
    );

    if (!result.success) {
      this.reviewError.set(result.error || 'Could not save evaluation.');
      return;
    }

    this.closeReviewDrawer();
  }

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
  }

  protected formatFileSize(sizeKB: number): string {
    if (sizeKB >= 1024) {
      return `${(sizeKB / 1024).toFixed(2)} MB`;
    }
    return `${sizeKB} KB`;
  }

  protected formatDateTime(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  protected navigateBack(): void {
    this.router.navigate(['/faculty/assignments']);
  }
}
