import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface ComingNextData {
  title?: string;
  section?: string;
  subtitle?: string;
  icon?: string;
}

@Component({
  selector: 'app-student-coming-next',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto my-4">
      <div class="w-14 h-14 rounded-xl bg-purple-50 text-[#6D42E8] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-4">
        <mat-icon class="text-2xl">{{ data().icon || 'upcoming' }}</mat-icon>
      </div>
      <p class="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {{ data().section || 'Student Portal' }}
      </p>
      <h1 class="text-lg font-bold text-[#172554] mt-1 tracking-tight">
        {{ data().title || 'Coming next' }}
      </h1>
      <p class="text-[13px] text-[#64748B] mt-2 max-w-md mx-auto leading-relaxed">
        {{ data().subtitle || 'Coming next. This student module is scheduled for the next milestone. Live summaries remain available on your dashboard.' }}
      </p>
      <div class="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <a
          routerLink="/student/dashboard"
          class="gradient-accent text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-sm hover:opacity-95 transition-opacity inline-flex items-center gap-2"
        >
          <mat-icon class="text-base">arrow_back</mat-icon>
          <span>Back to Dashboard</span>
        </a>
      </div>
    </div>
  `
})
export class StudentComingNext {
  private readonly route = inject(ActivatedRoute);
  protected readonly data = toSignal(this.route.data, { initialValue: {} as ComingNextData });
}
