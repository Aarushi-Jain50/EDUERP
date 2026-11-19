import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chart-card',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block'
  },
  template: `
    <div class="bg-white p-4 sm:p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col gap-4">
      <div class="flex flex-col gap-0.5">
        <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest">{{ title() }}</h4>
        @if (subtitle()) {
          <p class="text-[11px] text-slate-400 font-medium italic">{{ subtitle() }}</p>
        }
      </div>
      
      <div class="relative h-[210px] sm:h-[250px] w-full flex items-center justify-center">
        @if (isEmpty()) {
          <div class="flex flex-col items-center justify-center text-slate-300 gap-2">
            <span class="material-icons text-4xl opacity-20">bar_chart</span>
            <p class="text-[11px] font-bold uppercase tracking-tighter italic">No data available for filters</p>
          </div>
        } @else {
          <ng-content></ng-content>
        }
      </div>
    </div>
  `
})
export class ChartCard {
  title = input.required<string>();
  subtitle = input<string>();
  isEmpty = input<boolean>(false);
}
