import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-faculty-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
      <div class="w-16 h-16 rounded-2xl bg-purple-50 text-[#6D42E8] flex items-center justify-center mb-4 border border-purple-100">
        <mat-icon class="text-3xl">construction</mat-icon>
      </div>
      <h2 class="text-xl font-extrabold text-[#172554] tracking-tight">Module Coming Soon</h2>
      <p class="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">This faculty sub-module is currently in development and will be fully wired in the next update.</p>
      <a routerLink="/faculty/dashboard" class="mt-6 bg-[#6D42E8] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-900/30 transition-all flex items-center gap-2">
        <mat-icon class="text-sm">arrow_back</mat-icon> Return to Dashboard
      </a>
    </div>
  `
})
export class FacultyComingSoon {}
