import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface StatItem {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  iconColorClass?: string;
  iconBgClass?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stat-strip',
  imports: [],
  host: {
    class: 'block'
  },
  template: `
    <div class="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
      @for (item of items().slice(0, 3); track item.label; let last = $last; let count = $count) {
        <div
          class="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300/90 px-4 py-3.5 sm:px-5 sm:py-4 min-h-[84px] sm:min-h-[96px] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors flex items-center justify-between gap-3 sm:gap-4"
          [class]="last && count === 3 ? 'min-[380px]:col-span-2 md:col-span-1' : ''"
        >
          <div class="space-y-1 min-w-0 flex-1">
            <span class="text-xs font-medium text-slate-500 block truncate leading-tight">{{ item.label }}</span>
            <div class="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug tabular-nums">{{ item.value }}</div>
            @if (item.subtext) {
              <p class="text-[11px] text-slate-500 font-medium truncate leading-tight">{{ item.subtext }}</p>
            }
          </div>
          <div
            class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80 bg-slate-50 text-indigo-600"
            [class]="item.iconBgClass || 'bg-slate-50 border-slate-200/80 text-indigo-600'"
          >
            <span class="material-icons text-base sm:text-lg" [class]="item.iconColorClass || 'text-indigo-600'">{{ item.icon }}</span>
          </div>
        </div>
      }
    </div>
  `
})
export class StatStrip {
  readonly items = input.required<StatItem[]>();
}
