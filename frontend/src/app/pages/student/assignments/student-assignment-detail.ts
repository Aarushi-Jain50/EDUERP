import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { EmptyState } from '../../../components/shared/empty-state';
import { StatusBadge } from '../../../components/shared/status-badge';
import {
  AssignmentsService,
  SubmissionAttachment,
} from '../../../services/assignments.service';
import { StudentPortalFacade } from '../shared/student-portal.facade';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.zip'] as const;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 3;
const PAGE_SIZE = 5;

@Component({
  selector: 'app-student-assignment-detail',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, StatusBadge, ConfirmDialog, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <a
          routerLink="/student/assignments"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#6D42E8] transition-colors"
        >
          <mat-icon class="text-base">arrow_back</mat-icon>
          <span>Back to All Subjects</span>
        </a>

        <!-- Quick Subject Switcher -->
        @if (siblingAssignments().length > 1) {
          <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span class="text-[11px] font-semibold text-[#64748B] whitespace-nowrap">Switch Subject:</span>
            @for (sib of siblingAssignments(); track sib.assignment.id) {
              <a
                [routerLink]="['/student/assignments', sib.assignment.id]"
                class="px-2.5 py-1 rounded-xl border text-[11px] font-semibold whitespace-nowrap transition-colors"
                [class]="sib.assignment.id === assignmentItem()?.assignment?.id
                  ? 'bg-[#6D42E8] text-white border-[#6D42E8]'
                  : 'bg-white text-[#172554] border-[#E2E8F0] hover:border-[#6D42E8]'"
              >
                {{ sib.subjectCode }} ({{ sib.answeredQuestions }}/{{ sib.totalQuestions }})
              </a>
            }
          </div>
        }
      </div>

      @if (assignmentItem(); as item) {
        <!-- Assignment Header -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-4">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div class="space-y-2 min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px] font-semibold text-[#172554]">
                  {{ item.subjectCode }}
                </span>
                <span class="text-xs font-medium text-[#64748B]">{{ item.assignment.subjectName }}</span>
                <app-status-badge [status]="item.displayStatus" />
                @if (item.version > 0) {
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 border border-[#E2E8F0] text-[11px] font-semibold text-[#172554]">
                    Version v{{ item.version }}
                  </span>
                }
              </div>

              <h1 class="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">
                {{ item.assignment.title }}
              </h1>

              <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#64748B]">
                <span class="inline-flex items-center gap-1">
                  <mat-icon class="text-sm text-[#6D42E8]">person</mat-icon>
                  <span>Faculty: <strong class="text-[#172554] font-medium">{{ item.facultyName }}</strong></span>
                </span>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1">
                  <mat-icon class="text-sm text-[#6D42E8]">event</mat-icon>
                  <span>Due: <strong class="text-[#172554] font-medium">{{ facade.formatShortDate(item.assignment.dueDate) }}</strong></span>
                </span>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1">
                  <mat-icon class="text-sm text-[#6D42E8]">quiz</mat-icon>
                  <span>Worksheet: <strong class="text-[#172554] font-semibold tabular-nums">{{ answeredQuestionsCount() }}/{{ questions().length }} Qs</strong></span>
                </span>
                <span aria-hidden="true">·</span>
                <span class="inline-flex items-center gap-1">
                  <mat-icon class="text-sm text-[#6D42E8]">grade</mat-icon>
                  <span>Max Marks: <strong class="text-[#172554] font-semibold tabular-nums">{{ item.assignment.maxMarks }}</strong></span>
                </span>
              </div>
            </div>

            <!-- Live Countdown -->
            <div
              class="w-full md:w-auto px-3.5 py-2.5 rounded-xl border shrink-0 flex items-center gap-2"
              [class]="isPastDue()
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-purple-50 border-purple-200 text-[#6D42E8]'"
            >
              <mat-icon class="text-base shrink-0">schedule</mat-icon>
              <div class="text-left">
                <p class="text-[11px] uppercase tracking-wider font-semibold opacity-80">Time Window</p>
                <p class="text-xs font-bold tabular-nums">{{ liveCountdown() }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Instructions Block -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h2 class="text-sm font-bold text-[#172554]">Assignment Brief</h2>
            <span class="text-[11px] text-[#64748B]">
              Assigned on {{ facade.formatShortDate(item.assignment.assignedOn) }}
              <span aria-hidden="true">·</span>
              {{ item.assignment.allowLateSubmission === false ? 'Late submissions not accepted' : 'Late submissions accepted (marked Late)' }}
            </span>
          </div>
          <p class="text-[13px] text-[#172554] leading-relaxed bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 whitespace-pre-wrap">
            {{ item.assignment.description }}
          </p>
        </section>

        <!-- Evaluated Result Banner -->
        @if (item.submission && item.submission.status === 'Evaluated') {
          <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-[#6D42E8] flex items-center justify-center shrink-0">
                  <mat-icon class="text-lg">verified</mat-icon>
                </div>
                <div>
                  <h2 class="text-sm font-bold text-[#172554]">Evaluation Result</h2>
                  <p class="text-xs text-[#64748B]">
                    Evaluated by {{ item.evaluatedBy || item.facultyName }}
                    @if (item.evaluatedAt) {
                      <span> on {{ formatDateTime(item.evaluatedAt) }}</span>
                    }
                  </p>
                </div>
              </div>
              <div class="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-left sm:text-right self-start sm:self-auto shrink-0">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#6D42E8]">Score Awarded</p>
                <p class="text-lg font-bold text-[#172554] tabular-nums">
                  {{ item.marksObtained }} / {{ item.assignment.maxMarks }}
                </p>
              </div>
            </div>

            <div class="space-y-1.5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Faculty Feedback</p>
              <p class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[13px] text-[#172554] leading-relaxed">
                {{ item.evaluationFeedback || 'No written remarks provided.' }}
              </p>
            </div>
          </section>
        }

        <!-- Interactive 25-Question Subject Worksheet -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-5">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
            <div class="space-y-1">
              <h2 class="text-sm font-bold text-[#172554]">
                Subject Question Sheet ({{ questions().length }} Questions)
              </h2>
              <p class="text-xs text-[#64748B]">
                Answer the questions below for {{ item.assignment.subjectName }}. Drafts sync locally &amp; to your cloud submission.
              </p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                (click)="questionFilter.set('all'); currentPage.set(0)"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer whitespace-nowrap"
                [class]="questionFilter() === 'all' ? 'bg-[#6D42E8] text-white border-[#6D42E8]' : 'bg-slate-50 text-[#64748B] border-[#E2E8F0]'"
              >
                All ({{ questions().length }})
              </button>
              <button
                type="button"
                (click)="questionFilter.set('unanswered'); currentPage.set(0)"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer whitespace-nowrap"
                [class]="questionFilter() === 'unanswered' ? 'bg-[#6D42E8] text-white border-[#6D42E8]' : 'bg-slate-50 text-[#64748B] border-[#E2E8F0]'"
              >
                Unanswered ({{ questions().length - answeredQuestionsCount() }})
              </button>
              <button
                type="button"
                (click)="questionFilter.set('answered'); currentPage.set(0)"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer whitespace-nowrap"
                [class]="questionFilter() === 'answered' ? 'bg-[#6D42E8] text-white border-[#6D42E8]' : 'bg-slate-50 text-[#64748B] border-[#E2E8F0]'"
              >
                Answered ({{ answeredQuestionsCount() }})
              </button>
              <button
                type="button"
                (click)="showAllQuestions.set(!showAllQuestions())"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#172554] cursor-pointer whitespace-nowrap"
              >
                {{ showAllQuestions() ? 'Paginate (5/page)' : 'Expand All 25' }}
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-[#172554]">Completion Progress</span>
              <span class="font-bold text-[#6D42E8] tabular-nums">
                {{ answeredQuestionsCount() }} of {{ questions().length }} Answered ({{ completionPct() }}%)
              </span>
            </div>
            <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full bg-[#6D42E8] rounded-full transition-all" [style.width.%]="completionPct()"></div>
            </div>
          </div>

          <!-- Quick Jump Q1..Q25 Navigator -->
          <div class="flex flex-wrap gap-1.5">
            @for (q of questions(); track q.id) {
              <button
                type="button"
                (click)="jumpToQuestion($index)"
                class="w-8 h-8 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer tabular-nums"
                [class]="isQuestionAnswered(q.id)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-[#64748B] border-[#E2E8F0] hover:border-[#6D42E8]'"
                [title]="'Jump to Question ' + q.number + ': ' + q.topic"
              >
                {{ q.number }}
              </button>
            }
          </div>

          <!-- Questions List -->
          <div class="space-y-4">
            @for (q of visibleQuestions(); track q.id) {
              <div class="p-4 rounded-xl bg-slate-50/70 border border-[#E2E8F0] space-y-2.5">
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded-lg bg-white border border-[#E2E8F0] font-mono text-[11px] font-bold text-[#6D42E8]">
                        Q{{ q.number }}
                      </span>
                      <span class="text-xs font-bold text-[#172554]">{{ q.topic }}</span>
                    </div>
                    <p class="text-[13px] font-medium text-[#172554] leading-relaxed">{{ q.prompt }}</p>
                  </div>

                  <button
                    type="button"
                    (click)="toggleHint(q.id)"
                    class="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#64748B] hover:text-[#6D42E8] shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    {{ visibleHints()[q.id] ? 'Hide Hint' : 'Hint' }}
                  </button>
                </div>

                @if (visibleHints()[q.id]) {
                  <p class="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-950">
                    Hint: {{ q.hint }}
                  </p>
                }

                @if (isSubmittedReadOnly()) {
                  <div class="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#172554] whitespace-pre-wrap">
                    {{ getQuestionAnswer(q.id) || 'No response recorded for this question.' }}
                  </div>
                } @else {
                  <textarea
                    rows="3"
                    [attr.aria-label]="'Answer for question ' + q.number"
                    [value]="getQuestionAnswer(q.id)"
                    (input)="setQuestionAnswer(q.id, $any($event.target).value)"
                    [placeholder]="'Write your solution or explanation for Question ' + q.number + '...'"
                    class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#172554] placeholder-slate-400 focus:outline-none focus:border-[#6D42E8]"
                  ></textarea>
                }
              </div>
            } @empty {
              <p class="text-xs text-[#64748B] text-center py-6 bg-slate-50 rounded-xl border border-[#E2E8F0]">
                No questions match the selected filter.
              </p>
            }
          </div>

          @if (!showAllQuestions() && totalPages() > 1) {
            <div class="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                [disabled]="currentPage() === 0"
                (click)="currentPage.set(currentPage() - 1)"
                class="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#172554] disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                Previous 5 Questions
              </button>
              <span class="text-xs font-semibold text-[#64748B] tabular-nums">
                Page {{ currentPage() + 1 }} of {{ totalPages() }}
              </span>
              <button
                type="button"
                [disabled]="currentPage() >= totalPages() - 1"
                (click)="currentPage.set(currentPage() + 1)"
                class="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#172554] disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                Next 5 Questions
              </button>
            </div>
          }
        </section>

        <!-- Submission Summary & Files Card -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-5">
          @if (isSubmittedReadOnly()) {
            @let sub = item.submission!;
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-sm font-bold text-[#172554]">Your Submission</h2>
                  <app-status-badge [status]="sub.status" />
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 border border-[#E2E8F0] text-[11px] font-semibold text-[#172554]">
                    v{{ sub.version }}
                  </span>
                </div>
                <p class="text-xs text-[#64748B]">
                  Submitted on {{ formatDateTime(sub.submittedAt || sub.submittedOn || '') }} · {{ answeredQuestionsCount() }}/{{ questions().length }} questions answered
                </p>
              </div>

              @if (canResubmit()) {
                <button
                  type="button"
                  (click)="startResubmit()"
                  class="px-4 py-2 rounded-xl border border-[#6D42E8] text-[#6D42E8] hover:bg-purple-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                >
                  <mat-icon class="text-base">refresh</mat-icon>
                  <span>Edit &amp; Resubmit</span>
                </button>
              } @else if (sub.status !== 'Evaluated' && isPastDue()) {
                <span class="text-xs text-[#64748B] font-medium">
                  Resubmission closed after due date
                </span>
              }
            </div>

            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Submitted Summary Notes</p>
              <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[13px] text-[#172554] leading-relaxed whitespace-pre-wrap">
                {{ sub.answerText }}
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Attachments ({{ sub.attachments.length }})
              </p>
              @if (sub.attachments.length > 0) {
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  @for (file of sub.attachments; track file.name) {
                    <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-purple-50 text-[#6D42E8] flex items-center justify-center shrink-0">
                        <mat-icon class="text-base">description</mat-icon>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold text-[#172554] truncate">{{ file.name }}</p>
                        <p class="text-[11px] text-[#64748B] tabular-nums">{{ formatFileSize(file.sizeKB) }}</p>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-xs text-[#64748B]">No files attached with this submission.</p>
              }
            </div>

            @if (sub.history && sub.history.length > 0) {
              <div class="space-y-2.5 pt-3 border-t border-[#E2E8F0]">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Previous Submission History ({{ sub.history.length }})
                </p>
                <div class="space-y-2">
                  @for (hist of sub.history; track hist.version) {
                    <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-1">
                      <div class="flex items-center justify-between gap-2 text-xs">
                        <span class="font-semibold text-[#172554]">Version v{{ hist.version }} · {{ hist.status }}</span>
                        <span class="text-[11px] text-[#64748B]">{{ formatDateTime(hist.submittedAt) }}</span>
                      </div>
                      <p class="text-xs text-[#64748B] line-clamp-2">{{ hist.answerText }}</p>
                      <p class="text-[11px] text-[#64748B]">{{ hist.attachments.length }} attachment(s)</p>
                    </div>
                  }
                </div>
              </div>
            }
          } @else {
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
              <div>
                <h2 class="text-sm font-bold text-[#172554]">
                  {{ isEditingResubmit() ? 'Resubmit Assignment' : 'Overall Submission & Attachments' }}
                </h2>
                <p class="text-xs text-[#64748B] mt-0.5">
                  Answer at least 5 questions in the worksheet above or write summary notes (min 20 chars) to submit.
                </p>
              </div>
              @if (item.submission?.status === 'Draft') {
                <app-status-badge status="Draft" />
              }
            </div>

            @if (isSubmissionBlocked()) {
              <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
                <mat-icon class="text-base text-rose-600 shrink-0 mt-0.5">block</mat-icon>
                <div>
                  <p class="font-bold">Late Submissions Blocked</p>
                  <p class="mt-0.5">
                    This assignment's due date ({{ facade.formatShortDate(item.assignment.dueDate) }}) has passed and late submissions are disabled by your faculty.
                  </p>
                </div>
              </div>
            } @else {
              @if (isPastDue()) {
                <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                  <mat-icon class="text-base text-amber-600 shrink-0">warning</mat-icon>
                  <span>The due date has passed. Submitting now will record your work as <strong>Late</strong>.</span>
                </div>
              }

              @if (inlineError()) {
                <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                  <span>{{ inlineError() }}</span>
                </div>
              }

              <div class="space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <label for="submission-answer" class="text-xs font-semibold text-[#172554]">
                    Overall Summary / Reflection Notes
                  </label>
                  <span
                    class="text-[11px] font-medium tabular-nums"
                    [class]="answerCharCount() >= 20 || answeredQuestionsCount() >= 5 ? 'text-emerald-700' : 'text-[#64748B]'"
                  >
                    {{ answeredQuestionsCount() }}/{{ questions().length }} questions · {{ answerCharCount() }} summary chars
                  </span>
                </div>
                <textarea
                  id="submission-answer"
                  rows="4"
                  [formControl]="answerControl"
                  (input)="inlineError.set('')"
                  placeholder="Optional high-level implementation notes, complexity trade-offs, or lab observations..."
                  class="w-full p-3.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] placeholder-slate-400 focus:outline-none focus:border-[#6D42E8] leading-relaxed"
                ></textarea>
              </div>

              <!-- Attachment Picker -->
              <div class="space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold text-[#172554]">Attachments (Optional)</p>
                    <p class="text-[11px] text-[#64748B]">
                      PDF, DOC, DOCX, or ZIP only · Max 10 MB per file · Up to {{ maxFilesLimit }} files
                    </p>
                  </div>

                  <label
                    for="assignment-file-picker"
                    class="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-slate-50 hover:bg-purple-50 hover:border-[#6D42E8] text-xs font-semibold text-[#172554] hover:text-[#6D42E8] inline-flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto"
                    [class.opacity-50]="attachments().length >= maxFilesLimit"
                  >
                    <mat-icon class="text-base">attach_file</mat-icon>
                    <span>Attach Files ({{ attachments().length }}/{{ maxFilesLimit }})</span>
                  </label>
                  <input
                    id="assignment-file-picker"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.zip"
                    [disabled]="attachments().length >= maxFilesLimit"
                    (change)="onFilesSelected($event)"
                    class="sr-only"
                  />
                </div>

                @if (attachmentError()) {
                  <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                    <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                    <span>{{ attachmentError() }}</span>
                  </div>
                }

                @if (attachments().length > 0) {
                  <div class="space-y-2">
                    @for (file of attachments(); track file.name) {
                      <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-8 h-8 rounded-lg bg-purple-50 text-[#6D42E8] flex items-center justify-center shrink-0">
                            <mat-icon class="text-base">description</mat-icon>
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-semibold text-[#172554] truncate">{{ file.name }}</p>
                            <p class="text-[11px] text-[#64748B] tabular-nums">{{ formatFileSize(file.sizeKB) }}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="removeAttachment(file.name)"
                          aria-label="Remove attachment"
                          class="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        >
                          <mat-icon class="text-base">close</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Action Footer -->
              <div class="pt-4 border-t border-[#E2E8F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                @if (isEditingResubmit()) {
                  <button
                    type="button"
                    (click)="cancelResubmit()"
                    class="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#64748B] cursor-pointer transition-colors text-center whitespace-nowrap"
                  >
                    Cancel Resubmit
                  </button>
                } @else {
                  <button
                    type="button"
                    (click)="saveDraft()"
                    class="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#172554] inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <mat-icon class="text-base text-[#6D42E8]">save</mat-icon>
                    <span>Save Draft ({{ answeredQuestionsCount() }}/{{ questions().length }})</span>
                  </button>
                }

                <button
                  type="button"
                  (click)="requestSubmit()"
                  class="w-full sm:w-auto justify-center gradient-accent text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm hover:opacity-95 transition-opacity inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <mat-icon class="text-base">task_alt</mat-icon>
                  <span>{{ isEditingResubmit() ? 'Submit Resubmission' : 'Submit Assignment' }}</span>
                </button>
              </div>
            }
          }
        </section>

        <app-confirm-dialog
          [isOpen]="isConfirmOpen()"
          [title]="isEditingResubmit() ? 'Confirm Resubmission' : 'Confirm Assignment Submission'"
          [message]="confirmMessage()"
          [confirmLabel]="isEditingResubmit() ? 'Resubmit Work' : 'Submit Assignment'"
          icon="task_alt"
          variant="primary"
          (cancelled)="isConfirmOpen.set(false)"
          (confirmed)="confirmSubmit()"
        />
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="assignment_late"
            title="Assignment not found for this student"
            message="This assignment does not belong to the currently selected student's course or section."
            actionLabel="Back to Assignments"
            (actionClicked)="navigateBack()"
          />
        </div>
      }
    </div>
  `,
})
export class StudentAssignmentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly assignmentsService = inject(AssignmentsService);
  protected readonly facade = inject(StudentPortalFacade);

  private readonly assignmentId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('assignmentId') ?? '')),
    { initialValue: '' }
  );

  protected readonly maxFilesLimit = MAX_FILES;
  protected readonly answerControl = new FormControl<string>('', { nonNullable: true });
  private readonly answerSignal = toSignal(this.answerControl.valueChanges, { initialValue: '' });

  protected readonly questionAnswers = signal<Record<string, string>>({});
  protected readonly questionFilter = signal<'all' | 'unanswered' | 'answered'>('all');
  protected readonly currentPage = signal<number>(0);
  protected readonly showAllQuestions = signal<boolean>(false);
  protected readonly visibleHints = signal<Record<string, boolean>>({});

  protected readonly attachments = signal<SubmissionAttachment[]>([]);
  protected readonly inlineError = signal<string>('');
  protected readonly attachmentError = signal<string>('');
  protected readonly isConfirmOpen = signal<boolean>(false);
  protected readonly isEditingResubmit = signal<boolean>(false);
  protected readonly nowMillis = signal<number>(Date.now());

  protected readonly siblingAssignments = this.facade.studentAssignments;

  protected readonly assignmentItem = computed(() => {
    const id = this.assignmentId();
    return this.facade.studentAssignments().find(a => a.assignment.id === id) ?? null;
  });

  protected readonly questions = computed(() => {
    const item = this.assignmentItem();
    if (!item) return [];
    return this.assignmentsService.getQuestionsForAssignment(item.assignment.id);
  });

  protected readonly answeredQuestionsCount = computed(() => {
    const mapVal = this.questionAnswers();
    return this.questions().filter(q => (mapVal[q.id] ?? '').trim().length > 0).length;
  });

  protected readonly completionPct = computed(() => {
    const total = this.questions().length;
    if (total === 0) return 0;
    return Math.round((this.answeredQuestionsCount() / total) * 100);
  });

  protected readonly filteredQuestions = computed(() => {
    const mode = this.questionFilter();
    const mapVal = this.questionAnswers();
    return this.questions().filter(q => {
      const answered = (mapVal[q.id] ?? '').trim().length > 0;
      if (mode === 'answered') return answered;
      if (mode === 'unanswered') return !answered;
      return true;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredQuestions().length / PAGE_SIZE))
  );

  protected readonly visibleQuestions = computed(() => {
    const list = this.filteredQuestions();
    if (this.showAllQuestions()) return list;
    const safePage = Math.min(this.currentPage(), Math.max(0, this.totalPages() - 1));
    const start = safePage * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  });

  protected readonly answerCharCount = computed(() => {
    void this.answerSignal();
    return this.answerControl.value.trim().length;
  });

  protected readonly isPastDue = computed(() => {
    const item = this.assignmentItem();
    if (!item) return false;
    return this.assignmentsService.isAssignmentPastDue(item.assignment);
  });

  protected readonly isSubmissionBlocked = computed(() => {
    const item = this.assignmentItem();
    if (!item) return false;
    return this.isPastDue() && item.assignment.allowLateSubmission === false;
  });

  protected readonly isSubmittedReadOnly = computed(() => {
    const item = this.assignmentItem();
    if (!item?.submission) return false;
    const status = item.submission.status;
    if (status === 'Submitted' || status === 'Late' || status === 'Evaluated') {
      return !this.isEditingResubmit();
    }
    return false;
  });

  protected readonly canResubmit = computed(() => {
    const item = this.assignmentItem();
    if (!item?.submission) return false;
    if (item.submission.status === 'Evaluated') return false;
    return !this.isPastDue();
  });

  protected readonly liveCountdown = computed(() => {
    const item = this.assignmentItem();
    if (!item) return '-';
    const dueEnd = new Date(`${item.assignment.dueDate}T23:59:59`);
    const diffMs = dueEnd.getTime() - this.nowMillis();
    const absMs = Math.abs(diffMs);
    const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absMs % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    if (diffMs >= 0) {
      return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s left`;
    }
    return `Overdue by ${days}d ${pad(hours)}h ${pad(minutes)}m`;
  });

  protected readonly confirmMessage = computed(() => {
    const item = this.assignmentItem();
    if (!item) return '';
    const nextVersion = (item.submission?.version ?? 0) + 1;
    const qsNote = `${this.answeredQuestionsCount()}/${this.questions().length} worksheet questions answered`;
    const fileNote = `${this.attachments().length} file(s) attached`;
    if (this.isPastDue()) {
      return `The due date has passed, so "${item.assignment.title}" will be recorded as Late (v${nextVersion}) with ${qsNote} and ${fileNote}. Continue?`;
    }
    return `Submit "${item.assignment.title}" as version v${nextVersion} with ${qsNote} and ${fileNote}? You can edit & resubmit before the due date until evaluated.`;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const timer = setInterval(() => this.nowMillis.set(Date.now()), 1000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    }

    effect(() => {
      const id = this.assignmentId();
      const studentId = this.facade.currentStudent().id;
      const item = this.facade.studentAssignments().find(a => a.assignment.id === id);

      this.inlineError.set('');
      this.attachmentError.set('');
      this.isConfirmOpen.set(false);
      this.isEditingResubmit.set(false);
      this.currentPage.set(0);
      this.questionFilter.set('all');

      if (item?.submission) {
        this.answerControl.setValue(item.submission.answerText || '');
        this.attachments.set([...item.submission.attachments]);
        this.questionAnswers.set({ ...(item.submission.questionAnswers ?? {}) });
      } else {
        this.answerControl.setValue('');
        this.attachments.set([]);
        this.questionAnswers.set({});
      }
      void studentId;
    });
  }

  protected getQuestionAnswer(questionId: string): string {
    return this.questionAnswers()[questionId] ?? '';
  }

  protected setQuestionAnswer(questionId: string, value: string): void {
    this.inlineError.set('');
    this.questionAnswers.update(curr => ({ ...curr, [questionId]: value }));
  }

  protected isQuestionAnswered(questionId: string): boolean {
    return (this.questionAnswers()[questionId] ?? '').trim().length > 0;
  }

  protected toggleHint(questionId: string): void {
    this.visibleHints.update(curr => ({ ...curr, [questionId]: !curr[questionId] }));
  }

  protected jumpToQuestion(index: number): void {
    this.questionFilter.set('all');
    if (!this.showAllQuestions()) {
      this.currentPage.set(Math.floor(index / PAGE_SIZE));
    }
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) return;

    this.attachmentError.set('');
    const current = [...this.attachments()];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      const lowerName = file.name.toLowerCase();
      const validExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));

      if (!validExt) {
        errors.push(`"${file.name}" rejected: only PDF, DOC, DOCX, or ZIP files are allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push(`"${file.name}" exceeds the 10 MB size limit.`);
        continue;
      }
      if (current.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} attachments allowed per submission.`);
        break;
      }
      if (current.some(existing => existing.name.toLowerCase() === lowerName)) {
        errors.push(`"${file.name}" is already attached.`);
        continue;
      }

      current.push({
        name: file.name,
        sizeKB: Math.max(1, Math.round(file.size / 1024)),
        type: file.type || this.inferMimeType(lowerName),
      });
    }

    this.attachments.set(current);
    if (errors.length > 0) {
      this.attachmentError.set(errors[0]);
    }
    input.value = '';
  }

  private inferMimeType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.doc')) return 'application/msword';
    if (fileName.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return 'application/zip';
  }

  protected removeAttachment(name: string): void {
    this.attachmentError.set('');
    this.attachments.update(list => list.filter(f => f.name !== name));
  }

  protected saveDraft(): void {
    const item = this.assignmentItem();
    if (!item) return;
    this.inlineError.set('');
    this.assignmentsService.saveDraft(
      item.assignment.id,
      this.facade.currentStudent().id,
      this.answerControl.value,
      this.attachments(),
      this.questionAnswers()
    );
  }

  protected startResubmit(): void {
    const item = this.assignmentItem();
    if (!item?.submission) return;
    this.inlineError.set('');
    this.attachmentError.set('');
    this.answerControl.setValue(item.submission.answerText);
    this.attachments.set([...item.submission.attachments]);
    this.questionAnswers.set({ ...(item.submission.questionAnswers ?? {}) });
    this.isEditingResubmit.set(true);
  }

  protected cancelResubmit(): void {
    this.inlineError.set('');
    this.attachmentError.set('');
    this.isEditingResubmit.set(false);
  }

  protected requestSubmit(): void {
    this.inlineError.set('');
    if (this.answerControl.value.trim().length < 20 && this.answeredQuestionsCount() < 5) {
      this.inlineError.set(
        'Please answer at least 5 worksheet questions or write at least 20 characters in the summary notes before submitting.'
      );
      return;
    }
    if (this.isSubmissionBlocked()) {
      this.inlineError.set('Late submissions are blocked for this assignment.');
      return;
    }
    this.isConfirmOpen.set(true);
  }

  protected confirmSubmit(): void {
    const item = this.assignmentItem();
    if (!item) return;

    const result = this.assignmentsService.submitWork(
      item.assignment.id,
      this.facade.currentStudent().id,
      this.answerControl.value,
      this.attachments(),
      this.questionAnswers()
    );
    this.isConfirmOpen.set(false);
    if (!result.success) {
      this.inlineError.set(result.error || 'Unable to submit assignment.');
      return;
    }
    this.isEditingResubmit.set(false);
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
      minute: '2-digit',
    }).format(d);
  }

  protected navigateBack(): void {
    this.router.navigate(['/student/assignments']);
  }
}
