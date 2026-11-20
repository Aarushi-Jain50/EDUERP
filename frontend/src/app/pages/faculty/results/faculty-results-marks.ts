import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { StatusBadge } from '../../../components/shared/status-badge';
import { StudentsService } from '../../../services/students.service';
import { ResultsService, ResultStatus } from '../../../services/results.service';
import { QuestionPaperService } from '../../../services/question-paper.service';
import { getGrade } from '../../../utils/grade-scale.helper';
import { exportToPdf } from '../../../utils/export.helper';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';

interface StudentMarkRow {
  studentId: string;
  name: string;
  enrollmentNo: string;
  marks: number | null;
  remarks: string;
}

@Component({
  selector: 'app-faculty-results-marks',
  imports: [RouterLink, MatIconModule, PageHeader, StatStrip, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-24">
      <app-page-header
        title="Marks Entry & Result Approval"
        subtitle="Enter student examination scores, import evaluated answer sheet marks, and submit official results for Examination Cell approval."
        [actionLabel]="isLoaded() && selectedExam() ? 'Export Grade Sheet PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportGradeSheetPdf()"
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Filter Bar -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div class="space-y-1.5">
          <label for="res-exam" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Examination <span class="text-rose-500">*</span></label>
          <select
            id="res-exam"
            [value]="selectedExamId()"
            (change)="onExamChange($event)"
            class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">Select Exam</option>
            @for (ex of facultyExams(); track ex.id) {
              <option [value]="ex.id">{{ ex.title }} - {{ ex.subjectName }} (Max: {{ ex.maxMarks }})</option>
            }
          </select>
        </div>

        <div class="space-y-1.5">
          <label for="res-section" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Section <span class="text-rose-500">*</span></label>
          <select
            id="res-section"
            [value]="selectedSection()"
            (change)="onSectionChange($event)"
            class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="Section A">Section A</option>
            <option value="Section B">Section B</option>
            <option value="ALL">All Sections</option>
          </select>
        </div>

        <div>
          <button
            type="button"
            (click)="loadMarksTable()"
            class="w-full h-10 bg-[#6D42E8] hover:bg-[#5b34cc] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="text-sm shrink-0">analytics</mat-icon>
            <span>Load Marks Entry</span>
          </button>
        </div>
      </div>

      @if (isLoaded() && selectedExam(); as ex) {
        <!-- Approval Workflow Status Banner -->
        <div
          class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          [class]="bannerClass()"
        >
          <div class="flex items-start sm:items-center gap-2.5 min-w-0">
            <mat-icon class="text-base shrink-0 mt-0.5 sm:mt-0">{{ bannerIcon() }}</mat-icon>
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold">Workflow Status:</span>
                <app-status-badge [status]="examApprovalStatus()" />
              </div>
              <p class="text-[11px] opacity-90">{{ bannerSubtitle() }}</p>
              @if (latestApprovalNote()) {
                <p class="text-[11px] font-semibold mt-1">
                  Note: "{{ latestApprovalNote() }}"
                </p>
              }
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            @if (!isLocked() && evaluatedSheetsForExam().length > 0) {
              <button
                type="button"
                (click)="importEvaluatedSheets()"
                class="px-3 py-1.5 rounded-xl bg-white border border-purple-300 text-[#6D42E8] hover:bg-purple-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <mat-icon class="text-sm">fact_check</mat-icon>
                <span>Import Answer Sheet Scores ({{ evaluatedSheetsForExam().length }})</span>
              </button>
            }
            <a
              routerLink="/faculty/answer-sheets"
              class="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-300 text-slate-700 hover:border-[#6D42E8] hover:text-[#6D42E8] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
            >
              <mat-icon class="text-sm">description</mat-icon>
              <span>Answer Sheets</span>
            </a>
          </div>
        </div>

        <!-- Marks Table / Mobile Cards -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-extrabold text-slate-900 text-sm">Marks Entry Register — {{ ex.title }} ({{ ex.subjectName }})</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Passing Marks: <strong>{{ ex.passingMarks }}</strong> / Max Marks: <strong>{{ ex.maxMarks }}</strong>
              </p>
            </div>
            <div class="text-xs font-bold text-slate-600 whitespace-nowrap shrink-0">
              Roster: {{ marksRows().length }} Students
            </div>
          </div>

          <!-- Phone Card List (< sm) -->
          <div class="sm:hidden divide-y divide-slate-100">
            @for (row of marksRows(); track row.studentId) {
              @let pct = row.marks !== null ? Math.round((row.marks / ex.maxMarks) * 100) : 0;
              @let gradeInfo = getGrade(pct);
              @let isPass = row.marks !== null && row.marks >= ex.passingMarks;

              <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-xs">{{ row.name }}</p>
                    <p class="font-mono text-[11px] text-slate-500 mt-0.5">{{ row.enrollmentNo }}</p>
                  </div>
                  @if (row.marks !== null) {
                    <span [class]="isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'" class="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase whitespace-nowrap shrink-0">
                      {{ isPass ? 'Pass' : 'Fail' }}
                    </span>
                  } @else {
                    <span class="text-[11px] text-slate-400 italic shrink-0">Not Graded</span>
                  }
                </div>

                <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-medium text-slate-500">Score / {{ ex.maxMarks }}:</span>
                    @if (!isLocked()) {
                      <input
                        type="number"
                        [max]="ex.maxMarks"
                        min="0"
                        [value]="row.marks ?? ''"
                        (input)="updateMarks(row.studentId, $event, ex.maxMarks)"
                        aria-label="Marks obtained"
                        class="w-20 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-[#6D42E8]"
                      />
                    } @else {
                      <span class="font-black text-slate-900 text-xs">{{ row.marks !== null ? row.marks : 'AB' }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs font-bold text-slate-700 tabular-nums">{{ row.marks !== null ? pct + '%' : '-' }}</span>
                    <span class="px-2 py-0.5 rounded bg-purple-50 text-[#6D42E8] font-black text-xs">
                      {{ row.marks !== null ? gradeInfo.grade : '-' }}
                    </span>
                  </div>
                </div>

                @if (!isLocked()) {
                  <input
                    type="text"
                    [value]="row.remarks"
                    (input)="updateRemarks(row.studentId, $event)"
                    placeholder="Evaluator remarks..."
                    class="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#6D42E8]"
                  />
                }
              </div>
            } @empty {
              <div class="p-8 text-center text-xs text-slate-400 italic">No students found in this section for {{ ex.courseName }}.</div>
            }
          </div>

          <!-- Tablet/Desktop Table (sm+) -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Student Name</th>
                  <th class="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Enrollment No</th>
                  <th class="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Marks (Max {{ ex.maxMarks }})</th>
                  <th class="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">% / Grade</th>
                  <th class="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Remarks</th>
                  <th class="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Standing</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (row of marksRows(); track row.studentId) {
                  @let pct = row.marks !== null ? Math.round((row.marks / ex.maxMarks) * 100) : 0;
                  @let gradeInfo = getGrade(pct);
                  @let isPass = row.marks !== null && row.marks >= ex.passingMarks;

                  <tr class="hover:bg-slate-50/50">
                    <td class="px-5 py-3.5 font-bold text-slate-900">{{ row.name }}</td>
                    <td class="px-5 py-3.5 font-mono text-slate-600">{{ row.enrollmentNo }}</td>
                    <td class="px-5 py-3.5 text-center">
                      @if (!isLocked()) {
                        <input
                          type="number"
                          [max]="ex.maxMarks"
                          min="0"
                          [value]="row.marks ?? ''"
                          (input)="updateMarks(row.studentId, $event, ex.maxMarks)"
                          aria-label="Marks obtained"
                          class="w-20 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-[#6D42E8]"
                        />
                      } @else {
                        <span class="font-black text-slate-900">{{ row.marks !== null ? row.marks : 'AB' }}</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-center tabular-nums">
                      <span class="font-bold text-slate-700 mr-1.5">{{ row.marks !== null ? pct + '%' : '-' }}</span>
                      <span class="px-2 py-0.5 rounded bg-purple-50 text-[#6D42E8] font-black text-xs">
                        {{ row.marks !== null ? gradeInfo.grade : '-' }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      @if (!isLocked()) {
                        <input
                          type="text"
                          [value]="row.remarks"
                          (input)="updateRemarks(row.studentId, $event)"
                          placeholder="Add remark..."
                          class="w-full min-w-[140px] h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#6D42E8]"
                        />
                      } @else {
                        <span class="text-slate-600">{{ row.remarks || '—' }}</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      @if (row.marks !== null) {
                        <span [class]="isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'" class="px-2.5 py-1 rounded-full font-black text-[10px] uppercase">
                          {{ isPass ? 'Pass' : 'Fail' }}
                        </span>
                      } @else {
                        <span class="text-slate-400 italic">Not Graded</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-6 py-10 text-center text-xs text-slate-400 italic">
                      No students matched this course and section.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Sticky Action Bar -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 z-20 shadow-lg">
            <span class="text-xs text-slate-600 font-medium">
              All marks validated (0–{{ ex.maxMarks }}) and routed to the Examination Cell for official approval before publishing.
            </span>
            @if (!isLocked()) {
              <div class="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  (click)="saveDraft()"
                  class="px-4 sm:px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  (click)="openSubmitModal()"
                  class="bg-[#6D42E8] hover:bg-[#5b34cc] text-white px-4 sm:px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <mat-icon class="text-sm shrink-0">send</mat-icon>
                  <span>Submit for Approval</span>
                </button>
              </div>
            } @else {
              <span
                class="text-xs font-bold px-4 py-2 rounded-xl border self-start sm:self-auto whitespace-nowrap"
                [class]="examApprovalStatus() === 'Published'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-[#6D42E8] bg-purple-50 border-purple-200'"
              >
                {{ examApprovalStatus() === 'Published' ? 'Approved & Published' : 'Awaiting Examination Cell Approval' }}
              </span>
            }
          </div>
        </div>
      } @else {
        <div class="p-8 sm:p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <mat-icon class="text-4xl text-slate-300 mb-2">grade</mat-icon>
          <p class="font-bold text-sm text-slate-700">Select an examination and section above to load the marks entry register.</p>
        </div>
      }

      <!-- Submit for Approval Modal -->
      @if (isSubmitModalOpen() && selectedExam(); as ex) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="submit-approval-title">
          <button
            type="button"
            aria-label="Close confirmation dialog"
            (click)="isSubmitModalOpen.set(false)"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0"
          ></button>
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 border border-[#E2E8F0] space-y-4">
            <div class="flex items-center gap-2.5 text-[#6D42E8]">
              <mat-icon class="text-xl">fact_check</mat-icon>
              <h3 id="submit-approval-title" class="text-base font-bold text-slate-900">Submit Results for Approval?</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Submitting <strong>{{ ex.title }} ({{ ex.subjectName }})</strong> locks marks from further edits and routes them to the Examination Cell / Admin Portal for verification and publishing.
            </p>
            <div class="space-y-1.5">
              <label for="approval-note" class="text-xs font-semibold text-slate-800">Submission Note (Optional)</label>
              <textarea
                id="approval-note"
                rows="2"
                [value]="submissionNote()"
                (input)="onSubmissionNoteInput($event)"
                placeholder="e.g. Verified all practical & theory totals against answer sheets."
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#6D42E8]"
              ></textarea>
            </div>
            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="isSubmitModalOpen.set(false)"
                class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="confirmSubmitForApproval()"
                class="bg-[#6D42E8] hover:bg-[#5b34cc] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <mat-icon class="text-sm">send</mat-icon>
                <span>Submit for Approval</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyResultsMarksPage {
  protected readonly facade = inject(FacultyPortalFacade);
  private readonly studentsService = inject(StudentsService);
  private readonly resultsService = inject(ResultsService);
  private readonly qpService = inject(QuestionPaperService);

  protected readonly selectedExamId = signal<string>('');
  protected readonly selectedSection = signal<string>('Section A');
  protected readonly isLoaded = signal<boolean>(false);
  protected readonly marksRows = signal<StudentMarkRow[]>([]);
  protected readonly isSubmitModalOpen = signal<boolean>(false);
  protected readonly submissionNote = signal<string>('');

  protected readonly facultyExams = this.facade.facultyExams;

  protected readonly selectedExam = computed(() =>
    this.facultyExams().find(e => e.id === this.selectedExamId())
  );

  protected readonly examApprovalStatus = computed<ResultStatus | 'Not Entered'>(() => {
    const id = this.selectedExamId();
    if (!id) return 'Not Entered';
    return this.resultsService.getExamApprovalStatus(id);
  });

  protected readonly latestApprovalNote = computed(() => {
    const id = this.selectedExamId();
    if (!id) return '';
    return this.resultsService.getResultsByExam(id).find(r => r.approvalNote)?.approvalNote || '';
  });

  protected readonly isLocked = computed(() => {
    const st = this.examApprovalStatus();
    return st === 'Submitted for Approval' || st === 'Published' || st === 'Approved';
  });

  protected readonly evaluatedSheetsForExam = computed(() => {
    const id = this.selectedExamId();
    if (!id) return [];
    return this.qpService
      .answerSheets()
      .filter(s => s.examId === id && s.status === 'Evaluated' && s.totalMarksAwarded !== null);
  });

  protected readonly bannerClass = computed(() => {
    switch (this.examApprovalStatus()) {
      case 'Published':
      case 'Approved':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'Submitted for Approval':
        return 'bg-purple-50 border-purple-200 text-[#172554]';
      case 'Revision Requested':
        return 'bg-rose-50 border-rose-200 text-rose-900';
      default:
        return 'bg-amber-50 border-amber-200 text-amber-900';
    }
  });

  protected readonly bannerIcon = computed(() => {
    switch (this.examApprovalStatus()) {
      case 'Published':
      case 'Approved':
        return 'verified';
      case 'Submitted for Approval':
        return 'hourglass_top';
      case 'Revision Requested':
        return 'assignment_return';
      default:
        return 'edit_note';
    }
  });

  protected readonly bannerSubtitle = computed(() => {
    switch (this.examApprovalStatus()) {
      case 'Published':
      case 'Approved':
        return 'Approved by Examination Cell and published to Student & Parent portals (Read-only).';
      case 'Submitted for Approval':
        return 'Marks submitted and locked while awaiting Examination Cell / Admin verification.';
      case 'Revision Requested':
        return 'Examination Cell requested corrections. Update scores below and resubmit for approval.';
      default:
        return 'Draft mode (editable). Save draft or submit to Examination Cell for approval.';
    }
  });

  protected onExamChange(event: Event): void {
    this.selectedExamId.set((event.target as HTMLSelectElement).value);
    this.isLoaded.set(false);
  }

  protected onSectionChange(event: Event): void {
    this.selectedSection.set((event.target as HTMLSelectElement).value);
    this.isLoaded.set(false);
  }

  protected onSubmissionNoteInput(event: Event): void {
    this.submissionNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected loadMarksTable(): void {
    const exam = this.selectedExam();
    if (!exam) {
      this.studentsService.showToast('error', 'Please select an examination.');
      return;
    }

    const sec = this.selectedSection();
    const existingResults = this.resultsService.getResultsByExam(exam.id);
    const resultByStudent = new Map(existingResults.map(r => [r.studentId, r]));

    const cohort = this.studentsService
      .students()
      .filter(
        s =>
          s.status === 'Active' &&
          s.courseId === exam.courseId &&
          s.semester === exam.semester &&
          (sec === 'ALL' || s.section === sec)
      );

    const rows: StudentMarkRow[] = cohort.map((s, idx) => {
      const saved = resultByStudent.get(s.id);
      return {
        studentId: s.id,
        name: s.name,
        enrollmentNo: s.enrollmentNo,
        marks: saved
          ? saved.marksObtained
          : Math.min(exam.maxMarks, Math.max(exam.passingMarks, Math.round(exam.maxMarks * (0.7 + ((idx * 3) % 25) / 100)))),
        remarks: saved?.remarks || ''
      };
    });

    this.marksRows.set(rows);
    this.isLoaded.set(true);
  }

  protected importEvaluatedSheets(): void {
    const sheets = this.evaluatedSheetsForExam();
    if (sheets.length === 0) return;
    const byStudent = new Map(sheets.map(s => [s.studentId, s]));

    let applied = 0;
    this.marksRows.update(rows =>
      rows.map(r => {
        const sheet = byStudent.get(r.studentId);
        if (!sheet || sheet.totalMarksAwarded === null) return r;
        applied += 1;
        return {
          ...r,
          marks: Math.round(sheet.totalMarksAwarded),
          remarks: sheet.overallFeedback || r.remarks || 'Evaluated via Answer Sheet Evaluator'
        };
      })
    );
    this.qpService.markSheetsSynced(sheets.map(s => s.id));
    this.studentsService.showToast('success', `Imported ${applied} evaluated answer sheet scores into the register.`);
  }

  protected updateMarks(studentId: string, event: Event, maxMarks: number): void {
    const raw = (event.target as HTMLInputElement).value;
    if (raw === '') {
      this.marksRows.update(rows => rows.map(r => (r.studentId === studentId ? { ...r, marks: null } : r)));
      return;
    }
    const parsed = Math.max(0, Math.min(maxMarks, Number(raw)));
    this.marksRows.update(rows =>
      rows.map(r => (r.studentId === studentId ? { ...r, marks: Number.isNaN(parsed) ? 0 : parsed } : r))
    );
  }

  protected updateRemarks(studentId: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.marksRows.update(rows =>
      rows.map(r => (r.studentId === studentId ? { ...r, remarks: val } : r))
    );
  }

  private persistScores(): string | null {
    const exam = this.selectedExam();
    if (!exam) return null;
    const payload = this.marksRows()
      .filter(r => r.marks !== null)
      .map(r => ({
        studentId: r.studentId,
        marks: r.marks!,
        remarks: r.remarks || (r.marks! >= exam.passingMarks ? 'Satisfactory' : 'Needs improvement')
      }));
    if (payload.length === 0) {
      this.studentsService.showToast('warning', 'Please enter marks for at least one student.');
      return null;
    }
    this.resultsService.saveResults(exam.id, payload);
    return exam.id;
  }

  protected saveDraft(): void {
    this.persistScores();
  }

  protected openSubmitModal(): void {
    const validCount = this.marksRows().filter(r => r.marks !== null).length;
    if (validCount === 0) {
      this.studentsService.showToast('warning', 'Enter marks for at least one student before submitting.');
      return;
    }
    this.submissionNote.set('');
    this.isSubmitModalOpen.set(true);
  }

  protected confirmSubmitForApproval(): void {
    const examId = this.persistScores();
    if (!examId) return;
    this.resultsService.submitForApproval(
      examId,
      this.facade.currentFaculty().name,
      this.submissionNote()
    );
    this.isSubmitModalOpen.set(false);
  }

  protected exportGradeSheetPdf(): void {
    const ex = this.selectedExam();
    if (!ex) return;
    const cols = ['Enrollment No', 'Student Name', 'Marks Obtained', 'Max Marks', '%', 'Grade', 'Result'];
    const rows = this.marksRows().map(r => {
      const pct = r.marks !== null ? Math.round((r.marks / ex.maxMarks) * 100) : 0;
      const grade = r.marks !== null ? getGrade(pct).grade : '-';
      const standing = r.marks !== null ? (r.marks >= ex.passingMarks ? 'Pass' : 'Fail') : 'Absent';
      return [
        r.enrollmentNo,
        r.name,
        r.marks !== null ? r.marks : 'AB',
        ex.maxMarks,
        r.marks !== null ? `${pct}%` : '-',
        grade,
        standing
      ];
    });

    exportToPdf(
      `Examination Grade Sheet — ${ex.title}`,
      cols,
      rows,
      `${ex.subjectName.toLowerCase().replace(/\s+/g, '-')}-grade-sheet`,
      [
        `Subject: ${ex.subjectName} | Program: ${ex.courseName} · ${ex.semester} · ${this.selectedSection()}`,
        `Faculty: ${this.facade.currentFaculty().name} | Passing: ${ex.passingMarks}/${ex.maxMarks} | Status: ${this.examApprovalStatus()}`
      ]
    );
  }

  protected readonly stats = computed<StatItem[]>(() => {
    const examIds = new Set(this.facultyExams().map(e => e.id));
    const relevantResults = this.resultsService.results().filter(r => examIds.has(r.examId));
    const published = relevantResults.filter(r => r.status === 'Published');
    const pendingApproval = relevantResults.filter(r => r.status === 'Submitted for Approval').length;
    const avgPct =
      published.length > 0
        ? Math.round(
            published.reduce((acc, r) => acc + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0) /
              published.length
          )
        : 0;

    return [
      { label: 'Mapped Exams', value: this.facultyExams().length, icon: 'grading', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Pending Approval', value: pendingApproval, icon: 'hourglass_top', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'Avg Published Score', value: `${avgPct}%`, icon: 'verified', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' }
    ];
  });

  protected getGrade(pct: number) {
    return getGrade(pct);
  }

  protected Math = Math;
}
