import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-confirm-dialog',
  imports: [],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <button
          type="button"
          aria-label="Close dialog overlay"
          class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
          (click)="cancelled.emit()"
        ></button>

        <!-- Dialog Box -->
        <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md z-10 border border-[#E2E8F0] space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
              <span class="material-icons text-xl">delete_outline</span>
            </div>
            <div class="space-y-1 flex-1 min-w-0">
              <h3 class="text-base font-bold text-slate-900">{{ title() }}</h3>
              <p class="text-xs text-[#64748B] leading-relaxed">{{ message() }}</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              (click)="cancelled.emit()"
              class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="confirmed.emit()"
              class="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialog {
  readonly isOpen = input.required<boolean>();
  readonly title = input<string>('Delete Record');
  readonly message = input<string>('Are you sure you want to delete this record? This action cannot be undone.');
  readonly confirmLabel = input<string>('Delete Record');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
