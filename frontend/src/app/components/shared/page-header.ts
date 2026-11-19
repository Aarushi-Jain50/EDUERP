import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-header',
  imports: [],
  host: {
    class: 'block'
  },
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div class="min-w-0">
        <h1 class="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{{ title() }}</h1>
        <p class="text-[13px] text-slate-500 mt-1 leading-relaxed">{{ subtitle() }}</p>
      </div>

      @if (actionLabel()) {
        <button
          type="button"
          (click)="actionClicked.emit()"
          class="w-full sm:w-auto h-10 px-4 text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all duration-150 cursor-pointer shrink-0 active:scale-[0.99] inline-flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span class="material-icons text-base">{{ actionIcon() }}</span>
          <span>{{ actionLabel() }}</span>
        </button>
      }
    </div>
  `
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly actionLabel = input<string>('');
  readonly actionIcon = input<string>('add');

  readonly actionClicked = output<void>();
}
