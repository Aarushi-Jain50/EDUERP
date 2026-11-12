import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-form-drawer',
  imports: [],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 overflow-hidden">
        <!-- Backdrop -->
        <button
          type="button"
          aria-label="Close drawer overlay"
          class="fixed inset-0 bg-black/40 backdrop-blur-xs w-full h-full border-0 cursor-default transition-opacity"
          (click)="closed.emit()"
        ></button>

        <!-- Right Slide-in Drawer Container -->
        <div [class]="'fixed inset-y-0 right-0 w-full bg-white shadow-2xl z-10 flex flex-col border-l border-[#E2E8F0] transform transition-transform duration-200 ease-in-out ' + widthClass()">
          
          <!-- Drawer Header -->
          <div class="px-6 py-4.5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-slate-50/60">
            <div>
              <h2 class="text-base font-bold text-slate-900 tracking-tight">{{ title() }}</h2>
              <p class="text-xs text-[#64748B] mt-0.5">{{ subtitle() }}</p>
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              class="w-8 h-8 rounded-lg text-[#64748B] hover:text-slate-800 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            >
              <span class="material-icons text-lg">close</span>
            </button>
          </div>

          <!-- Drawer Form Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-xs sm:text-[13px]">
            <ng-content />
          </div>

          <!-- Drawer Footer -->
          <div class="px-6 py-4 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              (click)="closed.emit()"
              class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              {{ showSaveButton() ? 'Cancel' : 'Close' }}
            </button>
            @if (showSaveButton()) {
              <button
                type="button"
                [disabled]="isSubmitting()"
                (click)="saved.emit()"
                class="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#6D42E8] to-[#D946EF] hover:opacity-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ saveLabel() }}
              </button>
            }
          </div>

        </div>
      </div>
    }
  `
})
export class FormDrawer {
  readonly isOpen = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('Fill in the details below and save.');
  readonly saveLabel = input<string>('Save Record');
  readonly isSubmitting = input<boolean>(false);
  readonly widthClass = input<string>('max-w-[420px]');
  readonly showSaveButton = input<boolean>(true);

  readonly closed = output<void>();
  readonly saved = output<void>();
}
