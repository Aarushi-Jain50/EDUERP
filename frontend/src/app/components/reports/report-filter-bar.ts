import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic.service';

export interface ReportFilters {
  academicYear: string;
  courseId: string;
  semester: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-report-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-end gap-4">
      <!-- Academic Year -->
      <div class="flex-1 min-w-[150px] space-y-1.5">
        <label for="rep-ay" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year</label>
        <select id="rep-ay" [(ngModel)]="filters.academicYear" (change)="emitChange()" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
          @for (y of academicService.academicYears(); track y.id) {
            <option [value]="y.year">{{ y.year }}</option>
          }
        </select>
      </div>

      <!-- Course -->
      <div class="flex-1 min-w-[180px] space-y-1.5">
        <label for="rep-course" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course / Program</label>
        <select id="rep-course" [(ngModel)]="filters.courseId" (change)="emitChange()" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
          <option value="All">All Courses</option>
          @for (c of academicService.courses(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
      </div>

      <!-- Semester -->
      <div class="flex-1 min-w-[150px] space-y-1.5">
        <label for="rep-sem" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semester</label>
        <select id="rep-sem" [(ngModel)]="filters.semester" (change)="emitChange()" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]">
          <option value="All">All Semesters</option>
          <option value="Semester 1">Semester 1</option>
          <option value="Semester 2">Semester 2</option>
          <option value="Semester 3">Semester 3</option>
          <option value="Semester 4">Semester 4</option>
        </select>
      </div>

      <!-- Date Range (Optional) -->
      @if (showDateRange()) {
        <div class="flex-1 min-w-[280px] space-y-1.5">
          <label for="rep-start" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Range</label>
          <div class="flex gap-2">
            <input id="rep-start" type="date" [(ngModel)]="filters.startDate" (change)="emitChange()" class="flex-1 h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" aria-label="Start Date" />
            <input id="rep-end" type="date" [(ngModel)]="filters.endDate" (change)="emitChange()" class="flex-1 h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#6D42E8]" aria-label="End Date" />
          </div>
        </div>
      }
    </div>
  `
})
export class ReportFilterBar {
  protected readonly academicService = inject(AcademicService);
  
  showDateRange = input<boolean>(false);
  filterChange = output<ReportFilters>();

  protected filters: ReportFilters = {
    academicYear: '2025-26',
    courseId: 'All',
    semester: 'All'
  };

  emitChange() {
    this.filterChange.emit({ ...this.filters });
  }
}

