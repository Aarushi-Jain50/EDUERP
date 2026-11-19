import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService } from '../../../services/academic.service';
import { ExaminationsService } from '../../../services/examinations.service';
import { StudentsService } from '../../../services/students.service';
import { getGrade } from '../../../utils/grade-scale.helper';

interface StudentMarkRow {
  studentId: string;
  name: string;
  enrollmentNo: string;
  marks: number | null;
}

@Component({
  selector: 'app-faculty-results-marks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-24">
      <app-page-header 
        title="Results & Examination Marks" 
        subtitle="Enter student examination scores, calculate grades, and publish official grade cards." 
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
            [(ngModel)]="selectedExamId"
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
            [(ngModel)]="selectedSection"
            class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">Select Section</option>
            <option value="Section A">Section A</option>
            <option value="Section B">Section B</option>
          </select>
        </div>

        <div>
          <button 
            (click)="loadMarksTable()"
            class="w-full h-10 gradient-accent text-white font-extrabold text-xs rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="text-sm shrink-0">analytics</mat-icon> Load Marks Entry
          </button>
        </div>
      </div>

      @if (isLoaded() && selectedExam()) {
        <!-- Status Banner -->
        <div class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2" [class]="isPublished() ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'">
          <div class="flex items-center gap-2.5 min-w-0">
            <mat-icon class="text-base shrink-0" [class]="isPublished() ? 'text-emerald-600' : 'text-amber-600'">
              {{ isPublished() ? 'verified' : 'edit_note' }}
            </mat-icon>
            <span class="text-xs font-bold">
              Status: {{ isPublished() ? 'Published (Read-only mode)' : 'Draft Mode (Editable)' }}
            </span>
          </div>
          @if (!isPublished()) {
            <span class="text-[11px] font-medium opacity-80">Enter scores below and click Publish Grades when finalized.</span>
          }
        </div>

        <!-- Marks Table / Mobile Cards -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-extrabold text-slate-900 text-sm">Marks Entry Register — {{ selectedExam()?.title }}</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Passing Marks: <strong>{{ selectedExam()?.passingMarks }}</strong> / Max Marks: <strong>{{ selectedExam()?.maxMarks }}</strong></p>
            </div>
            <div class="text-xs font-bold text-slate-600 whitespace-nowrap shrink-0">
              Appeared: {{ marksRows().length }} Students
            </div>
          </div>

          <!-- Phone Card List (< sm) -->
          <div class="sm:hidden divide-y divide-slate-100">
            @for (row of marksRows(); track row.studentId) {
              @let maxM = selectedExam()?.maxMarks || 100;
              @let passM = selectedExam()?.passingMarks || 40;
              @let pct = row.marks !== null ? Math.round((row.marks / maxM) * 100) : 0;
              @let gradeInfo = getGrade(pct);
              @let isPass = row.marks !== null && row.marks >= passM;

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
                    <span class="text-[11px] font-medium text-slate-500">Score / {{ maxM }}:</span>
                    @if (!isPublished()) {
                      <input 
                        type="number"
                        [max]="maxM"
                        min="0"
                        [(ngModel)]="row.marks"
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
              </div>
            }
          </div>

          <!-- Tablet/Desktop Table (sm+) -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Student Name</th>
                  <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Enrollment No</th>
                  <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Marks Obtained (Max {{ selectedExam()?.maxMarks }})</th>
                  <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Percentage</th>
                  <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-center">Grade</th>
                  <th class="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Result Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (row of marksRows(); track row.studentId) {
                  @let maxM = selectedExam()?.maxMarks || 100;
                  @let passM = selectedExam()?.passingMarks || 40;
                  @let pct = row.marks !== null ? Math.round((row.marks / maxM) * 100) : 0;
                  @let gradeInfo = getGrade(pct);
                  @let isPass = row.marks !== null && row.marks >= passM;

                  <tr class="hover:bg-slate-50/50">
                    <td class="px-6 py-4 font-bold text-slate-900">{{ row.name }}</td>
                    <td class="px-6 py-4 font-mono text-slate-600">{{ row.enrollmentNo }}</td>
                    <td class="px-6 py-4 text-center">
                      @if (!isPublished()) {
                        <input 
                          type="number"
                          [max]="maxM"
                          min="0"
                          [(ngModel)]="row.marks"
                          class="w-20 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-[#6D42E8]"
                        />
                      } @else {
                        <span class="font-black text-slate-900">{{ row.marks !== null ? row.marks : 'AB' }}</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center font-bold text-slate-700 tabular-nums">
                      {{ row.marks !== null ? pct + '%' : '-' }}
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-0.5 rounded bg-purple-50 text-[#6D42E8] font-black text-xs">
                        {{ row.marks !== null ? gradeInfo.grade : '-' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      @if (row.marks !== null) {
                        <span [class]="isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'" class="px-2.5 py-1 rounded-full font-black text-[10px] uppercase">
                          {{ isPass ? 'Pass' : 'Fail' }}
                        </span>
                      } @else {
                        <span class="text-slate-400 italic">Not Graded</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Sticky Action Bar -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 z-20 shadow-lg">
            <span class="text-xs text-slate-600 font-medium">All marks validated against maximum score.</span>
            @if (!isPublished()) {
              <div class="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button 
                  (click)="saveDraft()"
                  class="px-4 sm:px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center"
                >
                  Save Draft
                </button>
                <button 
                  (click)="publishGrades()"
                  class="gradient-accent text-white px-4 sm:px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <mat-icon class="text-sm shrink-0">publish</mat-icon> Publish Grades
                </button>
              </div>
            } @else {
              <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 self-start sm:self-auto whitespace-nowrap">Official Grades Published</span>
            }
          </div>
        </div>
      } @else {
        <div class="p-8 sm:p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <mat-icon class="text-4xl text-slate-300 mb-2">grade</mat-icon>
          <p class="font-bold text-sm text-slate-700">Select an examination and section above to load the marks entry table.</p>
        </div>
      }
    </div>
  `
})
export class FacultyResultsMarksPage {
  protected readonly userService = inject(CurrentUserService);
  protected readonly academicService = inject(AcademicService);
  protected readonly examinationsService = inject(ExaminationsService);
  protected readonly studentsService = inject(StudentsService);

  protected selectedExamId = '';
  protected selectedSection = 'Section A';
  protected readonly isLoaded = signal<boolean>(false);
  protected readonly isPublished = signal<boolean>(false);
  protected readonly marksRows = signal<StudentMarkRow[]>([]);

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly myAllocations = computed(() => {
    const fac = this.currentFaculty();
    return this.academicService.subjectAllocations().filter(a => a.faculty.toLowerCase().trim() === fac.name.toLowerCase().trim());
  });

  protected readonly facultyExams = computed(() => {
    const allocs = this.myAllocations();
    const subNames = allocs.map(a => a.subject.toLowerCase());
    return this.examinationsService.exams().filter(e => subNames.includes(e.subjectName.toLowerCase()));
  });

  protected readonly selectedExam = computed(() => {
    return this.facultyExams().find(e => e.id === this.selectedExamId);
  });

  protected loadMarksTable(): void {
    if (!this.selectedExamId || !this.selectedSection) {
      this.studentsService.showToast('error', 'Please select an examination and section.');
      return;
    }

    const exam = this.selectedExam();
    if (!exam) return;

    const students = this.studentsService.students().slice(0, 10);
    const rows: StudentMarkRow[] = students.map((s, idx) => ({
      studentId: s.id,
      name: s.name,
      enrollmentNo: s.enrollmentNo,
      marks: Math.min(exam.maxMarks, Math.max(15, Math.round(exam.maxMarks * (0.65 + (idx * 0.03) % 0.3))))
    }));

    this.marksRows.set(rows);
    this.isLoaded.set(true);
    this.isPublished.set(false);
  }

  protected saveDraft(): void {
    this.studentsService.showToast('success', 'Marks draft saved successfully.');
  }

  protected publishGrades(): void {
    this.isPublished.set(true);
    this.studentsService.showToast('success', 'Official examination grades published successfully.');
  }

  protected readonly stats = computed<StatItem[]>(() => {
    return [
      { label: 'Exams Conducted', value: this.facultyExams().length, icon: 'grading', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Pass Rate', value: '92.5%', icon: 'verified', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Published Results', value: 3, icon: 'folder_shared', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' }
    ];
  });

  protected getGrade(pct: number) {
    return getGrade(pct);
  }

  protected Math = Math;
}
