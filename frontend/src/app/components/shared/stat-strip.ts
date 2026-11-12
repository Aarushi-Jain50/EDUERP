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
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      @for (item of items().slice(0, 3); track item.label) {
        <div class="bg-white rounded-xl border border-[#E2E8F0] p-4 h-[92px] shadow-xs flex items-center justify-between gap-3">
          <div class="space-y-0.5 min-w-0 flex-1">
            <span class="text-xs font-medium text-[#64748B] block truncate leading-tight">{{ item.label }}</span>
            <div class="text-[22px] font-semibold text-slate-900 tracking-tight leading-snug">{{ item.value }}</div>
            @if (item.subtext) {
              <p class="text-xs text-[#64748B] font-medium truncate leading-none">{{ item.subtext }}</p>
            }
          </div>
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
            [class]="item.iconBgClass || 'bg-purple-50 border-purple-100 text-[#6D42E8]'"
          >
            <span class="material-icons text-lg" [class]="item.iconColorClass || 'text-[#6D42E8]'">{{ item.icon }}</span>
          </div>
        </div>
      }
    </div>
  `
})
export class StatStrip {
  readonly items = input.required<StatItem[]>();
}
