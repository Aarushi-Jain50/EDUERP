import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { CurrentUserService } from '../../../services/current-user.service';
import { TimetableService } from '../../../services/timetable.service';
import { TimetableEntry } from '../../../models/timetable.model';

@Component({
  selector: 'app-faculty-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PageHeader, StatStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-slate-800 pb-16">
      <app-page-header 
        title="My Weekly Timetable" 
        subtitle="Read-only lecture schedule for your allocated teaching periods." 
      />

      <div class="mb-6 sm:mb-8">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- View Toggle Toolbar -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div class="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button 
            (click)="viewMode.set('week')"
            [class]="viewMode() === 'week' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
            class="px-3 sm:px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap text-center"
          >
            Full Week Grid
          </button>
          <button 
            (click)="viewMode.set('today')"
            [class]="viewMode() === 'today' ? 'bg-[#6D42E8] text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
            class="px-3 sm:px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap text-center"
          >
            Today's Schedule ({{ todayDay }})
          </button>
        </div>

        <div class="text-xs text-slate-500 font-medium hidden sm:block">
          Active Faculty: <strong class="text-slate-900">{{ currentFaculty().name }}</strong>
        </div>
      </div>

      <!-- Full Week Desktop Grid -->
      @if (viewMode() === 'week') {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hidden lg:block">
          <div class="grid grid-cols-[110px_repeat(6,1fr)] bg-slate-50 border-b border-slate-200">
            <div class="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-200">Period</div>
            @for (day of days; track day) {
              <div [class]="day === todayDay ? 'bg-purple-50/80 text-[#6D42E8]' : 'text-slate-500'" class="p-4 text-[10px] font-bold uppercase tracking-widest text-center border-r border-slate-200 last:border-r-0">
                {{ day }} {{ day === todayDay ? '(Today)' : '' }}
              </div>
            }
          </div>

          <div class="flex flex-col">
            @for (period of periods; track period.id) {
              @if (period.id === '13:00') {
                <div class="grid grid-cols-[110px_1fr] bg-indigo-50/40 border-b border-slate-200 h-12">
                   <div class="p-3 text-[11px] font-bold text-indigo-400 flex items-center justify-center border-r border-indigo-200 italic">{{ period.id }}</div>
                   <div class="flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">Lunch Break (60 Min)</div>
                </div>
              } @else {
                <div class="grid grid-cols-[110px_repeat(6,1fr)] border-b border-slate-200 last:border-b-0 min-h-[90px]">
                  <div class="p-4 text-[11px] font-bold text-slate-400 flex flex-col items-center justify-center gap-0.5 border-r border-slate-200 bg-slate-50/40">
                    <span>{{ period.id }}</span>
                    <span class="text-[9px] font-medium opacity-60">{{ period.end }}</span>
                  </div>
                  @for (day of days; track day) {
                    @let slot = getFacultySlot(day, period.id);
                    <div [class]="day === todayDay ? 'bg-purple-50/20' : ''" class="p-2 border-r border-slate-200 last:border-r-0 flex items-center justify-center">
                      @if (slot) {
                        <div [class]="getTypeClass(slot.subjectType)" class="h-full w-full rounded-xl p-2.5 flex flex-col justify-between shadow-xs border transition-transform hover:scale-[1.01]">
                          <div class="space-y-1">
                            <span class="text-[11px] font-bold leading-tight line-clamp-2">{{ slot.subjectName }}</span>
                            <span class="text-[10px] font-medium opacity-80">Sec {{ slot.sectionId === 'sec-1' ? 'A' : 'B' }}</span>
                          </div>
                          <div class="flex justify-between items-center mt-2">
                            <span class="px-1.5 py-0.5 rounded bg-white/80 text-[9px] font-bold uppercase tracking-tighter border border-black/5">{{ slot.room }}</span>
                            <span class="text-[9px] font-bold uppercase">{{ slot.subjectType }}</span>
                          </div>
                        </div>
                      } @else {
                        <div class="h-full w-full rounded-xl border border-dashed border-slate-100 flex items-center justify-center">
                          <span class="text-[10px] text-slate-300 italic">Free</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>

        <!-- Mobile View (Week) -->
        <div class="lg:hidden space-y-4 sm:space-y-6">
          @for (day of days; track day) {
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 [class]="day === todayDay ? 'text-[#6D42E8] font-black' : 'text-slate-800 font-bold'" class="text-xs uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full shrink-0" [class]="day === todayDay ? 'bg-[#6D42E8]' : 'bg-slate-300'"></span>
                <span>{{ day }} {{ day === todayDay ? '• Today' : '' }}</span>
              </h3>
              <div class="space-y-2">
                @for (period of periods; track period.id) {
                  @if (period.id !== '13:00') {
                    @let slot = getFacultySlot(day, period.id);
                    <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-0 text-xs">
                      <span class="font-mono text-slate-500 font-bold shrink-0">{{ period.id }}</span>
                      @if (slot) {
                        <div class="flex-1 sm:ml-4 min-w-0">
                          <p class="font-bold text-slate-900">{{ slot.subjectName }}</p>
                          <p class="text-[10px] text-slate-500 mt-0.5">Room {{ slot.room }} • <strong class="text-purple-600">{{ slot.subjectType }}</strong></p>
                        </div>
                      } @else {
                        <span class="text-[11px] text-slate-400 italic">No lecture scheduled</span>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Today's View -->
      @if (viewMode() === 'today') {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <h3 class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <mat-icon class="text-[#6D42E8] shrink-0">today</mat-icon>
              <span>Today's Schedule ({{ todayDay }})</span>
            </h3>
            <span class="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full self-start sm:self-auto whitespace-nowrap shrink-0">{{ todaysSlots().length }} Periods Scheduled</span>
          </div>

          <div class="space-y-3">
            @for (slot of todaysSlots(); track slot.id) {
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div class="w-16 sm:w-20 py-2 rounded-xl bg-purple-100 text-[#6D42E8] font-black text-xs text-center border border-purple-200 tabular-nums shrink-0">
                    {{ slot.periodId }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 text-xs">{{ slot.subjectName }}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5">Room {{ slot.room }} • Section {{ slot.sectionId === 'sec-1' ? 'A' : 'B' }} • <strong class="text-[#6D42E8]">{{ slot.subjectType }}</strong></p>
                  </div>
                </div>
                <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] self-start sm:self-auto whitespace-nowrap shrink-0">Assigned</span>
              </div>
            } @empty {
              <div class="py-12 sm:py-16 text-center">
                <mat-icon class="text-4xl text-slate-300 mb-2">event_available</mat-icon>
                <p class="font-bold text-slate-700 text-sm">No classes scheduled for you today.</p>
                <p class="text-xs text-slate-400 mt-1">Enjoy your free day or prepare materials for upcoming lectures.</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class FacultyTimetablePage {
  protected readonly userService = inject(CurrentUserService);
  protected readonly timetableService = inject(TimetableService);

  protected readonly viewMode = signal<'week' | 'today'>('week');
  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  protected readonly todayDay = 'Mon'; // Default demo day or system day

  protected readonly periods = [
    { id: '09:00', end: '10:00' },
    { id: '10:00', end: '11:00' },
    { id: '11:00', end: '12:00' },
    { id: '12:00', end: '13:00' },
    { id: '13:00', end: '14:00' }, // Lunch
    { id: '14:00', end: '15:00' },
    { id: '15:00', end: '16:00' }
  ];

  protected getFacultySlot(day: string, periodId: string): TimetableEntry | undefined {
    const fac = this.currentFaculty();
    return this.timetableService.slots().find(s => 
      s.facultyId === fac.id && s.day === day && s.periodId === periodId
    );
  }

  protected readonly todaysSlots = computed(() => {
    const fac = this.currentFaculty();
    return this.timetableService.slots().filter(s => s.facultyId === fac.id && s.day === this.todayDay);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const fac = this.currentFaculty();
    const facSlots = this.timetableService.slots().filter(s => s.facultyId === fac.id);
    const uniqueSubjects = new Set(facSlots.map(s => s.subjectId)).size;

    return [
      { label: 'Weekly Lecture Hours', value: facSlots.length, icon: 'schedule', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Subjects Taught', value: uniqueSubjects, icon: 'library_books', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' },
      { label: 'Assigned Rooms', value: new Set(facSlots.map(s => s.room)).size, icon: 'meeting_room', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-purple-50 border-purple-100' }
    ];
  });

  protected getTypeClass(type: string): string {
    switch (type) {
      case 'Theory': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Practical': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Elective': return 'bg-amber-50 text-amber-800 border-amber-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  }
}
