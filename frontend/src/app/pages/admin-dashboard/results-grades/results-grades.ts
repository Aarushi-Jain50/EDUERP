import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ResultsService } from '../../../services/results.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-results-grades-page',
  imports: [CommonModule, FormsModule, PageHeader, StatStrip, DataToolbar, DataTable, FormDrawer],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Results & Grades" subtitle="Finalize and publish examination results and academic performance." primaryActionLabel="Add Marks" (primaryActionClicked)="openMarking()" />
      
      <app-stat-strip [items]="stats()" />

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
          emptyIcon="grade"
          emptyTitle="No results found"
          emptyMessage="Select an exam to view results or record new marks."
        />
        
        @if (selectedExam() !== 'All' && resultsForExam().length > 0 && resultsForExam()[0].status === 'Draft') {
           <div class="p-4 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
              <div class="flex items-center gap-2 text-amber-800 text-xs font-medium">
                <span class="material-icons text-sm">info</span>
                These results are currently in DRAFT and not visible to students.
              </div>
              <button (click)="publish()" class="bg-[#6D42E8] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#5b35c9] transition-colors cursor-pointer">
                Publish Results
              </button>
           </div>
        }
      </div>

      <!-- Mark Entry Drawer -->
      <app-form-drawer 
        [isOpen]="isMarkingOpen()" 
        title="Record Examination Marks" 
        subtitle="Enter marks obtained by each student for the selected exam."
        saveLabel="Save Results"
        (closed)="isMarkingOpen.set(false)" 
        (saved)="saveMarks()"
      >
        <div class="space-y-6 pt-2">
           <div class="space-y-1.5">
             <label for="res-exam" class="text-xs font-semibold text-slate-800">Select Examination <span class="text-red-500">*</span></label>
             <select id="res-exam" [(ngModel)]="markingExamId" (change)="onExamChange()" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
               <option value="">Select Exam</option>
               @for (e of completedExams(); track e.id) {
                 <option [value]="e.id">{{ e.title }} ({{ e.subjectName }})</option>
               }
             </select>
           </div>

           @if (markingExamId()) {
             <div class="border rounded-xl overflow-hidden divide-y divide-slate-100">
                <div class="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                   <span>Student Name</span>
                   <span>Marks (Max: {{ maxMarks() }})</span>
                </div>
                @for (m of markingRows(); track m.studentId) {
                  <div class="p-4 flex items-center justify-between gap-4">
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-slate-900">{{ m.name }}</span>
                      <span class="text-[10px] text-slate-500">{{ m.rollNo }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <input type="number" [(ngModel)]="m.marks" [max]="maxMarks()" class="w-20 h-9 px-2 text-center bg-white border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" />
                    </div>
                  </div>
                }
             </div>
           } @else {
              <div class="py-12 text-center text-slate-400">
                <span class="material-icons text-4xl block mb-2 opacity-20">assignment_turned_in</span>
                <p class="text-xs">Select a completed exam to load student list.</p>
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
  protected readonly academicService = inject(AcademicService);
  protected readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal('');
  protected readonly selectedExam = signal('All');
  protected readonly isMarkingOpen = signal(false);

  protected readonly markingExamId = signal('');
  protected readonly markingRows = signal<{ studentId: string, name: string, rollNo: string, marks: number, remarks: string }[]>([]);

  protected readonly completedExams = computed(() => this.examService.exams().filter(e => e.status === 'Completed'));

  protected readonly maxMarks = computed(() => {
    const exam = this.examService.getById(this.markingExamId());
    return exam?.maxMarks || 100;
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const published = this.resultsService.publishedCount();
    const topper = this.resultsService.toppers()[0];
    return [
      { label: 'Published Results', value: published, icon: 'analytics', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Avg Pass Rate', value: '84%', icon: 'grade', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
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
    const q = this.searchQuery().toLowerCase();
    return this.resultsForExam().filter(r => 
      !q || r.studentName.toLowerCase().includes(q) || r.enrollmentNo.toLowerCase().includes(q)
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

  openMarking() {
    this.markingExamId.set('');
    this.markingRows.set([]);
    this.isMarkingOpen.set(true);
  }

  onExamChange() {
    const exam = this.examService.getById(this.markingExamId());
    if (exam) {
      // Load students for this course/semester
      const students = this.studentsService.students().filter(s => 
        s.courseId === exam.courseId && s.semester === exam.semester
      );
      
      this.markingRows.set(students.map(s => ({
        studentId: s.id,
        name: s.name,
        rollNo: s.enrollmentNo,
        marks: 0,
        remarks: ''
      })));
    }
  }

  saveMarks() {
    if (!this.markingExamId()) return;
    this.resultsService.saveResults(this.markingExamId(), this.markingRows());
    this.isMarkingOpen.set(false);
  }

  publish() {
    if (this.selectedExam() !== 'All') {
      this.resultsService.publishResults(this.selectedExam());
    }
  }
}
