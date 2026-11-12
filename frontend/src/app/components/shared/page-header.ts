import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-header',
  imports: [],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">{{ title() }}</h1>
        <p class="text-[13px] text-[#64748B] mt-1 leading-relaxed">{{ subtitle() }}</p>
      </div>

      @if (actionLabel()) {
        <button
          type="button"
          (click)="actionClicked.emit()"
          class="h-10 px-4 text-[13px] font-semibold text-white bg-gradient-to-r from-[#6D42E8] to-[#D946EF] hover:opacity-95 rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-[0.99] inline-flex items-center justify-center gap-1.5"
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
