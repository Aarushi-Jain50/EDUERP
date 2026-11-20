import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';
import {
  AnswerSheetQuestionEval,
  ExamAnswerSheet,
  QuestionPaperService
} from '../../../services/question-paper.service';
import { ResultsService } from '../../../services/results.service';
import { StudentsService } from '../../../services/students.service';
import { exportToPdf } from '../../../utils/export.helper';

@Component({
  selector: 'app-faculty-answer-sheets',
  imports: [MatIconModule, PageHeader, StatStrip, FormDrawer, StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-slate-900 text-[13px] pb-16 min-w-0">
      <app-page-header
        title="Exam Answer Sheet Evaluation"
        subtitle="Inspect submitted online & scanned answer sheets question-by-question, assign marks, and sync evaluated scores to the marks register."
        [actionLabel]="evaluatedUnsyncedCount() > 0 ? 'Sync Marks to Register (' + evaluatedUnsyncedCount() + ')' : 'Export Evaluation PDF'"
        [actionIcon]="evaluatedUnsyncedCount() > 0 ? 'sync' : 'picture_as_pdf'"
        (actionClicked)="evaluatedUnsyncedCount() > 0 ? syncAllEvaluatedToResults() : exportEvaluationsPdf()"
      />

      <div class="mb-4">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Filters Toolbar -->
      <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div class="relative lg:col-span-2">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-base">search</mat-icon>
          </span>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Search by student name, roll no, or sheet code..."
            class="w-full h-10 pl-9 pr-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
          />
        </div>

        <select
          [value]="selectedExamId()"
          (change)="onExamFilter($event)"
          aria-label="Filter answer sheets by exam"
          class="h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
        >
          <option value="">All Examinations</option>
          @for (ex of facultyExams(); track ex.id) {
            <option [value]="ex.id">{{ ex.title }} ({{ ex.subjectName }})</option>
          }
        </select>

        <select
          [value]="statusFilter()"
          (change)="onStatusFilter($event)"
          aria-label="Filter answer sheets by evaluation status"
          class="h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
        >
          <option value="All">All Statuses</option>
          <option value="Pending Evaluation">Pending Evaluation</option>
          <option value="Evaluated">Evaluated</option>
        </select>
      </div>

      <!-- Answer Sheets Table / Mobile Cards -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        @if (filteredSheets().length > 0) {
          <!-- Mobile Cards (< sm) -->
          <div class="sm:hidden divide-y divide-slate-200">
            @for (sheet of filteredSheets(); track sheet.id) {
              <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-xs truncate">{{ sheet.studentName }}</p>
                    <p class="font-mono text-[11px] text-slate-500">{{ sheet.enrollmentNo }} · {{ sheet.sheetCode }}</p>
                    <p class="text-[11px] text-slate-600 mt-0.5">{{ sheet.examTitle }} · {{ sheet.subjectName }}</p>
                  </div>
                  <app-status-badge [status]="sheet.status" />
                </div>

                <div class="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span class="text-slate-600">{{ sheet.mode }}</span>
                  <span class="font-bold text-slate-900 tabular-nums">
                    {{ sheet.totalMarksAwarded !== null ? sheet.totalMarksAwarded + ' / ' + sheet.maxMarks : 'Not Graded' }}
                  </span>
                </div>

                <button
                  type="button"
                  (click)="openEvaluateDrawer(sheet)"
                  class="w-full py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  [class]="sheet.status === 'Evaluated'
                    ? 'bg-slate-50 border border-[#E2E8F0] text-slate-800 hover:border-[#6D42E8]'
                    : 'bg-[#6D42E8] text-white hover:bg-[#5b34cc]'"
                >
                  <mat-icon class="text-sm">fact_check</mat-icon>
                  <span>{{ sheet.status === 'Evaluated' ? 'Review Evaluation' : 'Evaluate Answer Sheet' }}</span>
                </button>
              </div>
            }
          </div>

          <!-- Desktop Table (sm+) -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th class="px-5 py-3">Student & Sheet Code</th>
                  <th class="px-5 py-3">Examination & Subject</th>
                  <th class="px-5 py-3">Delivery Mode</th>
                  <th class="px-5 py-3 text-center">Score</th>
                  <th class="px-5 py-3 text-center">Evaluation</th>
                  <th class="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                @for (sheet of filteredSheets(); track sheet.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="px-5 py-3.5">
                      <p class="font-bold text-slate-900">{{ sheet.studentName }}</p>
                      <p class="text-[11px] font-mono text-slate-500">{{ sheet.enrollmentNo }} · {{ sheet.sheetCode }}</p>
                    </td>
                    <td class="px-5 py-3.5">
                      <p class="font-semibold text-slate-900">{{ sheet.examTitle }}</p>
                      <p class="text-[11px] text-slate-500">{{ sheet.subjectName }}</p>
                    </td>
                    <td class="px-5 py-3.5">
                      <app-status-badge [status]="sheet.mode" />
                    </td>
                    <td class="px-5 py-3.5 text-center font-bold tabular-nums">
                      {{ sheet.totalMarksAwarded !== null ? sheet.totalMarksAwarded + ' / ' + sheet.maxMarks : '—' }}
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <div class="inline-flex flex-col items-center gap-1">
                        <app-status-badge [status]="sheet.status" />
                        @if (sheet.syncedToResults) {
                          <span class="text-[10px] font-semibold text-emerald-700">Synced to Register</span>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        (click)="openEvaluateDrawer(sheet)"
                        class="px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        [class]="sheet.status === 'Evaluated'
                          ? 'bg-slate-50 border border-[#E2E8F0] text-slate-800 hover:border-[#6D42E8] hover:text-[#6D42E8]'
                          : 'bg-[#6D42E8] text-white hover:bg-[#5b34cc] shadow-xs'"
                      >
                        <mat-icon class="text-sm">fact_check</mat-icon>
                        <span>{{ sheet.status === 'Evaluated' ? 'Edit Evaluation' : 'Evaluate' }}</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            icon="fact_check"
            title="No answer sheets found"
            message="No submitted online or scanned answer sheets match your filters."
          />
        }
      </div>

      <!-- EVALUATE ANSWER SHEET DRAWER -->
      <app-form-drawer
        [isOpen]="activeSheet() !== null"
        [title]="activeSheet() ? 'Evaluate Sheet: ' + activeSheet()!.studentName : 'Evaluate Sheet'"
        [subtitle]="activeSheet() ? activeSheet()!.examTitle + ' · ' + activeSheet()!.sheetCode + ' · Max ' + activeSheet()!.maxMarks + ' Marks' : ''"
        saveLabel="Save & Sync to Marks Register"
        widthClass="max-w-[660px]"
        (closed)="activeSheet.set(null)"
        (saved)="saveEvaluation(true)"
      >
        @if (activeSheet(); as sheet) {
          <div class="space-y-4 pt-1">
            <!-- Header Bar with Auto-Check MCQs & Live Total -->
            <div class="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-[#172554]">
                  Total Score: <span class="text-[#6D42E8] text-sm tabular-nums">{{ draftTotalMarks() }} / {{ sheet.maxMarks }} Marks</span>
                </p>
                <p class="text-[11px] text-slate-600">
                  {{ sheet.mode }} · Submitted {{ formatDateTime(sheet.submittedAt) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="autoGradeMcqs()"
                  class="px-3 py-1.5 rounded-xl bg-white border border-purple-300 hover:bg-purple-100 text-[#6D42E8] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <mat-icon class="text-sm">bolt</mat-icon>
                  <span>Auto-Check MCQs</span>
                </button>
                <button
                  type="button"
                  (click)="saveEvaluation(false)"
                  class="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </div>

            <!-- Question-by-Question Evaluation List -->
            <div class="space-y-3">
              @for (resp of draftResponses(); track resp.questionId) {
                <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded-md bg-purple-100 text-[#6D42E8] font-bold text-[11px]">
                        Q{{ resp.questionNo }}
                      </span>
                      <span class="text-xs font-semibold text-slate-600">{{ resp.topic }}</span>
                    </div>
                    <span class="text-[11px] font-bold text-slate-700 tabular-nums">Max: {{ resp.maxMarks }}M</span>
                  </div>

                  <p class="text-xs font-bold text-slate-900 leading-snug">{{ resp.prompt }}</p>

                  <div class="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Student Response</span>
                    <p class="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{{ resp.studentAnswer }}</p>
                  </div>

                  @if (resp.correctAnswer) {
                    <p class="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      <strong>Model Key:</strong> {{ resp.correctAnswer }}
                    </p>
                  }

                  <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                    <div class="flex items-center gap-1.5 shrink-0">
                      <label [for]="'eval-q-' + resp.questionId" class="text-[11px] font-semibold text-slate-700">Marks:</label>
                      <input
                        [id]="'eval-q-' + resp.questionId"
                        type="number"
                        min="0"
                        [max]="resp.maxMarks"
                        step="0.5"
                        [value]="resp.marksAwarded ?? ''"
                        (input)="updateQuestionMarks(resp.questionId, $event, resp.maxMarks)"
                        class="w-16 h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-[#6D42E8]"
                      />
                      <button
                        type="button"
                        (click)="setExactQuestionMarks(resp.questionId, resp.maxMarks)"
                        class="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                      >
                        Full
                      </button>
                    </div>

                    <input
                      type="text"
                      [value]="resp.comment || ''"
                      (input)="updateQuestionComment(resp.questionId, $event)"
                      placeholder="Optional evaluator note on this answer..."
                      class="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>
                </div>
              }
            </div>

            <!-- Overall Remarks -->
            <div class="space-y-1.5 pt-2 border-t border-slate-200">
              <label for="sheet-feedback" class="text-xs font-semibold text-[#172554]">Overall Evaluator Feedback</label>
              <textarea
                id="sheet-feedback"
                rows="3"
                [value]="draftOverallFeedback()"
                (input)="onOverallFeedbackInput($event)"
                placeholder="Summarize candidate performance and highlight areas to improve..."
                class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              ></textarea>
            </div>
          </div>
        }
      </app-form-drawer>
    </div>
  `
})
export class FacultyAnswerSheetsPage {
  private readonly router = inject(Router);
  protected readonly facade = inject(FacultyPortalFacade);
  protected readonly qpService = inject(QuestionPaperService);
  private readonly resultsService = inject(ResultsService);
  private readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedExamId = signal<string>('');
  protected readonly statusFilter = signal<string>('All');

  protected readonly activeSheet = signal<ExamAnswerSheet | null>(null);
  protected readonly draftResponses = signal<AnswerSheetQuestionEval[]>([]);
  protected readonly draftOverallFeedback = signal<string>('');

  protected readonly facultyExams = this.facade.facultyExams;

  protected readonly facultySheets = computed(() => {
    const examIds = new Set(this.facultyExams().map(e => e.id));
    const subNames = new Set(this.facade.myClasses().map(c => c.subject.toLowerCase()));
    return this.qpService
      .answerSheets()
      .filter(s => examIds.has(s.examId) || subNames.has(s.subjectName.toLowerCase()));
  });

  protected readonly filteredSheets = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const examId = this.selectedExamId();
    const status = this.statusFilter();

    return this.facultySheets().filter(s => {
      if (examId && s.examId !== examId) return false;
      if (status !== 'All' && s.status !== status) return false;
      if (q) {
        const match =
          s.studentName.toLowerCase().includes(q) ||
          s.enrollmentNo.toLowerCase().includes(q) ||
          s.sheetCode.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  });

  protected readonly evaluatedUnsyncedCount = computed(
    () => this.facultySheets().filter(s => s.status === 'Evaluated' && !s.syncedToResults).length
  );

  protected readonly draftTotalMarks = computed(() => {
    const sheet = this.activeSheet();
    const sum = this.draftResponses().reduce((acc, r) => acc + (Number(r.marksAwarded) || 0), 0);
    const rounded = Math.round(sum * 10) / 10;
    return sheet ? Math.min(sheet.maxMarks, Math.max(0, rounded)) : rounded;
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const sheets = this.facultySheets();
    const pending = sheets.filter(s => s.status === 'Pending Evaluation').length;
    const evaluated = sheets.filter(s => s.status === 'Evaluated').length;
    return [
      {
        label: 'Submitted Sheets',
        value: sheets.length,
        icon: 'description',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Pending Evaluation',
        value: pending,
        icon: 'pending_actions',
        iconColorClass: 'text-amber-600',
        iconBgClass: 'bg-amber-50 border-amber-100'
      },
      {
        label: 'Evaluated Sheets',
        value: evaluated,
        icon: 'verified',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      }
    ];
  });

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
  protected onExamFilter(event: Event): void {
    this.selectedExamId.set((event.target as HTMLSelectElement).value);
  }
  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }
  protected onOverallFeedbackInput(event: Event): void {
    this.draftOverallFeedback.set((event.target as HTMLTextAreaElement).value);
  }

  protected openEvaluateDrawer(sheet: ExamAnswerSheet): void {
    this.activeSheet.set(sheet);
    this.draftResponses.set(sheet.responses.map(r => ({ ...r })));
    this.draftOverallFeedback.set(sheet.overallFeedback || '');
  }

  protected updateQuestionMarks(qId: string, event: Event, maxMarks: number): void {
    const raw = (event.target as HTMLInputElement).value;
    const val = raw === '' ? null : Math.max(0, Math.min(maxMarks, Number(raw)));
    this.draftResponses.update(list =>
      list.map(r => (r.questionId === qId ? { ...r, marksAwarded: val } : r))
    );
  }

  protected setExactQuestionMarks(qId: string, marks: number): void {
    this.draftResponses.update(list =>
      list.map(r => (r.questionId === qId ? { ...r, marksAwarded: marks } : r))
    );
  }

  protected updateQuestionComment(qId: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.draftResponses.update(list =>
      list.map(r => (r.questionId === qId ? { ...r, comment: val } : r))
    );
  }

  protected autoGradeMcqs(): void {
    let checked = 0;
    this.draftResponses.update(list =>
      list.map(r => {
        if (r.kind !== 'mcq' || !r.correctAnswer) return r;
        checked += 1;
        const isCorrect =
          r.studentAnswer.trim().toLowerCase() === r.correctAnswer.trim().toLowerCase();
        return {
          ...r,
          marksAwarded: isCorrect ? r.maxMarks : 0,
          comment: isCorrect ? 'Correct MCQ option' : 'Incorrect option'
        };
      })
    );
    this.studentsService.showToast('info', `Auto-checked ${checked} objective questions.`);
  }

  protected saveEvaluation(andSyncToResults: boolean): void {
    const sheet = this.activeSheet();
    if (!sheet) return;

    const evaluated = this.qpService.evaluateAnswerSheet(
      sheet.id,
      this.draftResponses(),
      this.draftOverallFeedback(),
      this.facade.currentFaculty().name,
      andSyncToResults
    );

    if (andSyncToResults && evaluated) {
      this.pushSheetsIntoResults([evaluated]);
    }
    this.activeSheet.set(null);
  }

  protected syncAllEvaluatedToResults(): void {
    const toSync = this.facultySheets().filter(
      s => s.status === 'Evaluated' && s.totalMarksAwarded !== null
    );
    if (toSync.length === 0) return;

    this.pushSheetsIntoResults(toSync);
    this.qpService.markSheetsSynced(toSync.map(s => s.id));
    void this.router.navigate(['/faculty/results-marks']);
  }

  private pushSheetsIntoResults(sheets: ExamAnswerSheet[]): void {
    const byExam = new Map<string, ExamAnswerSheet[]>();
    for (const s of sheets) {
      const arr = byExam.get(s.examId) || [];
      arr.push(s);
      byExam.set(s.examId, arr);
    }

    for (const [examId, examSheets] of byExam.entries()) {
      const existing = this.resultsService.getResultsByExam(examId);
      const mergedMap = new Map(
        existing.map(r => [
          r.studentId,
          { studentId: r.studentId, marks: r.marksObtained, remarks: r.remarks }
        ])
      );
      for (const s of examSheets) {
        if (s.totalMarksAwarded !== null) {
          mergedMap.set(s.studentId, {
            studentId: s.studentId,
            marks: Math.round(s.totalMarksAwarded),
            remarks: s.overallFeedback || 'Evaluated via Answer Sheet Evaluator'
          });
        }
      }
      this.resultsService.saveResults(examId, Array.from(mergedMap.values()));
    }
  }

  protected formatDateTime(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  protected exportEvaluationsPdf(): void {
    const cols = ['Sheet Code', 'Student', 'Enrollment No', 'Exam', 'Score', 'Status'];
    const rows = this.filteredSheets().map(s => [
      s.sheetCode,
      s.studentName,
      s.enrollmentNo,
      `${s.examTitle} (${s.subjectName})`,
      s.totalMarksAwarded !== null ? `${s.totalMarksAwarded}/${s.maxMarks}` : 'Pending',
      s.status
    ]);
    exportToPdf(
      'Exam Answer Sheet Evaluation Summary',
      cols,
      rows,
      'faculty-answer-sheet-evaluations',
      [`Faculty: ${this.facade.currentFaculty().name} | Total Sheets: ${rows.length}`]
    );
  }
}
