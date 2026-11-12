import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button',
  imports: [],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClasses()"
      (click)="clicked.emit($event)"
    >
      @if (icon()) {
        <span class="material-icons text-lg mr-2">{{ icon() }}</span>
      }
      <ng-content />
    </button>
  `
})
export class Button {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  readonly icon = input<string>('');
  readonly customClass = input<string>('');

  readonly clicked = output<MouseEvent>();

  protected buttonClasses(): string {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D42E8]/40 disabled:opacity-50 disabled:cursor-not-allowed';
    
    let sizing = 'px-4 py-2.5 text-sm';
    if (this.size() === 'sm') sizing = 'px-3 py-1.5 text-xs';
    if (this.size() === 'lg') sizing = 'px-6 py-3.5 text-base font-semibold';

    let styling = '';
    switch (this.variant()) {
      case 'primary':
        styling = 'bg-gradient-to-r from-[#6D42E8] to-[#D946EF] text-white shadow-md hover:opacity-95 hover:shadow-lg active:scale-[0.99]';
        break;
      case 'secondary':
        styling = 'bg-[#1A1745] text-white hover:bg-[#0F0D2E] shadow-sm';
        break;
      case 'outline':
        styling = 'border border-slate-300 bg-white text-[#172554] hover:bg-slate-50 hover:border-[#6D42E8]';
        break;
      case 'danger':
        styling = 'bg-red-600 text-white hover:bg-red-700 shadow-sm';
        break;
      case 'ghost':
        styling = 'bg-transparent text-[#64748B] hover:bg-slate-100 hover:text-[#172554]';
        break;
    }

    const width = this.fullWidth() ? 'w-full' : '';

    return `${base} ${sizing} ${styling} ${width} ${this.customClass()}`;
  }
}
