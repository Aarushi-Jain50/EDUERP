import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-empty-state',
  imports: [],
  template: `
    <div class="py-16 px-6 text-center">
      <div class="w-12 h-12 rounded-full bg-slate-100 text-[#64748B] mx-auto flex items-center justify-center mb-3">
        <span class="material-icons text-2xl">{{ icon() }}</span>
      </div>
      <h4 class="text-sm font-bold text-slate-800">{{ title() }}</h4>
      <p class="text-xs text-[#64748B] mt-1.5 max-w-sm mx-auto leading-relaxed">{{ message() }}</p>
      @if (actionLabel()) {
        <button
          type="button"
          (click)="actionClicked.emit()"
          class="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `
})
export class EmptyState {
  readonly icon = input<string>('inbox');
  readonly title = input<string>('No records found');
  readonly message = input<string>('No items match the current search or filter criteria.');
  readonly actionLabel = input<string>('');

  readonly actionClicked = output<void>();
}
