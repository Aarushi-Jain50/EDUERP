import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-status-badge',
  imports: [],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border uppercase"
      [class]="badgeClasses()"
    >
      <span class="w-1.5 h-1.5 rounded-full" [class]="dotClass()"></span>
      <span>{{ status() }}</span>
    </span>
  `
})
export class StatusBadge {
  readonly status = input.required<string>();

  protected badgeClasses(): string {
    const s = this.status().toLowerCase();
    switch (s) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'upcoming':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'inactive':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  protected dotClass(): string {
    const s = this.status().toLowerCase();
    switch (s) {
      case 'active':
        return 'bg-emerald-500';
      case 'upcoming':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-slate-400';
      case 'inactive':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  }
}
