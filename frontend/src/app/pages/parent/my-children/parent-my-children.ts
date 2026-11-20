import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ChildContextService } from '../../../services/child-context.service';
import { ParentPortalFacade } from '../shared/parent-portal.facade';

@Component({
  selector: 'app-parent-my-children',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-[#172554] text-[13px] pb-8 min-w-0">

      <!-- Header Card -->
      <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-[#6D42E8]">Family Overview</p>
          <h1 class="text-lg sm:text-xl font-bold text-[#172554] tracking-tight mt-0.5">My Children</h1>
          <p class="text-xs text-[#64748B] mt-0.5">
            Linked wards for {{ currentParent().name || 'Parent' }} ({{ currentParent().relation || 'Guardian' }})
          </p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <span class="px-3 py-1.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#172554] tabular-nums">
            {{ snapshots().length }} {{ snapshots().length === 1 ? 'Linked Child' : 'Linked Children' }}
          </span>
          <a
            routerLink="/parent/dashboard"
            class="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-[#172554] border border-[#E2E8F0] text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
          >
            <mat-icon class="text-base text-[#6D42E8]">dashboard</mat-icon>
            <span>Dashboard</span>
          </a>
        </div>
      </section>

      <!-- Linked Children Cards Grid -->
      @if (snapshots().length > 0) {
        <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (item of snapshots(); track item.student.id) {
            @let isSelected = selectedChild()?.id === item.student.id;
            <article
              class="bg-white rounded-xl border shadow-sm p-5 flex flex-col justify-between gap-5 min-w-0 transition-colors"
              [class]="isSelected ? 'border-[#6D42E8]' : 'border-[#E2E8F0]'"
            >
              <div class="space-y-4">
                <!-- Top Row: Avatar, Name, Enrollment, Status Pill -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-12 h-12 rounded-full gradient-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {{ item.student.initials }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-base font-bold text-[#172554] truncate">{{ item.student.name }}</h2>
                        @if (isSelected) {
                          <span class="px-2 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-semibold">
                            Selected
                          </span>
                        }
                      </div>
                      <p class="text-xs font-mono text-[#64748B] mt-0.5">{{ item.student.enrollmentNo }}</p>
                    </div>
                  </div>

                  <span
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0"
                    [class]="item.student.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.student.status === 'Inactive'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-[#64748B] border-[#E2E8F0]'"
                  >
                    {{ item.student.status }}
                  </span>
                </div>

                <!-- Academic Info -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-1.5">
                  <p class="text-[13px] font-semibold text-[#172554] truncate">{{ item.student.course }}</p>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B]">
                    <span>{{ item.student.semester }}</span>
                    <span aria-hidden="true">·</span>
                    <span>{{ item.student.section }}</span>
                    <span aria-hidden="true">·</span>
                    <span>{{ item.student.department }}</span>
                  </div>
                </div>

                <!-- Key Metrics Row: Attendance % & Fee Due -->
                <div class="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 sm:gap-4">
                  <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-0">
                    <div class="flex items-center justify-between gap-1.5 flex-wrap">
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Attendance</p>
                      @if (item.isLowAttendance) {
                        <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold whitespace-nowrap shrink-0">
                          Low
                        </span>
                      }
                    </div>
                    <p
                      class="text-base sm:text-lg font-bold mt-1 tabular-nums"
                      [class]="item.isLowAttendance ? 'text-rose-600' : 'text-[#172554]'"
                    >
                      {{ item.overallAttendancePct }}%
                    </p>
                    <p class="text-[11px] text-[#64748B] mt-0.5">Threshold {{ item.attendanceThreshold }}%</p>
                  </div>

                  <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] min-w-0">
                    <div class="flex items-center justify-between gap-1.5 flex-wrap">
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Fee Due</p>
                      @if (item.feeSummary.overdueCount > 0) {
                        <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold whitespace-nowrap shrink-0">
                          Overdue
                        </span>
                      }
                    </div>
                    <p
                      class="text-base sm:text-lg font-bold mt-1 tabular-nums break-words"
                      [class]="item.feeSummary.due > 0 ? 'text-rose-600' : 'text-emerald-700'"
                    >
                      {{ facade.formatINR(item.feeSummary.due) }}
                    </p>
                    <p class="text-[11px] text-[#64748B] mt-0.5 truncate">
                      {{ item.feeSummary.nextDueDate ? 'Due ' + facade.formatShortDate(item.feeSummary.nextDueDate!) : 'No balance due' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Footer Action -->
              <div class="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                <div class="text-xs text-[#64748B] flex items-center gap-1.5">
                  <mat-icon class="text-base text-[#6D42E8]">notifications_active</mat-icon>
                  <span>{{ item.alerts.length }} {{ item.alerts.length === 1 ? 'active alert' : 'active alerts' }}</span>
                </div>
                <button
                  type="button"
                  (click)="viewChildDashboard(item.student.id)"
                  class="gradient-accent text-white px-4 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:opacity-95 transition-opacity inline-flex items-center gap-2 cursor-pointer"
                >
                  <mat-icon class="text-base">dashboard</mat-icon>
                  <span>View Dashboard</span>
                </button>
              </div>
            </article>
          }
        </section>
      } @else {
        <!-- Empty State -->
        <section class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-10 text-center max-w-xl mx-auto space-y-3">
          <div class="w-14 h-14 rounded-xl bg-purple-50 text-[#6D42E8] border border-[#E2E8F0] flex items-center justify-center mx-auto">
            <mat-icon class="text-2xl">family_restroom</mat-icon>
          </div>
          <h2 class="text-base font-bold text-[#172554]">No Linked Children Found</h2>
          <p class="text-[13px] text-[#64748B] leading-relaxed">
            Your parent profile does not currently have any linked students assigned. Please contact the Academic Administration office to link student enrollment records.
          </p>
        </section>
      }
    </div>
  `
})
export class ParentMyChildren {
  private readonly router = inject(Router);
  private readonly childContext = inject(ChildContextService);
  protected readonly facade = inject(ParentPortalFacade);

  protected readonly currentParent = this.childContext.currentParent;
  protected readonly selectedChild = this.childContext.selectedChild;
  protected readonly snapshots = computed(() => this.facade.linkedChildrenSnapshots());

  protected viewChildDashboard(studentId: string): void {
    const ok = this.childContext.selectChild(studentId);
    if (ok) {
      this.router.navigateByUrl('/parent/dashboard');
    }
  }
}
