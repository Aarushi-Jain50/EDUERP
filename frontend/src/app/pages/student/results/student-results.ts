import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { ChartCard } from '../../../components/reports/chart-card';
import { exportToPdf } from '../../../utils/export.helper';
import { StudentPortalFacade } from '../shared/student-portal.facade';

@Component({
  selector: 'app-student-results',
  imports: [MatIconModule, BaseChartDirective, PageHeader, StatusBadge, EmptyState, ChartCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="Results & Grade Card"
        [subtitle]="'Published examination marks, SGPA/CGPA computation, and performance trend for ' + student().name + '.'"
        [actionLabel]="semesterResults().length > 0 ? 'Download PDF' : ''"
        actionIcon="picture_as_pdf"
        (actionClicked)="downloadGradeCardPdf()"
      />

      <!-- Next Result Announcement Banner -->
      @if (nextAnnouncement(); as next) {
        <div class="p-4 sm:px-5 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start sm:items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-white border border-purple-200 text-[#6D42E8] flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">event_upcoming</mat-icon>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-[#172554]">
                Upcoming Result Announcement: {{ next.exam.title }} ({{ next.exam.mode }})
              </p>
              <p class="text-xs text-[#64748B] mt-0.5">
                {{ next.exam.subjectName }} · Expected on
                <strong class="text-[#6D42E8]">{{ facade.formatShortDate(next.resultAnnouncementDate) }}</strong>
                at {{ next.resultAnnouncementTime }} ({{ next.countdownLabel }})
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="activeTab.set('schedule')"
            class="px-3.5 py-2 rounded-xl border border-[#6D42E8]/30 bg-white hover:bg-purple-100/60 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <mat-icon class="text-sm">schedule</mat-icon>
            <span>Announcement Dates ({{ announcements().length }})</span>
          </button>
        </div>
      }

      <!-- Semester Selector + Results Tabs + Consolidated Transcript Action -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2 text-xs text-[#64748B]">
            <mat-icon class="text-base text-[#6D42E8]">school</mat-icon>
            <span>
              <strong class="text-[#172554]">{{ student().enrollmentNo }}</strong> · {{ student().course }}
            </span>
          </div>

          <div class="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
            <label for="semester-filter" class="text-xs font-semibold text-[#64748B] whitespace-nowrap">Semester:</label>
            <select
              id="semester-filter"
              [value]="selectedSemester()"
              (change)="onSemesterChange($event)"
              class="flex-1 sm:flex-none h-9 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#172554] focus:outline-none focus:border-[#6D42E8] cursor-pointer"
            >
              @for (sem of semesterOptions(); track sem) {
                <option [value]="sem">{{ sem === 'All' ? 'All Semesters' : sem }}</option>
              }
            </select>

            <button
              type="button"
              (click)="isTranscriptOpen.set(true)"
              class="h-9 px-3.5 rounded-xl border border-[#6D42E8]/30 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <mat-icon class="text-sm">description</mat-icon>
              <span>Official Transcript</span>
            </button>
          </div>
        </div>

        <div class="px-4 sm:px-5 flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            (click)="activeTab.set('published')"
            class="min-h-[44px] py-2.5 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap"
            [class]="activeTab() === 'published' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Published Results ({{ semesterResults().length }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('schedule')"
            class="min-h-[44px] py-2.5 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap"
            [class]="activeTab() === 'schedule' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
          >
            Result Announcement Schedule ({{ announcements().length }})
          </button>
        </div>
      </div>

      @if (activeTab() === 'published') {
        <!-- 4 Stat Cards: SGPA, CGPA, Pass %, Backlogs -->
        <section class="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">SGPA</p>
              <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                {{ semesterResults().length > 0 ? sgpa().toFixed(2) : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">{{ selectedSemester() === 'All' ? 'Across semesters' : selectedSemester() }}</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-purple-50 text-[#6D42E8] border border-purple-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">grade</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">CGPA</p>
              <p class="text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                {{ allPublished().length > 0 ? cgpa().toFixed(2) : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">Cumulative grade point</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">workspace_premium</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Pass %</p>
              <p class="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                {{ semesterResults().length > 0 ? passPct() + '%' : 'N/A' }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">Threshold {{ facade.passingPercentage() }}%</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">verified</mat-icon>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Backlogs</p>
              <p
                class="text-2xl font-bold mt-1 tabular-nums"
                [class]="backlogsCount() > 0 ? 'text-rose-600' : 'text-[#172554]'"
              >
                {{ backlogsCount() }}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">Unpassed subjects</p>
            </div>
            <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <mat-icon class="text-lg">warning</mat-icon>
            </div>
          </div>
        </section>

        @if (semesterResults().length > 0) {
          <!-- Published Results Table / Mobile Grade Cards -->
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div class="px-4 sm:px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
              <h2 class="text-sm font-bold text-[#172554]">Published Examination Marks</h2>
              <span class="text-xs font-semibold text-[#64748B] whitespace-nowrap">{{ semesterResults().length }} Published</span>
            </div>

            <!-- Mobile Grade Cards (< md) -->
            <div class="md:hidden divide-y divide-[#E2E8F0]">
              @for (res of semesterResults(); track res.record.id) {
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-[13px] text-[#172554] leading-snug">{{ res.subjectName }}</p>
                      <p class="text-[11px] font-mono text-[#64748B] mt-0.5">{{ res.subjectCode }}</p>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="px-2 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold whitespace-nowrap">
                        {{ res.grade }}
                      </span>
                      <app-status-badge [status]="res.passed ? 'Pass' : 'Fail'" />
                    </div>
                  </div>

                  <p class="text-xs text-[#64748B]">
                    <span class="font-medium text-[#172554]">{{ res.examTitle }}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{{ res.semester }}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Announced {{ facade.formatShortDate(res.resultAnnouncementDate) }}</span>
                  </p>

                  <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Marks</p>
                      <p class="font-bold text-[#172554] tabular-nums mt-0.5">{{ res.record.marksObtained }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Max</p>
                      <p class="font-medium text-[#64748B] tabular-nums mt-0.5">{{ res.record.maxMarks }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Score %</p>
                      <p class="font-bold text-[#172554] tabular-nums mt-0.5">{{ res.percentage }}%</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Tablet & Desktop Marks Table (>= md) -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th scope="col" class="px-4 py-3 whitespace-nowrap">Subject</th>
                    <th scope="col" class="px-4 py-3 whitespace-nowrap">Exam &amp; Announced Date</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Marks</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Max</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">%</th>
                    <th scope="col" class="px-4 py-3 text-center whitespace-nowrap">Grade</th>
                    <th scope="col" class="px-4 py-3 text-right whitespace-nowrap">Result</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0] text-[13px]">
                  @for (res of semesterResults(); track res.record.id) {
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="px-4 py-3.5">
                        <p class="font-semibold text-[#172554]">{{ res.subjectName }}</p>
                        <p class="text-[11px] font-mono text-[#64748B]">{{ res.subjectCode }}</p>
                      </td>
                      <td class="px-4 py-3.5">
                        <p class="font-medium text-[#172554]">{{ res.examTitle }}</p>
                        <p class="text-[11px] text-[#64748B]">
                          {{ res.semester }} · Exam {{ facade.formatShortDate(res.examDate) }} · Announced {{ facade.formatShortDate(res.resultAnnouncementDate) }}
                        </p>
                      </td>
                      <td class="px-4 py-3.5 text-right tabular-nums font-bold text-[#172554] whitespace-nowrap">{{ res.record.marksObtained }}</td>
                      <td class="px-4 py-3.5 text-right tabular-nums text-[#64748B] whitespace-nowrap">{{ res.record.maxMarks }}</td>
                      <td class="px-4 py-3.5 text-right tabular-nums font-semibold text-[#172554] whitespace-nowrap">{{ res.percentage }}%</td>
                      <td class="px-4 py-3.5 text-center whitespace-nowrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-xs font-bold">
                          {{ res.grade }}
                        </span>
                      </td>
                      <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <app-status-badge [status]="res.passed ? 'Pass' : 'Fail'" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Exam-wise Percentage Trend Line Chart -->
          <app-chart-card
            title="Exam-wise Percentage Trend"
            subtitle="Published score progression across examinations"
            [isEmpty]="semesterResults().length === 0"
          >
            <div class="w-full h-full">
              <canvas baseChart [data]="trendChartData()" [options]="lineOptions" [type]="'line'"></canvas>
            </div>
          </app-chart-card>
        } @else {
          <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <app-empty-state
              icon="grade"
              title="No published results for this semester"
              message="Check the Result Announcement Schedule tab to see exact dates when upcoming and submitted exam results will be published."
            />
          </div>
        }
      } @else {
        <!-- Result Announcement Schedule Tab -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div class="px-4 sm:px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-[#172554]">Upcoming Result Announcement Dates</h2>
              <p class="text-xs text-[#64748B] mt-0.5">
                All examination scores and grades will be released exclusively inside this Results tab on the dates below.
              </p>
            </div>
            <span class="text-xs font-semibold text-[#6D42E8] whitespace-nowrap">{{ announcements().length }} Pending</span>
          </div>

          @if (announcements().length > 0) {
            <div class="divide-y divide-[#E2E8F0]">
              @for (item of announcements(); track item.exam.id) {
                <div class="p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div class="space-y-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-bold text-[#172554]">{{ item.exam.title }}</span>
                      <span class="px-2 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-semibold">
                        {{ item.exam.mode }}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded-full border text-[11px] font-semibold"
                        [class]="item.hasAttemptSubmitted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-[#64748B] border-[#E2E8F0]'"
                      >
                        {{ item.stageLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-[#172554] font-medium">
                      {{ item.exam.subjectName }}
                      <span class="font-mono text-[#64748B] ml-1">({{ item.subjectCode }})</span>
                    </p>
                    <p class="text-xs text-[#64748B] tabular-nums">
                      Exam Date: {{ facade.formatShortDate(item.exam.date) }} at {{ item.exam.time }} · Max {{ item.exam.maxMarks }} marks
                    </p>
                  </div>

                  <div class="flex flex-col sm:items-end gap-1 shrink-0">
                    <div class="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-[#6D42E8] inline-flex items-center gap-1.5 whitespace-nowrap">
                      <mat-icon class="text-sm">event_available</mat-icon>
                      <span>Announces {{ facade.formatShortDate(item.resultAnnouncementDate) }} · {{ item.resultAnnouncementTime }}</span>
                    </div>
                    <span class="text-[11px] font-semibold text-[#64748B]">{{ item.countdownLabel }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="event_available"
              title="All results announced"
              message="Every scheduled examination for this semester already has its result published under Published Results."
            />
          }
        </div>
      }

      <!-- Official Consolidated Academic Transcript Modal -->
      @if (isTranscriptOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transcript-modal-heading"
        >
          <button
            type="button"
            aria-label="Close transcript modal"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
            (click)="isTranscriptOpen.set(false)"
          ></button>

          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl z-10 border border-[#E2E8F0] max-h-[90dvh] overflow-y-auto">
            <div class="gradient-brand text-white p-5 flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] uppercase tracking-wider font-semibold text-indigo-300">
                  {{ facade.instituteProfile().name || 'Office of the Controller of Examinations' }}
                </p>
                <h3 id="transcript-modal-heading" class="text-lg font-bold tracking-tight mt-0.5">
                  Consolidated Academic Transcript
                </h3>
                <p class="text-xs text-slate-300 mt-0.5">
                  {{ student().name }} ({{ student().enrollmentNo }}) · {{ student().course }}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                (click)="isTranscriptOpen.set(false)"
                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shrink-0"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>

            <div class="p-5 space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Cumulative GPA</p>
                  <p class="text-xl font-bold text-[#6D42E8] tabular-nums mt-0.5">{{ cgpa().toFixed(2) }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Credits Evaluated</p>
                  <p class="text-xl font-bold text-[#172554] tabular-nums mt-0.5">{{ totalCredits() }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Papers Passed</p>
                  <p class="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">
                    {{ totalPassedCount() }}/{{ allPublished().length }}
                  </p>
                </div>
              </div>

              @if (allPublished().length > 0) {
                <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead class="bg-slate-50 border-b border-[#E2E8F0] text-[10px] uppercase tracking-wider text-[#64748B]">
                      <tr>
                        <th class="px-3.5 py-2.5">Semester</th>
                        <th class="px-3.5 py-2.5">Code</th>
                        <th class="px-3.5 py-2.5">Subject</th>
                        <th class="px-3.5 py-2.5 text-right">Credits</th>
                        <th class="px-3.5 py-2.5 text-right">Score</th>
                        <th class="px-3.5 py-2.5 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#E2E8F0]">
                      @for (r of allPublished(); track r.record.id) {
                        <tr>
                          <td class="px-3.5 py-2.5 text-[#64748B] whitespace-nowrap">{{ r.semester }}</td>
                          <td class="px-3.5 py-2.5 font-mono font-semibold text-[#172554]">{{ r.subjectCode }}</td>
                          <td class="px-3.5 py-2.5 font-semibold text-[#172554]">{{ r.subjectName }}</td>
                          <td class="px-3.5 py-2.5 text-right tabular-nums">{{ r.credits }}</td>
                          <td class="px-3.5 py-2.5 text-right tabular-nums">{{ r.record.marksObtained }}/{{ r.record.maxMarks }} ({{ r.percentage }}%)</td>
                          <td class="px-3.5 py-2.5 text-center font-bold text-[#6D42E8]">{{ r.grade }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <p class="text-xs text-[#64748B] bg-slate-50 border border-[#E2E8F0] rounded-xl p-4">
                  No published examination records available yet.
                </p>
              }

              <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  (click)="isTranscriptOpen.set(false)"
                  class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
                <button
                  type="button"
                  (click)="downloadOfficialTranscriptPdf()"
                  class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>Download Transcript PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentResults implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(StudentPortalFacade);

  protected readonly student = this.facade.currentStudent;
  protected readonly allPublished = this.facade.studentPublishedResults;
  protected readonly announcements = this.facade.studentResultAnnouncements;
  protected readonly nextAnnouncement = computed(() => this.announcements()[0] ?? null);
  protected readonly activeTab = signal<'published' | 'schedule'>('published');
  protected readonly selectedSemester = signal<string>(this.facade.currentStudent().semester);
  protected readonly isTranscriptOpen = signal<boolean>(false);

  ngOnInit(): void {
    const querySem = this.route.snapshot.queryParamMap.get('semester');
    if (querySem) {
      this.selectedSemester.set(querySem);
    }
    const queryTab = this.route.snapshot.queryParamMap.get('tab');
    if (queryTab === 'schedule') {
      this.activeTab.set('schedule');
    }
  }

  protected readonly semesterOptions = computed<string[]>(() => {
    const set = new Set<string>([this.student().semester]);
    for (const r of this.allPublished()) {
      set.add(r.semester);
    }
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [...sorted, 'All'];
  });

  protected readonly semesterResults = computed(() => {
    const sem = this.selectedSemester();
    const list = this.allPublished();
    if (sem === 'All') return list;
    return list.filter(r => r.semester === sem);
  });

  protected readonly sgpa = computed(() => this.facade.computeGpa(this.semesterResults()));
  protected readonly cgpa = computed(() => this.facade.computeGpa(this.allPublished()));

  protected readonly totalCredits = computed(() =>
    this.allPublished().reduce((acc, r) => acc + r.credits, 0)
  );

  protected readonly totalPassedCount = computed(() =>
    this.allPublished().filter(r => r.passed).length
  );

  protected readonly passPct = computed(() => {
    const list = this.semesterResults();
    if (list.length === 0) return 0;
    const passed = list.filter(r => r.passed).length;
    return Math.round((passed / list.length) * 100);
  });

  protected readonly backlogsCount = computed(() =>
    this.semesterResults().filter(r => !r.passed).length
  );

  protected readonly trendChartData = computed<ChartData<'line'>>(() => {
    const chronological = this.semesterResults().slice().reverse();
    return {
      labels: chronological.map(r =>
        r.examTitle.length > 20 ? r.examTitle.slice(0, 20) + '...' : r.examTitle
      ),
      datasets: [
        {
          label: 'Percentage (%)',
          data: chronological.map(r => r.percentage),
          borderColor: '#6D42E8',
          backgroundColor: 'rgba(109, 66, 232, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#D946EF',
        },
      ],
    };
  });

  protected readonly lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  protected onSemesterChange(event: Event): void {
    this.selectedSemester.set((event.target as HTMLSelectElement).value);
  }

  protected downloadGradeCardPdf(): void {
    const s = this.student();
    const list = this.semesterResults();
    if (list.length === 0) return;

    const semLabel = this.selectedSemester() === 'All' ? 'All Semesters' : this.selectedSemester();
    const columns = ['Subject', 'Exam', 'Marks', 'Max', '%', 'Grade', 'Status'];
    const rows = list.map(r => [
      `${r.subjectCode} - ${r.subjectName}`,
      r.examTitle,
      r.record.marksObtained,
      r.record.maxMarks,
      `${r.percentage}%`,
      r.grade,
      r.passed ? 'Pass' : 'Fail',
    ]);

    exportToPdf(
      `Student Grade Card (${semLabel})`,
      columns,
      rows,
      `${s.enrollmentNo}-${semLabel.replace(/\s+/g, '-').toLowerCase()}-grade-card`,
      [
        `Student: ${s.name} (${s.enrollmentNo}) | Section: ${s.section}`,
        `Course: ${s.course} | Scope: ${semLabel} | SGPA: ${this.sgpa().toFixed(2)} | CGPA: ${this.cgpa().toFixed(2)}`,
      ]
    );
  }

  protected downloadOfficialTranscriptPdf(): void {
    const s = this.student();
    const all = this.allPublished();
    const columns = ['Semester', 'Code', 'Subject', 'Credits', 'Marks', '%', 'Grade'];
    const rows = all.map(r => [
      r.semester,
      r.subjectCode,
      r.subjectName,
      r.credits,
      `${r.record.marksObtained}/${r.record.maxMarks}`,
      `${r.percentage}%`,
      r.grade,
    ]);

    exportToPdf(
      'Official Consolidated Academic Transcript',
      columns,
      rows.length > 0 ? rows : [['-', '-', 'No published results yet', 0, '-', '-', '-']],
      `${s.enrollmentNo}-official-transcript`,
      [
        `Student: ${s.name} (${s.enrollmentNo}) | ${s.course}`,
        `Cumulative GPA (CGPA): ${this.cgpa().toFixed(2)} | Credits Evaluated: ${this.totalCredits()}`,
      ]
    );
  }
}
