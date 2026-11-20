import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { ChartCard } from '../../../components/reports/chart-card';
import { EmptyState } from '../../../components/shared/empty-state';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';
import { AcademicService } from '../../../services/academic.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { ResultsService } from '../../../services/results.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { StudentsService } from '../../../services/students.service';
import { getGrade } from '../../../utils/grade-scale.helper';

@Component({
  selector: 'app-faculty-reports',
  imports: [RouterLink, MatIconModule, BaseChartDirective, PageHeader, ChartCard, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-16 min-w-0">
      <app-page-header
        title="Faculty Reports & Analytics"
        [subtitle]="'Class attendance insights, examination score distribution, coursework completion, and downloadable PDF/Excel statements for ' + fac().name + '.'"
        [actionLabel]="classes().length > 0 ? 'Export Master PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="exportAttendanceSummaryPdf()"
      />

      <!-- Top Analytics KPI Grid -->
      <section class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Allocated Classes</p>
            <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">{{ classes().length }}</p>
            <p class="text-[11px] text-[#64748B] mt-0.5">{{ totalWeeklyHours() }} lecture hrs/week</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-xl">class</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Enrolled Students</p>
            <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">{{ students().length }}</p>
            <p class="text-[11px] mt-0.5" [class]="atRiskStudents().length > 0 ? 'text-rose-600 font-semibold' : 'text-[#64748B]'">
              {{ atRiskStudents().length }} flagged at-risk
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-xl">groups</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Class Attendance Avg</p>
            <p
              class="text-2xl font-bold mt-1 tabular-nums"
              [class]="overallAttendanceAvg() < threshold() ? 'text-rose-600' : 'text-emerald-700'"
            >
              {{ overallAttendanceAvg() }}%
            </p>
            <p class="text-[11px] text-[#64748B] mt-0.5">Across {{ sessions().length }} logged sessions</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-xl">how_to_reg</mat-icon>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Pending Evaluations</p>
            <p class="text-2xl font-bold text-[#6D42E8] mt-1 tabular-nums">{{ assignmentTotals().pendingReview }}</p>
            <p class="text-[11px] text-[#64748B] mt-0.5">{{ assignmentTotals().evaluated }} evaluated so far</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <mat-icon class="text-xl">grading</mat-icon>
          </div>
        </div>
      </section>

      @if (classes().length > 0) {
        <!-- Visual Analytics Charts -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-chart-card
            title="Attendance Analytics by Allocated Class"
            [subtitle]="'Recorded average attendance vs ' + threshold() + '% institutional requirement'"
            [isEmpty]="classesWithAttendance().length === 0"
          >
            <div class="w-full h-full">
              <canvas baseChart [data]="attendanceChartData()" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
          </app-chart-card>

          <app-chart-card
            title="Examination Score Average by Subject"
            subtitle="Average recorded percentage across allocated subjects"
            [isEmpty]="classesWithMarks().length === 0"
          >
            <div class="w-full h-full">
              <canvas baseChart [data]="marksChartData()" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
          </app-chart-card>
        </section>

        <!-- Evaluation Funnel & At-Risk Watchlist -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Assignment Evaluation Funnel -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-[#172554]">Assignment Evaluation Funnel</h2>
                <p class="text-xs text-[#64748B]">Submission and grading completion across your subjects</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold tabular-nums">
                {{ evaluationProgressPct() }}% Graded
              </span>
            </div>

            <div class="space-y-3">
              <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-[#6D42E8] transition-all"
                  [style.width.%]="evaluationProgressPct()"
                ></div>
              </div>
              <div class="grid grid-cols-3 gap-3 pt-1 text-center">
                <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <p class="text-lg font-bold text-amber-700 tabular-nums">{{ assignmentTotals().pendingReview }}</p>
                  <p class="text-[11px] font-semibold text-amber-800">Pending Review</p>
                </div>
                <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <p class="text-lg font-bold text-emerald-700 tabular-nums">{{ assignmentTotals().evaluated }}</p>
                  <p class="text-[11px] font-semibold text-emerald-800">Evaluated</p>
                </div>
                <div class="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                  <p class="text-lg font-bold text-rose-700 tabular-nums">{{ assignmentTotals().pending }}</p>
                  <p class="text-[11px] font-semibold text-rose-800">Not Submitted</p>
                </div>
              </div>
            </div>
          </div>

          <!-- At-Risk Student Watchlist -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-sm font-bold text-[#172554]">At-Risk Students Watchlist</h2>
                <p class="text-xs text-[#64748B]">Students below {{ threshold() }}% attendance or 40% exam marks</p>
              </div>
              <a routerLink="/faculty/my-students" class="text-xs font-semibold text-[#6D42E8] hover:underline whitespace-nowrap">
                Full Roster →
              </a>
            </div>

            @if (atRiskStudents().length > 0) {
              <div class="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                @for (stu of atRiskStudents().slice(0, 5); track stu.student.id) {
                  <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-bold text-[#172554] truncate">{{ stu.student.name }}</p>
                      <p class="text-[11px] text-[#64748B] truncate">
                        {{ stu.student.enrollmentNo }} · {{ stu.subjectsTaught.join(', ') }}
                      </p>
                    </div>
                    <div class="text-right shrink-0 space-y-0.5">
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold block"
                        [class]="stu.isLowAttendance ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'"
                      >
                        Att: {{ stu.attendancePct }}%
                      </span>
                      <span class="text-[10px] text-[#64748B] block">
                        Marks: {{ stu.avgMarksPct !== null ? stu.avgMarksPct + '%' : 'N/A' }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 font-semibold text-center">
                All enrolled students across your sections meet minimum academic and attendance benchmarks.
              </div>
            }
          </div>
        </section>

        <!-- Downloadable Reports Center (PDF & Excel) -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
          <div class="pb-3 border-b border-slate-100">
            <h2 class="text-sm font-bold text-[#172554]">Downloadable Faculty Reports Center (PDF & Excel)</h2>
            <p class="text-xs text-[#64748B] mt-0.5">Generate formatted institutional statements and spreadsheets for your allocated courses</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 1. Class Attendance Summary -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Class Attendance Summary Report</p>
                <p class="text-xs text-[#64748B] mt-0.5">Session-wise date, subject, present/absent counts & %</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportAttendanceSummaryPdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportAttendanceSummaryExcel()"
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">table_view</mat-icon>
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <!-- 2. Examination Marks & Grade Sheet -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Examination Marks & Grade Sheet</p>
                <p class="text-xs text-[#64748B] mt-0.5">Student scores, percentages, grades & publication status</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportExamMarksPdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportExamMarksExcel()"
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">table_view</mat-icon>
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <!-- 3. Assignment Completion Report -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Assignment Completion & Evaluation</p>
                <p class="text-xs text-[#64748B] mt-0.5">Submission counts, pending reviews & graded percentages</p>
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

            <!-- 4. At-Risk Student Monitoring Roster -->
            <div class="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-[#172554]">Student Standing & At-Risk Roster</p>
                <p class="text-xs text-[#64748B] mt-0.5">Student attendance, exam avg, standing & guardian phone</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  (click)="exportAtRiskPdf()"
                  class="px-3 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  (click)="exportAtRiskExcel()"
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
            title="No allocated classes found"
            message="Subject allocations from Administration are required before generating faculty analytics and exports."
          />
        </div>
      }
    </div>
  `
})
export class FacultyPortalReportsPage {
  private readonly facade = inject(FacultyPortalFacade);
  private readonly academicService = inject(AcademicService);
  private readonly examsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly studentsService = inject(StudentsService);

  protected readonly fac = this.facade.currentFaculty;
  protected readonly classes = this.facade.myClasses;
  protected readonly students = this.facade.myStudents;
  protected readonly sessions = this.facade.facultySessions;
  protected readonly assignmentTotals = this.facade.assignmentTotals;
  protected readonly threshold = this.facade.attendanceThreshold;

  protected readonly totalWeeklyHours = computed(() =>
    this.classes().reduce((acc, c) => acc + c.weeklyHours, 0)
  );

  protected readonly atRiskStudents = computed(() =>
    this.students().filter(s => s.isAtRisk)
  );

  protected readonly classesWithAttendance = computed(() =>
    this.classes().filter(c => c.sessionsCount > 0)
  );

  protected readonly classesWithMarks = computed(() =>
    this.classes().filter(c => c.avgMarksPct !== null)
  );

  protected readonly overallAttendanceAvg = computed(() => {
    const sess = this.sessions();
    if (sess.length === 0) return 0;
    return Math.round(sess.reduce((acc, s) => acc + s.percentage, 0) / sess.length);
  });

  protected readonly evaluationProgressPct = computed(() => {
    const t = this.assignmentTotals();
    const submittedPool = t.evaluated + t.pendingReview;
    if (submittedPool === 0) return 0;
    return Math.round((t.evaluated / submittedPool) * 100);
  });

  protected readonly attendanceChartData = computed<ChartData<'bar'>>(() => {
    const list = this.classesWithAttendance();
    const minReq = this.threshold();
    return {
      labels: list.map(c => `${c.subjectCode} (${c.section.replace('Section ', '')})`),
      datasets: [
        {
          label: 'Attendance %',
          data: list.map(c => c.avgAttendance),
          backgroundColor: list.map(c => (c.avgAttendance < minReq ? '#F43F5E' : '#6D42E8')),
          borderRadius: 6
        }
      ]
    };
  });

  protected readonly marksChartData = computed<ChartData<'bar'>>(() => {
    const list = this.classesWithMarks();
    return {
      labels: list.map(c => `${c.subjectCode} (${c.section.replace('Section ', '')})`),
      datasets: [
        {
          label: 'Avg Score %',
          data: list.map(c => c.avgMarksPct ?? 0),
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

  private buildExamResultRows() {
    const exams = this.facade.facultyExams();
    const examById = new Map(exams.map(e => [e.id, e]));
    const studentById = new Map(this.studentsService.students().map(s => [s.id, s]));
    return this.resultsService
      .results()
      .filter(r => examById.has(r.examId))
      .map(r => {
        const exam = examById.get(r.examId)!;
        const stu = studentById.get(r.studentId);
        const pct = r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
        const grade = r.grade || getGrade(pct).grade;
        return {
          examTitle: exam.title,
          subjectName: exam.subjectName,
          studentName: stu?.name || r.studentName || r.studentId,
          enrollmentNo: stu?.enrollmentNo || '-',
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          percentage: pct,
          grade,
          status: r.status
        };
      });
  }

  private resolveSessionMeta(courseId: string, subjectId: string, sectionId: string) {
    const courseName =
      this.academicService.courses().find(c => c.id === courseId)?.name || courseId;
    const subjectName =
      this.academicService.subjects().find(s => s.id === subjectId)?.name || subjectId;
    const sectionName =
      this.academicService.sections().find(s => s.id === sectionId)?.section ||
      (sectionId === 'sec-1' ? 'Section A' : sectionId === 'sec-2' ? 'Section B' : sectionId);
    return { courseName, subjectName, sectionName };
  }

  protected exportAttendanceSummaryPdf(): void {
    const rows = this.sessions().map(s => {
      const meta = this.resolveSessionMeta(s.courseId, s.subjectId, s.sectionId);
      return [
        this.facade.formatShortDate(s.date),
        meta.subjectName,
        meta.sectionName,
        s.present,
        s.absent,
        s.leave,
        `${s.percentage}%`
      ];
    });
    exportToPdf(
      'Faculty Class Attendance Summary Report',
      ['Date', 'Subject', 'Section', 'Present', 'Absent', 'Leave', 'Attendance %'],
      rows.length > 0 ? rows : [['-', 'No attendance sessions logged yet', '-', 0, 0, 0, '0%']],
      `${this.fac().employeeId}-attendance-summary`,
      [
        `Faculty: ${this.fac().name} (${this.fac().employeeId}) | Department: ${this.fac().department}`,
        `Allocated Classes: ${this.classes().length} | Logged Sessions: ${this.sessions().length} | Overall Average: ${this.overallAttendanceAvg()}%`
      ]
    );
    this.studentsService.showToast('success', 'Attendance summary PDF generated.');
  }

  protected exportAttendanceSummaryExcel(): void {
    const rows: Record<string, string | number>[] = this.sessions().map(s => {
      const meta = this.resolveSessionMeta(s.courseId, s.subjectId, s.sectionId);
      return {
        Date: s.date,
        Course: meta.courseName,
        Subject: meta.subjectName,
        Section: meta.sectionName,
        Present: s.present,
        Absent: s.absent,
        Leave: s.leave,
        TotalStudents: s.total,
        AttendancePct: `${s.percentage}%`
      };
    });
    exportToExcel(
      rows.length > 0 ? rows : [{ Message: 'No attendance sessions recorded yet' }],
      `${this.fac().employeeId}-attendance-summary`
    );
    this.studentsService.showToast('success', 'Attendance summary Excel spreadsheet exported.');
  }

  protected exportExamMarksPdf(): void {
    const list = this.buildExamResultRows();
    const rows = list.map(r => [
      r.examTitle,
      r.subjectName,
      r.studentName,
      r.enrollmentNo,
      r.marksObtained,
      r.maxMarks,
      `${r.percentage}%`,
      r.grade,
      r.status
    ]);
    exportToPdf(
      'Faculty Examination Marks & Grade Sheet',
      ['Examination', 'Subject', 'Student', 'Enrollment No', 'Marks', 'Max', '%', 'Grade', 'Status'],
      rows.length > 0 ? rows : [['-', '-', 'No marks recorded yet', '-', 0, 0, '0%', '-', '-']],
      `${this.fac().employeeId}-marks-grades`,
      [
        `Faculty: ${this.fac().name} (${this.fac().employeeId}) | Department: ${this.fac().department}`,
        `Examinations Covered: ${this.facade.facultyExams().length} | Result Records: ${list.length}`
      ]
    );
    this.studentsService.showToast('success', 'Grade sheet PDF generated.');
  }

  protected exportExamMarksExcel(): void {
    const list = this.buildExamResultRows();
    const rows: Record<string, string | number>[] = list.map(r => ({
      Examination: r.examTitle,
      Subject: r.subjectName,
      Student: r.studentName,
      EnrollmentNo: r.enrollmentNo,
      MarksObtained: r.marksObtained,
      MaxMarks: r.maxMarks,
      Percentage: `${r.percentage}%`,
      Grade: r.grade,
      Status: r.status
    }));
    exportToExcel(
      rows.length > 0 ? rows : [{ Message: 'No marks recorded yet' }],
      `${this.fac().employeeId}-marks-grades`
    );
    this.studentsService.showToast('success', 'Grade sheet Excel spreadsheet exported.');
  }

  protected exportAssignmentsPdf(): void {
    void this.assignmentsService.submissions();
    const list = this.facade.facultyAssignments();
    const rows = list.map(a => {
      const st = this.assignmentsService.getAssignmentStats(a.id);
      return [
        a.title,
        a.subjectName,
        a.sectionName,
        this.facade.formatShortDate(a.dueDate),
        st.total,
        st.submitted + st.late,
        st.evaluated,
        `${st.completionPct}%`
      ];
    });
    exportToPdf(
      'Coursework & Assignment Evaluation Report',
      ['Assignment Title', 'Subject', 'Section', 'Due Date', 'Total', 'Awaiting Review', 'Evaluated', 'Completion %'],
      rows.length > 0 ? rows : [['No assignments found', '-', '-', '-', 0, 0, 0, '0%']],
      `${this.fac().employeeId}-assignments-report`,
      [
        `Faculty: ${this.fac().name} (${this.fac().employeeId})`,
        `Total Assignments: ${list.length} | Pending Review: ${this.assignmentTotals().pendingReview} | Graded: ${this.assignmentTotals().evaluated}`
      ]
    );
    this.studentsService.showToast('success', 'Assignment evaluation PDF generated.');
  }

  protected exportAssignmentsExcel(): void {
    void this.assignmentsService.submissions();
    const list = this.facade.facultyAssignments();
    const rows: Record<string, string | number>[] = list.map(a => {
      const st = this.assignmentsService.getAssignmentStats(a.id);
      return {
        Title: a.title,
        Subject: a.subjectName,
        Section: a.sectionName,
        DueDate: a.dueDate,
        MaxMarks: a.maxMarks,
        TotalStudents: st.total,
        SubmittedCount: st.completedCount,
        AwaitingReview: st.submitted + st.late,
        Evaluated: st.evaluated,
        Pending: st.pending,
        CompletionPct: `${st.completionPct}%`
      };
    });
    exportToExcel(
      rows.length > 0 ? rows : [{ Message: 'No assignments available' }],
      `${this.fac().employeeId}-assignments-report`
    );
    this.studentsService.showToast('success', 'Assignment report Excel spreadsheet exported.');
  }

  protected exportAtRiskPdf(): void {
    const rows = this.students().map(s => [
      s.student.name,
      s.student.enrollmentNo,
      s.subjectsTaught.join(', '),
      `${s.attendancePct}%`,
      s.avgMarksPct !== null ? `${s.avgMarksPct}%` : 'N/A',
      s.guardianName,
      s.guardianPhone,
      s.isAtRisk ? 'At Risk' : 'Normal'
    ]);
    exportToPdf(
      'Student Standing & At-Risk Monitoring Roster',
      ['Student Name', 'Enrollment No', 'Subjects', 'Attendance %', 'Exam Avg', 'Guardian', 'Phone', 'Standing'],
      rows.length > 0 ? rows : [['No enrolled students', '-', '-', '0%', '-', '-', '-', '-']],
      `${this.fac().employeeId}-student-standing`,
      [
        `Faculty: ${this.fac().name} (${this.fac().employeeId}) | Threshold: ${this.threshold()}% Attendance`,
        `Total Students: ${this.students().length} | Flagged At-Risk: ${this.atRiskStudents().length}`
      ]
    );
    this.studentsService.showToast('success', 'Student standing PDF generated.');
  }

  protected exportAtRiskExcel(): void {
    const rows: Record<string, string | number>[] = this.students().map(s => ({
      StudentName: s.student.name,
      EnrollmentNo: s.student.enrollmentNo,
      Course: s.student.course,
      Semester: s.student.semester,
      Subjects: s.subjectsTaught.join(', '),
      AttendancePct: `${s.attendancePct}%`,
      AvgMarksPct: s.avgMarksPct !== null ? `${s.avgMarksPct}%` : 'N/A',
      GuardianName: s.guardianName,
      GuardianPhone: s.guardianPhone,
      Standing: s.isAtRisk ? 'At Risk' : 'Normal'
    }));
    exportToExcel(
      rows.length > 0 ? rows : [{ Message: 'No students found' }],
      `${this.fac().employeeId}-student-standing`
    );
    this.studentsService.showToast('success', 'Student standing Excel spreadsheet exported.');
  }
}
