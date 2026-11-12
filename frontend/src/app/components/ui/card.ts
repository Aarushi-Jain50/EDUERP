import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card',
  imports: [],
  template: `
    <div [class]="cardClasses()">
      @if (title() || subtitle()) {
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            @if (title()) {
              <h3 class="text-lg font-semibold text-[#172554]">{{ title() }}</h3>
            }
            @if (subtitle()) {
              <p class="text-xs text-[#64748B] mt-0.5">{{ subtitle() }}</p>
            }
          </div>
          <ng-content select="[header-actions]" />
        </div>
      }
      <div [class]="bodyPadding()">
        <ng-content />
      </div>
      @if (hasFooter()) {
        <div class="px-6 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <ng-content select="[footer]" />
        </div>
      }
    </div>
  `
})
export class Card {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  readonly customClass = input<string>('');
  readonly hasFooter = input<boolean>(false);

  protected cardClasses(): string {
    return `bg-white rounded-2xl shadow-sm border border-slate-200/80 transition-all duration-200 ${this.customClass()}`;
  }

  protected bodyPadding(): string {
    switch (this.padding()) {
      case 'none': return '';
      case 'sm': return 'p-4';
      case 'lg': return 'p-8';
      case 'md': default: return 'p-6';
    }
  }
}
