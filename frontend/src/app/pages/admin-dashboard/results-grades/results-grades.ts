import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ResultRecord, ResultsService } from '../../../services/results.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { StudentsService } from '../../../services/students.service';
import { CurrentUserService } from '../../../services/current-user.service';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-results-grades-page',
  imports: [CommonModule, MatIconModule, PageHeader, StatStrip, DataToolbar, DataTable, FormDrawer],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Results, Grades & Moderation"
        subtitle="Enter marks, review faculty grade batches, enforce moderation locks, inspect grade distribution, and issue transcripts."
        actionLabel="Enter / Edit Marks"
        actionIcon="edit_note"
        (actionClicked)="openMarking()"
      />

      <app-stat-strip [items]="stats()" />

      <!-- Live Analytics & Grade Distribution Strip -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900">
              {{ selectedExam() === 'All' ? 'Institutional Result Distribution' : 'Exam Performance & Grade Breakdown' }}
            </h3>
            <p class="text-xs text-slate-500">
              Pass Rate: <strong>{{ summary().passPercentage }}%</strong> ({{ summary().passCount }} Pass / {{ summary().failCount }} Fail) ·
              Avg Score: <strong>{{ summary().avgPercentage }}%</strong> · Highest: <strong>{{ summary().highestScore }}/{{ summary().maxMarks }}</strong>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            @if (selectedExam() !== 'All' && resultsForExam().length > 0) {
              <button
                type="button"
                (click)="toggleModerationLock()"
                [class]="summary().isLocked ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'"
                class="h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">{{ summary().isLocked ? 'lock' : 'lock_open' }}</mat-icon>
                {{ summary().isLocked ? 'Moderation Locked' : 'Lock Results' }}
              </button>
            }
            <button
              type="button"
              (click)="exportResultsExcel()"
              class="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">table_view</mat-icon>
              Excel
            </button>
            <button
              type="button"
              (click)="exportResultsPdf()"
              class="h-9 px-3.5 rounded-xl bg-[#6D42E8] hover:bg-[#5b35c9] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">picture_as_pdf</mat-icon>
              Gazette PDF
            </button>
          </div>
        </div>

        <div class="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
          @for (g of gradeKeys; track g) {
            <div class="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-center">
              <div class="text-[11px] font-bold text-slate-500">{{ g }}</div>
              <div class="text-sm font-black text-slate-900">{{ summary().gradeDistribution[g] || 0 }}</div>
            </div>
          }
        </div>
      </div>

      <!-- Pending Faculty Approval Queue -->
      @if (pendingApprovals().length > 0) {
        <div class="bg-purple-50/80 border border-purple-200 rounded-xl p-4 sm:p-5 space-y-3">
          <div class="flex items-center gap-2">
            <mat-icon class="text-[#6D42E8]">fact_check</mat-icon>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Pending Faculty Result Approvals ({{ pendingApprovals().length }})</h3>
              <p class="text-xs text-slate-600">Review marks submitted by faculty before publishing to student &amp; parent portals.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (batch of pendingApprovals(); track batch.examId) {
              <div class="bg-white rounded-xl border border-purple-200 p-4 flex flex-col justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-xs text-slate-900">{{ batch.examTitle }} — {{ batch.subjectName }}</span>
                    <span class="px-2 py-0.5 rounded-md bg-purple-50 text-[#6D42E8] text-[11px] font-bold">{{ batch.count }} Students</span>
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Submitted by <strong>{{ batch.submittedBy }}</strong> · Avg Score: <strong>{{ batch.avgPct }}%</strong>
                  </p>
                  @if (batch.note) {
                    <p class="text-[11px] text-slate-600 italic">"{{ batch.note }}"</p>
                  }
                </div>
                <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    (click)="selectedExam.set(batch.examId)"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Inspect Marks
                  </button>
                  <button
                    type="button"
                    (click)="openRevisionModal(batch.examId)"
                    class="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                  >
                    Request Revision
                  </button>
                  <button
                    type="button"
                    (click)="approveBatch(batch.examId)"
                    class="px-3.5 py-1.5 rounded-lg bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-bold cursor-pointer"
                  >
                    Approve &amp; Publish
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <app-data-toolbar
        [filter1Value]="selectedExam()"
        [filter1Options]="examOptions()"
        (filter1Change)="selectedExam.set($event)"
        searchPlaceholder="Search by student name or roll no..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <app-data-table
          [columns]="columns"
          [data]="filteredResults()"
          idKey="id"
          [hideEdit]="true"
          [hideDelete]="true"
          [customActions]="rowActions"
          (viewClicked)="downloadStudentTranscript($event)"
          (customActionClicked)="onRowAction($event)"
          emptyIcon="grade"
          emptyTitle="No results found"
          emptyMessage="Select an exam to inspect grades or record new marks."
        />

        @if (selectedExam() !== 'All' && resultsForExam().length > 0 && resultsForExam()[0].status !== 'Published') {
          <div class="p-4 bg-amber-50 border-t border-amber-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-amber-800 text-xs font-medium">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">info</mat-icon>
              <span>Current status: <strong>{{ resultsForExam()[0].status }}</strong> — awaiting publication to students.</span>
            </div>
            <div class="flex items-center gap-2">
              @if (resultsForExam()[0].status === 'Submitted for Approval') {
                <button type="button" (click)="openRevisionModal(selectedExam())" class="px-3.5 py-2 rounded-lg border border-rose-200 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 cursor-pointer">
                  Request Revision
                </button>
              }
              <button type="button" (click)="publish()" class="bg-[#6D42E8] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#5b35c9] transition-colors cursor-pointer">
                Approve &amp; Publish Results
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Revision Reason Modal -->
      @if (revisionExamId()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close modal" (click)="revisionExamId.set('')" class="fixed inset-0 bg-black/50 w-full h-full border-0"></button>
          <div class="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md z-10 border border-slate-200 space-y-4">
            <h3 class="text-base font-bold text-slate-900">Return Marks for Revision</h3>
            <p class="text-xs text-slate-600">Provide remarks explaining which scores need verification before publishing.</p>
            <textarea
              rows="3"
              [value]="revisionReason()"
              (input)="onRevisionReasonInput($event)"
              placeholder="e.g. Please double-check Section B practical totals."
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#6D42E8]"
            ></textarea>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" (click)="revisionExamId.set('')" class="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer">Cancel</button>
              <button type="button" (click)="confirmRevision()" class="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer">Return to Faculty</button>
            </div>
          </div>
        </div>
      }

      <!-- Mark Entry Drawer -->
      <app-form-drawer
        [isOpen]="isMarkingOpen()"
        title="Record Examination Marks"
        subtitle="Enter marks obtained by each student for the selected examination."
        saveLabel="Save Marks"
        widthClass="max-w-xl"
        (closed)="isMarkingOpen.set(false)"
        (saved)="saveMarks()"
      >
        <div class="space-y-6 pt-2">
          <div class="space-y-1.5">
            <label for="res-exam" class="text-xs font-semibold text-slate-800">Select Examination <span class="text-red-500">*</span></label>
            <select
              id="res-exam"
              [value]="markingExamId()"
              (change)="onExamChange($event)"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            >
              <option value="">Select Exam</option>
              @for (e of allExams(); track e.id) {
                <option [value]="e.id">{{ e.title }} ({{ e.subjectName }}) — {{ e.status }}</option>
              }
            </select>
          </div>

          @if (markingExamId()) {
            <div class="border rounded-xl overflow-hidden divide-y divide-slate-100">
              <div class="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                <span>Student</span>
                <span>Marks (Max: {{ maxMarks() }})</span>
              </div>
              @for (m of markingRows(); track m.studentId) {
                <div class="p-3.5 flex items-center justify-between gap-4">
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-slate-900">{{ m.name }}</span>
                    <span class="text-[10px] font-mono text-slate-500">{{ m.rollNo }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      [value]="m.marks"
                      min="0"
                      [max]="maxMarks()"
                      (input)="onMarksInput(m.studentId, $event)"
                      class="w-20 h-9 px-2 text-center bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#6D42E8]"
                    />
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="py-12 text-center text-slate-400">
              <mat-icon class="!text-[36px] !w-[36px] !h-[36px] mb-2 opacity-30">assignment_turned_in</mat-icon>
              <p class="text-xs">Select an examination above to load enrolled candidates.</p>
            </div>
          }
        </div>
      </app-form-drawer>
    </div>
  `
})
export class ResultsGradesPage {
  protected readonly resultsService = inject(ResultsService);
  protected readonly examService = inject(ExaminationsService);
  protected readonly studentsService = inject(StudentsService);
  private readonly userService = inject(CurrentUserService);

  protected readonly searchQuery = signal('');
  protected readonly selectedExam = signal('All');
  protected readonly isMarkingOpen = signal(false);
  protected readonly revisionExamId = signal('');
  protected readonly revisionReason = signal('');

  protected readonly markingExamId = signal('');
  protected readonly markingRows = signal<{ studentId: string; name: string; rollNo: string; marks: number; remarks: string }[]>([]);
  protected readonly gradeKeys = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'] as const;

  protected readonly allExams = computed(() => this.examService.exams());

  protected readonly maxMarks = computed(() => this.examService.getById(this.markingExamId())?.maxMarks || 100);

  protected readonly summary = computed(() => this.resultsService.getExamSummary(this.selectedExam()));

  protected readonly pendingApprovals = computed(() => {
    const all = this.resultsService.results().filter(r => r.status === 'Submitted for Approval');
    const byExam = new Map<string, typeof all>();
    for (const r of all) {
      const list = byExam.get(r.examId) || [];
      list.push(r);
      byExam.set(r.examId, list);
    }

    const batches: {
      examId: string;
      examTitle: string;
      subjectName: string;
      submittedBy: string;
      note: string;
      count: number;
      avgPct: number;
    }[] = [];

    for (const [examId, list] of byExam.entries()) {
      const ex = this.examService.getById(examId);
      const avgPct = Math.round(
        list.reduce((acc, r) => acc + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0), 0) / list.length
      );
      batches.push({
        examId,
        examTitle: ex?.title || 'Examination',
        subjectName: ex?.subjectName || 'Subject',
        submittedBy: list[0]?.submittedBy || 'Faculty Member',
        note: list[0]?.approvalNote || '',
        count: list.length,
        avgPct
      });
    }
    return batches;
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const published = this.resultsService.publishedCount();
    const pending = this.pendingApprovals().length;
    const topper = this.resultsService.toppers()[0];
    return [
      { label: 'Published Results', value: published, icon: 'analytics', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Pending Approvals', value: pending, icon: 'fact_check', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' },
      { label: 'Pass Percentage', value: `${this.summary().passPercentage}%`, icon: 'verified', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Top Scorer', value: topper ? topper.studentName : 'N/A', icon: 'emoji_events', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  protected readonly examOptions = computed<FilterOption[]>(() => [
    { label: 'Exam: All', value: 'All' },
    ...this.examService.exams().map(e => ({ label: e.title, value: e.id }))
  ]);

  protected readonly resultsForExam = computed(() => {
    if (this.selectedExam() === 'All') return this.resultsService.results();
    return this.resultsService.getResultsByExam(this.selectedExam());
  });

  protected readonly filteredResults = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.resultsForExam().filter(
      r => !q || r.studentName.toLowerCase().includes(q) || r.enrollmentNo.toLowerCase().includes(q)
    );
  });

  protected readonly columns: TableColumn[] = [
    { key: 'enrollmentNo', header: 'Roll No', isMono: true },
    { key: 'studentName', header: 'Student', isBold: true },
    { key: 'marksObtained', header: 'Marks' },
    { key: 'maxMarks', header: 'Max' },
    { key: 'grade', header: 'Grade', isBadge: true },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly rowActions: TableCustomAction<ResultRecord>[] = [
    { id: 'transcript', label: 'Download Transcript PDF', icon: 'picture_as_pdf' }
  ];

  openMarking(): void {
    this.markingExamId.set('');
    this.markingRows.set([]);
    this.isMarkingOpen.set(true);
  }

  onExamChange(event: Event): void {
    const examId = (event.target as HTMLSelectElement).value;
    this.markingExamId.set(examId);
    const exam = this.examService.getById(examId);
    if (!exam) {
      this.markingRows.set([]);
      return;
    }

    const existing = new Map(this.resultsService.getResultsByExam(examId).map(r => [r.studentId, r]));
    const students = this.studentsService.students().filter(
      s => s.courseId === exam.courseId && s.semester === exam.semester && s.status !== 'Inactive'
    );

    this.markingRows.set(
      students.map(s => {
        const prev = existing.get(s.id);
        return {
          studentId: s.id,
          name: s.name,
          rollNo: s.enrollmentNo,
          marks: prev ? prev.marksObtained : 0,
          remarks: prev ? prev.remarks : ''
        };
      })
    );
  }

  onMarksInput(studentId: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const bounded = Number.isFinite(val) ? Math.max(0, Math.min(this.maxMarks(), val)) : 0;
    this.markingRows.update(list =>
      list.map(m => (m.studentId === studentId ? { ...m, marks: bounded } : m))
    );
  }

  saveMarks(): void {
    if (!this.markingExamId()) return;
    this.resultsService.saveResults(this.markingExamId(), this.markingRows());
    this.isMarkingOpen.set(false);
  }

  approveBatch(examId: string): void {
    const reviewer = this.userService.userEmail() || 'Examination Cell';
    this.resultsService.approveAndPublishResults(examId, reviewer);
  }

  openRevisionModal(examId: string): void {
    this.revisionReason.set('');
    this.revisionExamId.set(examId);
  }

  onRevisionReasonInput(event: Event): void {
    this.revisionReason.set((event.target as HTMLTextAreaElement).value);
  }

  confirmRevision(): void {
    const examId = this.revisionExamId();
    if (!examId) return;
    const reviewer = this.userService.userEmail() || 'Examination Cell';
    this.resultsService.returnResultsForRevision(examId, reviewer, this.revisionReason());
    this.revisionExamId.set('');
  }

  publish(): void {
    if (this.selectedExam() !== 'All') {
      this.approveBatch(this.selectedExam());
    }
  }

  toggleModerationLock(): void {
    const examId = this.selectedExam();
    if (examId === 'All') return;
    const reviewer = this.userService.userEmail() || 'Examination Cell';
    this.resultsService.toggleModerationLock(examId, reviewer);
  }

  onRowAction(ev: { actionId: string; row: ResultRecord }): void {
    if (ev.actionId === 'transcript') {
      this.downloadStudentTranscript(ev.row);
    }
  }

  downloadStudentTranscript(row: ResultRecord): void {
    const allStudentResults = this.resultsService.results().filter(
      r => r.studentId === row.studentId && r.status === 'Published'
    );
    const cgpaInfo = this.resultsService.getStudentCgpaSummary(row.studentId);
    const cols = ['Exam', 'Marks', 'Max', 'Grade', 'Remarks'];
    const rows = allStudentResults.map(r => [
      this.examService.getById(r.examId)?.title || r.examId,
      r.marksObtained,
      r.maxMarks,
      r.grade,
      r.remarks
    ]);
    exportToPdf(
      `Academic Grade Transcript: ${row.studentName}`,
      cols,
      rows,
      `transcript-${row.enrollmentNo}`,
      [`Enrollment: ${row.enrollmentNo}`, `Published Exams: ${cgpaInfo.examsCount} · GPA/CGPA: ${cgpaInfo.cgpa} (${cgpaInfo.avgPct}%)`]
    );
  }

  exportResultsExcel(): void {
    const rows = this.filteredResults().map(r => ({
      RollNo: r.enrollmentNo,
      Student: r.studentName,
      Exam: this.examService.getById(r.examId)?.title || r.examId,
      Marks: r.marksObtained,
      MaxMarks: r.maxMarks,
      Grade: r.grade,
      Status: r.status,
      Locked: r.locked ? 'Yes' : 'No',
      Remarks: r.remarks
    }));
    exportToExcel(rows, 'eduerp-exam-results');
  }

  exportResultsPdf(): void {
    const cols = ['Roll No', 'Student Name', 'Exam', 'Marks', 'Max', 'Grade', 'Status'];
    const rows = this.filteredResults().map(r => [
      r.enrollmentNo,
      r.studentName,
      this.examService.getById(r.examId)?.title || r.examId,
      r.marksObtained,
      r.maxMarks,
      r.grade,
      r.status
    ]);
    exportToPdf(
      'Institutional Result Gazette',
      cols,
      rows,
      'eduerp-result-gazette',
      [`Pass Rate: ${this.summary().passPercentage}% · Avg Score: ${this.summary().avgPercentage}%`]
    );
  }
}
