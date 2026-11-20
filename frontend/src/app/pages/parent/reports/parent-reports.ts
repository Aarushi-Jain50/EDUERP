import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ChartCard } from '../../../components/reports/chart-card';
import { EmptyState } from '../../../components/shared/empty-state';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

interface SemesterSummaryRow {
  semester: string;
  examsCount: number;
  passedCount: number;
  avgPct: number;
  sgpa: number;
}

@Component({
  selector: 'app-parent-reports',
  imports: [MatIconModule, BaseChartDirective, PageHeader, ChartCard, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-12 min-w-0">
      <app-page-header
        title="Reports & Analytics"
        [subtitle]="child() ? 'Comprehensive attendance, academic semester comparison, assignment completion, and fee analytics with PDF & Excel exports for ' + child()!.name + '.' : 'Select a linked child to view analytics and export reports.'"
        [actionLabel]="child() ? 'Export Master PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportFullAcademicPdf()"
      />

      @if (snapshot(); as snap) {
        <!-- Top Analytics KPI Grid -->
        <section class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Attendance Rate</p>
              <p
                class="text-2xl font-bold mt-1 tabular-nums"
                [class]="snap.isLowAttendance ? 'text-rose-600' : 'text-[#172554]'"
              >
                {{ snap.overallAttendancePct }}%
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">Threshold {{ snap.attendanceThreshold }}%</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-xl">how_to_reg</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Cumulative CGPA</p>
              <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                {{ snap.cgpa > 0 ? snap.cgpa.toFixed(2) : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">
                Current SGPA: {{ snap.sgpa > 0 ? snap.sgpa.toFixed(2) : 'N/A' }}
              </p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-xl">workspace_premium</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Assignment Rate</p>
              <p class="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{{ assignmentStats().completionPct }}%</p>
              <p class="text-[11px] text-[#64748B] mt-0.5">
                {{ assignmentStats().submitted }} of {{ assignmentStats().total }} completed
              </p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-xl">assignment_turned_in</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Fee Settlement</p>
              <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">{{ feeDetail().paidPercent }}%</p>
              <p class="text-[11px] text-[#64748B] mt-0.5 truncate">
                Due: {{ facade.formatINR(feeDetail().dueAmount) }}
              </p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-xl">account_balance_wallet</mat-icon>
            </div>
          </div>
        </section>

        <!-- Visual Analytics Charts -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-chart-card
            title="Attendance Analytics by Subject"
            [subtitle]="'Recorded attendance percentage against ' + snap.attendanceThreshold + '% requirement'"
            [isEmpty]="snap.subjectAttendances.length === 0"
          >
            <div class="w-full h-full">
              <canvas baseChart [data]="attendanceChartData()" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
          </app-chart-card>

          <app-chart-card
            title="Semester Performance Comparison"
            subtitle="Average examination percentage progression across semesters"
            [isEmpty]="semesterRows().length === 0"
          >
            <div class="w-full h-full">
              <canvas baseChart [data]="semesterChartData()" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
          </app-chart-card>
        </section>

        <!-- Assignment Completion & Fee Summary Cards -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Assignment Completion Statistics -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-[#172554]">Assignment Completion Statistics</h2>
                <p class="text-xs text-[#64748B]">Coursework progress breakdown</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold tabular-nums">
                {{ assignmentStats().completionPct }}% Done
              </span>
            </div>

            <div class="space-y-2">
              <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-[#6D42E8] transition-all"
                  [style.width.%]="assignmentStats().completionPct"
                ></div>
              </div>
              <div class="grid grid-cols-3 gap-3 pt-2 text-center">
                <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <p class="text-lg font-bold text-emerald-700 tabular-nums">{{ assignmentStats().submitted }}</p>
                  <p class="text-[11px] font-semibold text-emerald-800">Submitted</p>
                </div>
                <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <p class="text-lg font-bold text-amber-700 tabular-nums">{{ assignmentStats().pending }}</p>
                  <p class="text-[11px] font-semibold text-amber-800">Pending</p>
                </div>
                <div class="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                  <p class="text-lg font-bold text-rose-700 tabular-nums">{{ assignmentStats().overdue }}</p>
                  <p class="text-[11px] font-semibold text-rose-800">Overdue</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Semester-wise Academic Comparison Summary -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-[#172554]">Semester Comparison Summary</h2>
                <p class="text-xs text-[#64748B]">SGPA, exam count & average percentage per term</p>
              </div>
              <span class="text-xs font-semibold text-[#6D42E8]">CGPA {{ snap.cgpa > 0 ? snap.cgpa.toFixed(2) : 'N/A' }}</span>
            </div>

            @if (semesterRows().length > 0) {
              <div class="space-y-2.5">
                @for (row of semesterRows(); track row.semester) {
                  <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-bold text-[#172554]">{{ row.semester }}</p>
                      <p class="text-[11px] text-[#64748B]">
                        {{ row.passedCount }}/{{ row.examsCount }} subjects passed · Avg {{ row.avgPct }}%
                      </p>
                    </div>
                    <span class="px-3 py-1 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold tabular-nums shrink-0">
                      SGPA {{ row.sgpa.toFixed(2) }}
                    </span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-xs text-[#64748B] py-4 text-center">No published semester results recorded yet.</p>
            }
          </div>
        </section>

        <!-- Report Export Center (PDF & Excel) -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
          <div class="pb-3 border-b border-slate-100">
            <h2 class="text-sm font-bold text-[#172554]">Downloadable Reports Center (PDF & Excel)</h2>
            <p class="text-xs text-[#64748B] mt-0.5">Generate formatted institutional statements and spreadsheets for {{ snap.student.name }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 1. Attendance Report -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Attendance Summary Report</p>
                <p class="text-xs text-[#64748B] mt-0.5">Subject-wise lectures held, attended, % & standing</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportAttendancePdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportAttendanceExcel()"
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">table_view</mat-icon>
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <!-- 2. Academic Performance -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Academic Marksheet & SGPA Report</p>
                <p class="text-xs text-[#64748B] mt-0.5">Published exam marks, grades & semester performance</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportFullAcademicPdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportAcademicExcel()"
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">table_view</mat-icon>
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <!-- 3. Assignment Completion -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Assignment Completion Report</p>
                <p class="text-xs text-[#64748B] mt-0.5">All tasks, due dates, submission status & marks</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportAssignmentsPdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportAssignmentsExcel()"
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">table_view</mat-icon>
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <!-- 4. Fee Payment Statement -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Fee Payment & Installment Statement</p>
                <p class="text-xs text-[#64748B] mt-0.5">Total fee, installments, late fines, paid & balance due</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportFeesPdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportFeesExcel()"
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">table_view</mat-icon>
                  <span>Excel</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      } @else {
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <app-empty-state
            icon="analytics"
            title="No linked child selected"
            message="Select a linked student from My Children to view analytics and export reports."
          />
        </div>
      }
    </div>
  `
})
export class ParentReports {
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly child = this.facade.selectedChild;
  protected readonly snapshot = this.facade.selectedSnapshot;
  protected readonly feeDetail = this.facade.selectedFeeDetail;
  protected readonly publishedResults = this.facade.selectedPublishedResults;
  protected readonly assignments = this.facade.selectedAssignments;

  protected readonly assignmentStats = computed(() => {
    const list = this.assignments();
    const total = list.length;
    const submitted = list.filter(a => a.bucket === 'Submitted').length;
    const pending = list.filter(a => a.bucket === 'Pending').length;
    const overdue = list.filter(a => a.bucket === 'Overdue').length;
    const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, overdue, completionPct };
  });

  protected readonly semesterRows = computed<SemesterSummaryRow[]>(() => {
    const list = this.publishedResults();
    const map = new Map<string, typeof list>();
    for (const item of list) {
      const group = map.get(item.semester) || [];
      group.push(item);
      map.set(item.semester, group);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semester, items]) => {
        const passedCount = items.filter(i => i.passed).length;
        const avgPct = Math.round(items.reduce((acc, i) => acc + i.percentage, 0) / items.length);
        const sgpa = this.facade.computeGpa(items);
        return {
          semester,
          examsCount: items.length,
          passedCount,
          avgPct,
          sgpa
        };
      });
  });

  protected readonly attendanceChartData = computed<ChartData<'bar'>>(() => {
    const subs = this.snapshot()?.subjectAttendances || [];
    return {
      labels: subs.map(s => (s.code || s.name.slice(0, 10))),
      datasets: [
        {
          label: 'Attendance %',
          data: subs.map(s => s.percentage),
          backgroundColor: subs.map(s => (s.isLow ? '#F43F5E' : '#6D42E8')),
          borderRadius: 6
        }
      ]
    };
  });

  protected readonly semesterChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.semesterRows();
    return {
      labels: rows.map(r => r.semester),
      datasets: [
        {
          label: 'Average %',
          data: rows.map(r => r.avgPct),
          backgroundColor: '#4F46E5',
          borderRadius: 6
        }
      ]
    };
  });

  protected readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  };

  protected exportAttendancePdf(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const cols = ['Subject Code', 'Subject Name', 'Held', 'Attended', 'Absent', 'Leave', 'Percentage', 'Standing'];
    const rows = snap.subjectAttendances.map(s => [
      s.code,
      s.name,
      s.held,
      s.attended,
      s.absent,
      s.leave,
      `${s.percentage}%`,
      s.isLow ? 'Low' : 'On Track'
    ]);
    exportToPdf(
      'Student Subject-wise Attendance Report',
      cols,
      rows.length > 0 ? rows : [['-', 'No attendance records found', 0, 0, 0, 0, '0%', '-']],
      `${snap.student.enrollmentNo}-attendance-report`,
      [
        `Student: ${snap.student.name} (${snap.student.enrollmentNo}) | ${snap.student.course} · ${snap.student.semester} · Section ${snap.student.section}`,
        `Overall Attendance: ${snap.overallAttendancePct}% (Minimum Threshold: ${snap.attendanceThreshold}%)`
      ]
    );
  }

  protected exportAttendanceExcel(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const rows = snap.subjectAttendances.map(s => ({
      Student: snap.student.name,
      EnrollmentNo: snap.student.enrollmentNo,
      SubjectCode: s.code,
      SubjectName: s.name,
      ClassesHeld: s.held,
      Attended: s.attended,
      Absent: s.absent,
      Leave: s.leave,
      Percentage: `${s.percentage}%`,
      Standing: s.isLow ? 'Low' : 'On Track'
    }));
    exportToExcel(rows, `${snap.student.enrollmentNo}-attendance-report`);
  }

  protected exportFullAcademicPdf(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const list = this.publishedResults();
    const cols = ['Semester', 'Subject Code', 'Subject', 'Exam', 'Marks', 'Max', '%', 'Grade', 'Result'];
    const rows = list.map(r => [
      r.semester,
      r.subjectCode,
      r.subjectName,
      r.examTitle,
      r.record.marksObtained,
      r.record.maxMarks,
      `${r.percentage}%`,
      r.grade,
      r.passed ? 'Pass' : 'Fail'
    ]);
    exportToPdf(
      'Academic Performance & Consolidated Marksheet Report',
      cols,
      rows.length > 0 ? rows : [['-', '-', 'No published results yet', '-', 0, 0, '0%', '-', '-']],
      `${snap.student.enrollmentNo}-academic-report`,
      [
        `Student: ${snap.student.name} (${snap.student.enrollmentNo}) | ${snap.student.course}`,
        `Current SGPA: ${snap.sgpa > 0 ? snap.sgpa.toFixed(2) : 'N/A'} | Cumulative CGPA: ${snap.cgpa > 0 ? snap.cgpa.toFixed(2) : 'N/A'} | Overall Attendance: ${snap.overallAttendancePct}%`
      ]
    );
  }

  protected exportAcademicExcel(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const rows = this.publishedResults().map(r => ({
      Student: snap.student.name,
      EnrollmentNo: snap.student.enrollmentNo,
      Semester: r.semester,
      SubjectCode: r.subjectCode,
      SubjectName: r.subjectName,
      Examination: r.examTitle,
      ExamDate: r.examDate,
      MarksObtained: r.record.marksObtained,
      MaxMarks: r.record.maxMarks,
      Percentage: `${r.percentage}%`,
      Grade: r.grade,
      Status: r.passed ? 'Pass' : 'Fail'
    }));
    exportToExcel(rows, `${snap.student.enrollmentNo}-academic-results`);
  }

  protected exportAssignmentsPdf(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const cols = ['Subject', 'Title', 'Faculty', 'Due Date', 'Status', 'Marks'];
    const rows = this.assignments().map(a => [
      a.subjectCode,
      a.assignment.title,
      a.facultyName,
      this.facade.formatShortDate(a.assignment.dueDate),
      a.displayStatus,
      a.marksObtained !== undefined ? `${a.marksObtained}/${a.assignment.maxMarks}` : '-'
    ]);
    exportToPdf(
      'Coursework & Assignment Completion Report',
      cols,
      rows.length > 0 ? rows : [['-', 'No assignments assigned', '-', '-', '-', '-']],
      `${snap.student.enrollmentNo}-assignments-report`,
      [
        `Student: ${snap.student.name} (${snap.student.enrollmentNo}) | ${snap.student.course}`,
        `Completed: ${this.assignmentStats().submitted}/${this.assignmentStats().total} (${this.assignmentStats().completionPct}%)`
      ]
    );
  }

  protected exportAssignmentsExcel(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const rows = this.assignments().map(a => ({
      Student: snap.student.name,
      SubjectCode: a.subjectCode,
      Subject: a.assignment.subjectName,
      Title: a.assignment.title,
      Faculty: a.facultyName,
      DueDate: a.assignment.dueDate,
      Status: a.displayStatus,
      MarksObtained: a.marksObtained ?? '-',
      MaxMarks: a.assignment.maxMarks,
      Feedback: a.evaluationFeedback || '-'
    }));
    exportToExcel(rows, `${snap.student.enrollmentNo}-assignments`);
  }

  protected exportFeesPdf(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const fee = this.feeDetail();
    const cols = ['Installment', 'Due Date', 'Amount (INR)', 'Late Fine', 'Paid (INR)', 'Balance (INR)', 'Status'];
    const rows = fee.installmentRows.map(r => [
      r.label,
      this.facade.formatShortDate(r.dueDate),
      r.amount,
      r.lateFine,
      r.paid,
      r.balance,
      r.displayStatus
    ]);
    exportToPdf(
      'Student Fee Ledger & Installment Statement',
      cols,
      rows.length > 0 ? rows : [['-', '-', 0, 0, 0, 0, '-']],
      `${snap.student.enrollmentNo}-fee-statement`,
      [
        `Student: ${snap.student.name} (${snap.student.enrollmentNo}) | Academic Year: ${fee.academicYear}`,
        `Total Fee: INR ${fee.totalFee} | Paid: INR ${fee.paidAmount} | Balance Due: INR ${fee.dueAmount}`
      ]
    );
  }

  protected exportFeesExcel(): void {
    const snap = this.snapshot();
    if (!snap) return;
    const rows = this.feeDetail().installmentRows.map(r => ({
      Student: snap.student.name,
      EnrollmentNo: snap.student.enrollmentNo,
      Installment: r.label,
      DueDate: r.dueDate,
      Amount: r.amount,
      LateFine: r.lateFine,
      Concession: r.concession,
      Paid: r.paid,
      Balance: r.balance,
      Status: r.displayStatus
    }));
    exportToExcel(rows, `${snap.student.enrollmentNo}-fee-statement`);
  }
}
