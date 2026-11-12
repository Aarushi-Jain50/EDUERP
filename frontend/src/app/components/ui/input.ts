import { ChangeDetectionStrategy, Component, forwardRef, input, model } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-input',
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-1.5 w-full">
      @if (label()) {
        <label [for]="inputId()" class="block text-xs font-bold uppercase tracking-wider text-[#1E293B]">
          {{ label() }}
          @if (required()) {
            <span class="text-pink-600 ml-0.5">*</span>
          }
        </label>
      }
      <div class="relative rounded-xl shadow-xs">
        @if (icon()) {
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <span class="material-icons text-lg">{{ icon() }}</span>
          </div>
        }
        <input
          [id]="inputId()"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [class]="inputClasses()"
        />
      </div>
      @if (error()) {
        <p class="text-xs text-red-600 mt-1 font-medium">{{ error() }}</p>
      }
    </div>
  `
})
export class InputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly icon = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly error = input<string>('');
  readonly inputId = input<string>('input-' + Math.random().toString(36).substr(2, 9));

  readonly value = model<string>('');

  private onChange: (val: string) => void = () => { /* noop */ };
  protected onTouched: () => void = () => { /* noop */ };

  writeValue(val: string): void {
    this.value.set(val || '');
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(): void {
    // noop
  }

  protected onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  protected inputClasses(): string {
    const paddingLeft = this.icon() ? 'pl-11' : 'pl-4';
    return `w-full bg-white border border-slate-300 hover:border-slate-400 rounded-xl py-3 pr-4 ${paddingLeft} text-sm text-[#172554] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D42E8]/40 focus:border-[#6D42E8] transition-all disabled:bg-slate-100 disabled:cursor-not-allowed`;
  }
}
