import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div [class]="iconBgClass()" class="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0">
        <span class="material-icons text-xl" [class]="iconColorClass()">{{ icon() }}</span>
      </div>
      <div class="min-w-0">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{{ label() }}</p>
        <h3 class="text-lg font-black text-slate-900 leading-tight">{{ value() }}</h3>
      </div>
    </div>
  `
})
export class KpiCard {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input.required<string>();
  iconBgClass = input('bg-slate-50 border-slate-100');
  iconColorClass = input('text-slate-600');
}
