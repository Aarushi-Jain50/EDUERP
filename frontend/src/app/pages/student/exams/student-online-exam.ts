import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { getOnlineExamQuestions, OnlineExamQuestion } from '../../../data/exam-questions';
import { ExamLockAwareComponent } from '../../../guards/exam-portal.guard';
import { ExamSecurityService } from '../../../services/exam-security.service';
import { ExamAttemptRecord, StudentFirebaseService } from '../../../services/student-firebase.service';
import { exportToPdf } from '../../../utils/export.helper';
import { StudentPortalFacade } from '../shared/student-portal.facade';

const MAX_PROCTOR_VIOLATIONS = 3;

@Component({
  selector: 'app-student-online-exam',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
    '(window:blur)': 'onWindowBlur()',
    '(copy)': 'blockClipboard($event)',
    '(cut)': 'blockClipboard($event)',
    '(paste)': 'blockClipboard($event)',
    '(contextmenu)': 'blockClipboard($event)',
  },
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-12 min-w-0 select-none">
      @if (examItem(); as item) {
        <!-- Top Protected Proctoring Header -->
        <header class="bg-[#0F172A] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-3">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold whitespace-nowrap">
                  <mat-icon class="text-xs">verified_user</mat-icon>
                  <span>Protected Proctored Exam</span>
                </span>
                <span class="font-mono text-xs text-indigo-300 font-semibold">{{ item.subjectCode }}</span>
                <span aria-hidden="true" class="text-slate-500">·</span>
                <span class="text-xs text-slate-300">{{ item.exam.mode }} Mode</span>
              </div>
              <h1 class="text-base sm:text-xl font-bold tracking-tight truncate">
                {{ item.exam.title }} — {{ item.exam.subjectName }}
              </h1>
              <p class="text-[11px] text-slate-300">
                Candidate: <strong class="text-white">{{ facade.currentStudent().name }}</strong>
                ({{ facade.currentStudent().enrollmentNo }})
                <span aria-hidden="true"> · </span>
                Max Marks: {{ item.exam.maxMarks }}
              </p>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap shrink-0">
              @if (!isSubmitted()) {
                <!-- Violation Counter -->
                <div
                  class="px-3 py-2 rounded-xl border text-xs font-semibold tabular-nums flex items-center gap-1.5 whitespace-nowrap"
                  [class]="violationsCount() > 0
                    ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                    : 'bg-white/10 border-white/15 text-slate-200'"
                >
                  <mat-icon class="text-sm">visibility</mat-icon>
                  <span>Focus Alerts: {{ violationsCount() }}/{{ maxViolations }}</span>
                </div>

                <!-- Live Countdown -->
                <div
                  class="px-3.5 py-2 rounded-xl border text-xs font-bold tabular-nums flex items-center gap-1.5 whitespace-nowrap"
                  [class]="secondsRemaining() <= 300
                    ? 'bg-rose-600 text-white border-rose-400'
                    : 'bg-indigo-600/80 text-white border-indigo-400/40'"
                >
                  <mat-icon class="text-sm">timer</mat-icon>
                  <span>{{ formattedCountdown() }}</span>
                </div>

                <button
                  type="button"
                  (click)="toggleFullscreen()"
                  class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <mat-icon class="text-sm">{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                  <span>{{ isFullscreen() ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
                </button>
              } @else {
                <a
                  routerLink="/student/exams"
                  class="px-4 py-2 rounded-xl bg-white text-[#172554] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-100 whitespace-nowrap"
                >
                  <mat-icon class="text-sm">arrow_back</mat-icon>
                  <span>Back to Exams Portal</span>
                </a>
              }
            </div>
          </div>

          @if (latestWarning()) {
            <div class="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs text-rose-100 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <mat-icon class="text-base text-rose-300 shrink-0">gpp_maybe</mat-icon>
                <span>{{ latestWarning() }}</span>
              </div>
              <button
                type="button"
                aria-label="Dismiss security alert"
                (click)="latestWarning.set(null)"
                class="text-rose-200 hover:text-white cursor-pointer shrink-0"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>
          }
        </header>

        @if (!isSubmitted()) {
          <!-- Active Online Assessment Workspace -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <!-- Left Navigation & Integrity Panel -->
            <aside class="lg:col-span-4 space-y-4">
              <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-4">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-sm font-bold text-[#172554]">Question Palette</h2>
                  <span class="text-xs font-semibold text-[#6D42E8] tabular-nums">
                    {{ answeredCount() }}/{{ questions().length }} Answered
                  </span>
                </div>

                <div class="grid grid-cols-5 gap-2">
                  @for (q of questions(); track q.id; let idx = $index) {
                    <button
                      type="button"
                      (click)="currentIndex.set(idx)"
                      class="h-9 rounded-xl border text-xs font-bold tabular-nums transition-colors cursor-pointer relative"
                      [class]="questionTileClass(q.id, idx)"
                    >
                      {{ q.number }}
                      @if (flaggedIds()[q.id]) {
                        <span class="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5"></span>
                      }
                    </button>
                  }
                </div>

                <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-xs bg-emerald-600"></span> Answered
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-xs bg-amber-500"></span> Flagged
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-xs bg-slate-200"></span> Unanswered
                  </span>
                </div>
              </div>

              <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-3">
                <div class="flex items-center gap-2 text-xs font-bold text-[#172554]">
                  <mat-icon class="text-base text-[#6D42E8]">shield</mat-icon>
                  <span>Active Integrity Controls</span>
                </div>
                <ul class="space-y-1.5 text-[11px] text-[#64748B]">
                  <li>· Tab switches and focus losses are logged to your exam audit record.</li>
                  <li>· Copy, cut, paste, and context menus are disabled during the session.</li>
                  <li>· Reaching {{ maxViolations }} focus alerts automatically locks and submits your paper.</li>
                </ul>
                <div class="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2 text-[11px]">
                  <span class="text-[#64748B]">Auto-save status:</span>
                  <span class="font-semibold text-emerald-700">{{ saveStatusLabel() }}</span>
                </div>
              </div>
            </aside>

            <!-- Active Question Card -->
            @if (activeQuestion(); as q) {
              <section class="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold tabular-nums">
                      Question {{ q.number }} of {{ questions().length }}
                    </span>
                    <span class="text-xs font-semibold text-[#64748B]">{{ q.topic }}</span>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <span class="text-xs font-semibold text-[#172554] tabular-nums">{{ q.marks }} Marks</span>
                  </div>

                  <button
                    type="button"
                    (click)="toggleFlag(q.id)"
                    class="px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    [class]="flaggedIds()[q.id]
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-slate-50 border-[#E2E8F0] text-[#64748B] hover:text-[#172554]'"
                  >
                    <mat-icon class="text-sm">{{ flaggedIds()[q.id] ? 'flag' : 'outlined_flag' }}</mat-icon>
                    <span>{{ flaggedIds()[q.id] ? 'Flagged for Review' : 'Flag for Review' }}</span>
                  </button>
                </div>

                <h2 class="text-base font-bold text-[#172554] leading-snug">
                  {{ q.prompt }}
                </h2>

                @if (q.kind === 'mcq' && q.options) {
                  <div class="space-y-2.5">
                    @for (opt of q.options; track opt; let optIdx = $index) {
                      <button
                        type="button"
                        (click)="selectAnswer(q.id, opt)"
                        class="w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3"
                        [class]="answers()[q.id] === opt
                          ? 'bg-purple-50/80 border-[#6D42E8] ring-1 ring-[#6D42E8]/40'
                          : 'bg-slate-50/70 border-[#E2E8F0] hover:border-[#6D42E8]/50'"
                      >
                        <span
                          class="w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                          [class]="answers()[q.id] === opt
                            ? 'bg-[#6D42E8] text-white border-[#6D42E8]'
                            : 'bg-white text-[#64748B] border-slate-300'"
                        >
                          {{ optionLetter(optIdx) }}
                        </span>
                        <span class="text-[13px] text-[#172554] font-medium leading-relaxed">{{ opt }}</span>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="space-y-1.5">
                    <label [for]="'ans-' + q.id" class="text-xs font-semibold text-[#172554]">
                      Your Analytical Response
                    </label>
                    <textarea
                      [id]="'ans-' + q.id"
                      rows="6"
                      [value]="answers()[q.id] || ''"
                      (input)="onShortAnswerInput(q.id, $event)"
                      placeholder="Write a concise, technically accurate answer..."
                      class="w-full p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-xl text-[13px] text-[#172554] focus:bg-white focus:outline-none focus:border-[#6D42E8] select-text"
                    ></textarea>
                  </div>
                }

                <div class="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      [disabled]="currentIndex() === 0"
                      (click)="prevQuestion()"
                      class="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-slate-50 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      [disabled]="currentIndex() >= questions().length - 1"
                      (click)="nextQuestion()"
                      class="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-slate-50 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      Next Question
                    </button>
                    @if (answers()[q.id]) {
                      <button
                        type="button"
                        (click)="clearAnswer(q.id)"
                        class="px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-rose-600 cursor-pointer whitespace-nowrap"
                      >
                        Clear
                      </button>
                    }
                  </div>

                  <div class="flex items-center gap-2.5">
                    <button
                      type="button"
                      (click)="saveDraftNow()"
                      class="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#172554] cursor-pointer whitespace-nowrap"
                    >
                      Save Progress
                    </button>
                    <button
                      type="button"
                      (click)="isSubmitConfirmOpen.set(true)"
                      class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      <mat-icon class="text-sm">lock</mat-icon>
                      <span>Finish &amp; Submit Exam</span>
                    </button>
                  </div>
                </div>
              </section>
            }
          </div>
        } @else if (attempt(); as lockedAttempt) {
          <!-- Post-Submission Immutable Verification Receipt -->
          <section class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 max-w-2xl mx-auto space-y-5">
            <div class="flex items-start gap-3.5 pb-4 border-b border-[#E2E8F0]">
              <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <mat-icon class="text-xl">verified</mat-icon>
              </div>
              <div class="space-y-1">
                <h2 class="text-lg font-bold text-[#172554]">Examination Submitted &amp; Locked</h2>
                <p class="text-xs text-[#64748B]">
                  Your responses have been permanently sealed under proctored integrity controls. Further edits are blocked.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Verification Hash</p>
                <p class="font-mono font-bold text-[#6D42E8] mt-0.5">{{ lockedAttempt.verificationHash }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Responses Locked</p>
                <p class="font-bold text-[#172554] mt-0.5 tabular-nums">{{ lockedAttempt.answersCount }} / {{ questions().length }} Questions</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Submitted At</p>
                <p class="font-semibold text-[#172554] mt-0.5">{{ formatDateTime(lockedAttempt.submittedAt) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Proctoring Focus Alerts</p>
                <p class="font-bold mt-0.5 tabular-nums" [class]="lockedAttempt.violationsCount > 0 ? 'text-amber-700' : 'text-emerald-700'">
                  {{ lockedAttempt.violationsCount }} logged
                </p>
              </div>
              <div class="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Result Announcement Schedule</p>
                <p class="font-semibold text-[#6D42E8] mt-0.5">
                  Expected on {{ item.resultAnnouncementDate }} at {{ item.resultAnnouncementTime }} — viewable in the Results tab only.
                </p>
              </div>
            </div>

            @if (lockedAttempt.autoSubmitReason) {
              <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Auto-submission trigger: <strong>{{ lockedAttempt.autoSubmitReason }}</strong>
              </div>
            }

            <div class="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                (click)="downloadReceiptPdf(lockedAttempt, item.exam.subjectName)"
                class="px-4 py-2 rounded-xl border border-[#6D42E8]/30 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                <span>Download Submission Receipt PDF</span>
              </button>
              <a
                routerLink="/student/exams"
                class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Return to Exams Portal</span>
              </a>
            </div>
          </section>
        }
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 text-center max-w-lg mx-auto space-y-3">
          <mat-icon class="text-4xl text-slate-400">lock</mat-icon>
          <h1 class="text-base font-bold text-[#172554]">Examination Unavailable</h1>
          <p class="text-xs text-[#64748B]">
            This exam session could not be located or is restricted to Offline examination hall attendance.
          </p>
          <a
            routerLink="/student/exams"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-accent text-white text-xs font-bold"
          >
            Back to Protected Exams Portal
          </a>
        </div>
      }

      <!-- Final Submit Confirmation Modal -->
      @if (isSubmitConfirmOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="submit-exam-title">
          <button
            type="button"
            aria-label="Close confirmation dialog"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0"
            (click)="isSubmitConfirmOpen.set(false)"
          ></button>
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 border border-[#E2E8F0] space-y-4">
            <h3 id="submit-exam-title" class="text-base font-bold text-[#172554]">Submit &amp; Lock Online Exam?</h3>
            <p class="text-xs text-[#64748B] leading-relaxed">
              You have answered <strong class="text-[#172554]">{{ answeredCount() }} of {{ questions().length }}</strong> questions.
              Once submitted, your answers are permanently locked and cannot be reopened.
            </p>
            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                (click)="isSubmitConfirmOpen.set(false)"
                class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer"
              >
                Continue Exam
              </button>
              <button
                type="button"
                (click)="confirmFinalSubmit()"
                class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                Submit &amp; Lock
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Leave Exam Protection Modal -->
      @if (isLeaveModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="leave-exam-title">
          <button
            type="button"
            aria-label="Stay in exam"
            class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"
            (click)="resolveLeavePrompt(false)"
          ></button>
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 border border-[#E2E8F0] space-y-4">
            <div class="flex items-center gap-2.5 text-rose-700">
              <mat-icon class="text-xl">warning</mat-icon>
              <h3 id="leave-exam-title" class="text-base font-bold">Protected Exam Session Active</h3>
            </div>
            <p class="text-xs text-[#64748B] leading-relaxed">
              Leaving before submitting will keep your current progress in draft and record an exit event in your exam session log. Stay in the exam room or submit first.
            </p>
            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                (click)="resolveLeavePrompt(false)"
                class="gradient-accent text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Stay in Exam
              </button>
              <button
                type="button"
                (click)="resolveLeavePrompt(true)"
                class="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 cursor-pointer"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentOnlineExam implements OnInit, ExamLockAwareComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly facade = inject(StudentPortalFacade);
  private readonly examSecurity = inject(ExamSecurityService);
  private readonly firebaseService = inject(StudentFirebaseService);

  protected readonly maxViolations = MAX_PROCTOR_VIOLATIONS;
  private readonly examIdParam = toSignal(
    this.route.paramMap.pipe(map(p => p.get('examId') || '')),
    { initialValue: '' }
  );

  protected readonly examItem = computed(() => {
    const id = this.examIdParam();
    const groups = this.facade.studentExams();
    const found =
      groups.upcoming.find(i => i.exam.id === id) ||
      groups.completed.find(i => i.exam.id === id);
    if (!found || found.exam.mode === 'Offline') return null;
    return found;
  });

  protected readonly questions = computed<OnlineExamQuestion[]>(() => {
    const item = this.examItem();
    if (!item) return [];
    return getOnlineExamQuestions(item.exam.subjectId, item.exam.id);
  });

  protected readonly currentIndex = signal<number>(0);
  protected readonly answers = signal<Record<string, string>>({});
  protected readonly flaggedIds = signal<Record<string, boolean>>({});
  protected readonly attempt = signal<ExamAttemptRecord | null>(null);
  protected readonly secondsRemaining = signal<number>(3600);
  protected readonly isFullscreen = signal<boolean>(false);
  protected readonly latestWarning = signal<string | null>(null);
  protected readonly saveStatusLabel = signal<string>('Synced');
  protected readonly isSubmitConfirmOpen = signal<boolean>(false);
  protected readonly isLeaveModalOpen = signal<boolean>(false);

  private timerId: ReturnType<typeof setInterval> | null = null;
  private pendingLeaveResolver: ((allow: boolean) => void) | null = null;
  private lastBlurRecordedAt = 0;

  protected readonly activeQuestion = computed(
    () => this.questions()[this.currentIndex()] ?? null
  );

  protected readonly answeredCount = computed(
    () => Object.values(this.answers()).filter(v => v.trim().length > 0).length
  );

  protected readonly violationsCount = computed(() => this.attempt()?.violationsCount ?? 0);
  protected readonly isSubmitted = computed(() => this.attempt()?.status === 'Submitted');

  protected readonly formattedCountdown = computed(() => {
    const total = Math.max(0, this.secondsRemaining());
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const item = this.examItem();
    if (!item) return;

    if (!this.examSecurity.isPortalUnlocked()) {
      void this.router.navigate(['/student/exams'], { queryParams: { locked: '1' } });
      return;
    }

    void this.initAttempt(item);

    this.destroyRef.onDestroy(() => {
      if (this.timerId) clearInterval(this.timerId);
      this.examSecurity.setExamInProgress(null);
      if (this.pendingLeaveResolver) {
        this.pendingLeaveResolver(false);
        this.pendingLeaveResolver = null;
      }
    });
  }

  private async initAttempt(item: NonNullable<ReturnType<typeof this.examItem>>): Promise<void> {
    const existing = this.firebaseService.getExamAttempt(item.exam.id);
    const rec =
      existing ||
      (await this.firebaseService.startOnlineExam({
        examId: item.exam.id,
        examTitle: item.exam.title,
        subjectCode: item.subjectCode,
        mode: item.exam.mode,
      }));

    this.attempt.set(rec);
    this.answers.set({ ...rec.answers });

    if (rec.status === 'In Progress') {
      this.examSecurity.setExamInProgress(item.exam.id);
      const startedMs = new Date(rec.startedAt).getTime();
      const elapsedSecs = Number.isNaN(startedMs) ? 0 : Math.floor((Date.now() - startedMs) / 1000);
      const initialSeconds = Math.max(60, item.exam.duration * 60 - elapsedSecs);
      this.secondsRemaining.set(initialSeconds);

      this.timerId = setInterval(() => {
        if (this.isSubmitted()) {
          if (this.timerId) clearInterval(this.timerId);
          return;
        }
        const next = this.secondsRemaining() - 1;
        this.secondsRemaining.set(Math.max(0, next));
        if (next <= 0) {
          if (this.timerId) clearInterval(this.timerId);
          void this.autoSubmit('Time window expired');
        }
      }, 1000);
    }
  }

  protected selectAnswer(questionId: string, value: string): void {
    if (this.isSubmitted()) return;
    this.answers.update(curr => ({ ...curr, [questionId]: value }));
    void this.saveDraftNow();
  }

  protected onShortAnswerInput(questionId: string, event: Event): void {
    if (this.isSubmitted()) return;
    const val = (event.target as HTMLTextAreaElement).value;
    this.answers.update(curr => ({ ...curr, [questionId]: val }));
    this.saveStatusLabel.set('Unsaved edits...');
  }

  protected clearAnswer(questionId: string): void {
    if (this.isSubmitted()) return;
    this.answers.update(curr => {
      const next = { ...curr };
      delete next[questionId];
      return next;
    });
    void this.saveDraftNow();
  }

  protected toggleFlag(questionId: string): void {
    this.flaggedIds.update(curr => ({ ...curr, [questionId]: !curr[questionId] }));
  }

  protected prevQuestion(): void {
    this.currentIndex.update(i => Math.max(0, i - 1));
  }

  protected nextQuestion(): void {
    const maxIdx = Math.max(0, this.questions().length - 1);
    this.currentIndex.update(i => Math.min(maxIdx, i + 1));
  }

  protected async saveDraftNow(): Promise<void> {
    const att = this.attempt();
    if (!att || att.status === 'Submitted') return;
    this.saveStatusLabel.set('Saving...');
    await this.firebaseService.saveOnlineExamProgress(att.id, this.answers());
    const refreshed = this.firebaseService.getExamAttempt(att.examId);
    if (refreshed) this.attempt.set(refreshed);
    this.saveStatusLabel.set('Synced');
  }

  protected async confirmFinalSubmit(): Promise<void> {
    this.isSubmitConfirmOpen.set(false);
    const att = this.attempt();
    if (!att) return;
    const finalized = await this.firebaseService.submitOnlineExam(att.id, this.answers());
    if (finalized) {
      this.attempt.set(finalized);
      this.examSecurity.setExamInProgress(null);
      if (this.timerId) clearInterval(this.timerId);
    }
  }

  private async autoSubmit(reason: string): Promise<void> {
    const att = this.attempt();
    if (!att || att.status === 'Submitted') return;
    const finalized = await this.firebaseService.submitOnlineExam(att.id, this.answers(), reason);
    if (finalized) {
      this.attempt.set(finalized);
      this.examSecurity.setExamInProgress(null);
    }
  }

  protected onVisibilityChange(): void {
    if (!isPlatformBrowser(this.platformId) || this.isSubmitted()) return;
    if (document.hidden) {
      void this.registerViolation('Tab switch / hidden window detected');
    }
  }

  protected onWindowBlur(): void {
    if (!isPlatformBrowser(this.platformId) || this.isSubmitted()) return;
    const now = Date.now();
    if (now - this.lastBlurRecordedAt < 3000) return;
    this.lastBlurRecordedAt = now;
    void this.registerViolation('Exam window lost focus');
  }

  private async registerViolation(reason: string): Promise<void> {
    const att = this.attempt();
    if (!att || att.status === 'Submitted') return;
    const count = await this.firebaseService.recordOnlineExamViolation(att.id, reason);
    const refreshed = this.firebaseService.getExamAttempt(att.examId);
    if (refreshed) this.attempt.set(refreshed);

    this.latestWarning.set(
      `Proctoring Alert (${count}/${MAX_PROCTOR_VIOLATIONS}): ${reason}. Repeated alerts auto-submit your exam.`
    );

    if (count >= MAX_PROCTOR_VIOLATIONS) {
      await this.autoSubmit('Maximum focus violations reached');
    }
  }

  protected blockClipboard(event: Event): void {
    if (this.isSubmitted()) return;
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'TEXTAREA' && event.type === 'contextmenu') {
      event.preventDefault();
      return;
    }
    if (event.type === 'copy' || event.type === 'cut' || event.type === 'paste' || event.type === 'contextmenu') {
      event.preventDefault();
      this.latestWarning.set('Clipboard and context-menu actions are blocked during protected exams.');
    }
  }

  protected async toggleFullscreen(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        this.isFullscreen.set(true);
      } else {
        await document.exitFullscreen();
        this.isFullscreen.set(false);
      }
    } catch {
      this.latestWarning.set('Fullscreen mode was declined by the browser; focus monitoring remains active.');
    }
  }

  canLeaveExam(): boolean | Promise<boolean> {
    if (this.isSubmitted() || !this.attempt()) {
      return true;
    }
    this.isLeaveModalOpen.set(true);
    return new Promise<boolean>(resolve => {
      this.pendingLeaveResolver = resolve;
    });
  }

  protected resolveLeavePrompt(allow: boolean): void {
    this.isLeaveModalOpen.set(false);
    if (allow) {
      void this.saveDraftNow();
      this.examSecurity.setExamInProgress(null);
    }
    this.pendingLeaveResolver?.(allow);
    this.pendingLeaveResolver = null;
  }

  protected questionTileClass(questionId: string, idx: number): string {
    const isActive = this.currentIndex() === idx;
    const hasAns = (this.answers()[questionId] || '').trim().length > 0;
    const ring = isActive ? 'ring-2 ring-[#6D42E8] ring-offset-1 ' : '';
    if (hasAns) return `${ring}bg-emerald-600 text-white border-emerald-600`;
    if (this.flaggedIds()[questionId]) return `${ring}bg-amber-50 text-amber-800 border-amber-300`;
    return `${ring}bg-slate-50 text-[#172554] border-[#E2E8F0] hover:border-[#6D42E8]`;
  }

  protected optionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  protected formatDateTime(iso: string): string {
    if (!iso) return 'Just now';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  protected downloadReceiptPdf(rec: ExamAttemptRecord, subjectName: string): void {
    const s = this.facade.currentStudent();
    exportToPdf(
      'Online Examination Submission Receipt',
      ['Field', 'Verified Value'],
      [
        ['Student', `${s.name} (${s.enrollmentNo})`],
        ['Subject', `${rec.subjectCode} · ${subjectName}`],
        ['Examination', rec.examTitle],
        ['Delivery Mode', rec.mode],
        ['Questions Answered', `${rec.answersCount} / ${this.questions().length}`],
        ['Verification Hash', rec.verificationHash],
        ['Proctor Alerts Logged', String(rec.violationsCount)],
        ['Submitted At', this.formatDateTime(rec.submittedAt)],
      ],
      `${s.enrollmentNo}-${rec.examId}-receipt`,
      [`Protected Online Assessment Verification · Hash: ${rec.verificationHash}`]
    );
  }
}
