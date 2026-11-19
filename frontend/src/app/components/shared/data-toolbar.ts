import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  label: string;
  value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-data-toolbar',
  imports: [FormsModule],
  host: {
    class: 'block'
  },
  template: `
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-3.5">
      <!-- Search input -->
      <div class="relative flex-1 max-w-md min-w-0">
        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
          <span class="material-icons text-base">search</span>
        </span>
        <input
          type="text"
          [ngModel]="searchValue()"
          (ngModelChange)="searchChange.emit($event)"
          [placeholder]="searchPlaceholder()"
          class="w-full h-11 sm:h-10 pl-10 pr-9 text-[13px] bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all"
        />
        @if (searchValue()) {
          <button
            type="button"
            (click)="searchChange.emit('')"
            aria-label="Clear search"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <span class="material-icons text-sm">close</span>
          </button>
        }
      </div>

      <!-- Filters (up to 2 dropdowns) + Reset Button -->
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 shrink-0">
        <!-- Filter 1 -->
        @if (filter1Options().length > 0) {
          <div class="relative flex-1 sm:flex-none min-w-[130px] sm:min-w-[140px]">
            <select
              [ngModel]="filter1Value()"
              (ngModelChange)="filter1Change.emit($event)"
              class="w-full h-11 sm:h-10 appearance-none pl-3.5 pr-8 text-[13px] bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 shadow-[0_1px_2px_rgba(15,23,42,0.03)] cursor-pointer transition-all"
            >
              @for (opt of filter1Options(); track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
            <span class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <span class="material-icons text-base">expand_more</span>
            </span>
          </div>
        }

        <!-- Filter 2 -->
        @if (filter2Options().length > 0) {
          <div class="relative flex-1 sm:flex-none min-w-[130px] sm:min-w-[140px]">
            <select
              [ngModel]="filter2Value()"
              (ngModelChange)="filter2Change.emit($event)"
              class="w-full h-11 sm:h-10 appearance-none pl-3.5 pr-8 text-[13px] bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 shadow-[0_1px_2px_rgba(15,23,42,0.03)] cursor-pointer transition-all"
            >
              @for (opt of filter2Options(); track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
            <span class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#64748B]">
              <span class="material-icons text-base">expand_more</span>
            </span>
          </div>
        }

        @if (hasActiveFilters()) {
          <button
            type="button"
            (click)="resetClicked.emit()"
            class="h-11 sm:h-10 px-3.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Reset
          </button>
        }
      </div>
    </div>
  `
})
export class DataToolbar {
  readonly searchValue = input<string>('');
  readonly searchPlaceholder = input<string>('Search records...');

  readonly filter1Value = input<string>('');
  readonly filter1Options = input<FilterOption[]>([]);

  readonly filter2Value = input<string>('');
  readonly filter2Options = input<FilterOption[]>([]);

  readonly hasActiveFilters = input<boolean>(false);

  readonly searchChange = output<string>();
  readonly filter1Change = output<string>();
  readonly filter2Change = output<string>();
  readonly resetClicked = output<void>();
}
