import { ChangeDetectionStrategy, Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CurrentUserService } from '../../services/current-user.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-shell',
  imports: [RouterOutlet, RouterLink, Card, Button],
  template: `
    <div class="min-h-screen flex bg-[#F8FAFC]">
      <!-- Sidebar Navigation -->
      <aside class="w-64 gradient-brand text-white flex flex-col shadow-xl hidden md:flex shrink-0">
        <!-- Brand Header -->
        <div class="p-6 border-b border-white/10 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
            <span class="material-icons text-white text-lg">school</span>
          </div>
          <div>
            <h2 class="font-bold text-base tracking-tight">EduERP</h2>
            <p class="text-[11px] text-slate-400">University Suite</p>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main Modules</div>
          
          <a routerLink="/dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600/20 text-white border border-indigo-400/20 transition-colors">
            <span class="material-icons text-indigo-400">dashboard</span>
            <span>Dashboard</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">menu_book</span>
            <span>Academics</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">people</span>
            <span>Student Management</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">badge</span>
            <span>Faculty & Staff</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">how_to_reg</span>
            <span>Attendance & Alerts</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">assignment</span>
            <span>Exams & Results</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">payments</span>
            <span>Fees & Finance</span>
          </a>

          <a href="#" (click)="$event.preventDefault()" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <span class="material-icons text-slate-400">analytics</span>
            <span>Reports & Analytics</span>
          </a>
        </nav>

        <!-- User Profile Footer in Sidebar -->
        <div class="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div class="flex items-center gap-3 truncate">
            <div class="w-9 h-9 rounded-full bg-indigo-500/25 border border-indigo-400/30 flex items-center font-bold text-sm text-indigo-300 justify-center">
              {{ getUserInitial() }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-white truncate">{{ userEmail() }}</p>
              <p class="text-[10px] text-indigo-300 uppercase font-mono">{{ userRole() }} Portal</p>
            </div>
          </div>
          <button (click)="logout()" title="Sign Out" class="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
            <span class="material-icons text-lg">logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Top Header Bar -->
        <header class="bg-white border-b border-slate-200/90 h-16 px-6 flex items-center justify-between sticky top-0 z-20">
          <div class="flex items-center gap-4">
            <span class="text-sm font-semibold text-slate-900 tracking-tight">
              EduERP Portal · <span class="text-indigo-600 font-semibold capitalize">{{ userRole() }} Workspace</span>
            </span>
          </div>

          <div class="flex items-center gap-4">
            <app-button
              variant="outline"
              size="sm"
              icon="logout"
              (clicked)="logout()"
            >
              Sign Out
            </app-button>
          </div>
        </header>

        <!-- Viewport Content -->
        <main class="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div class="max-w-7xl mx-auto space-y-8">
            <!-- Welcome Banner -->
            <div class="gradient-brand rounded-2xl p-8 text-white relative overflow-hidden border border-slate-800">
              <div class="relative z-10 max-w-2xl">
                <h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">
                  Welcome to EduERP, <span class="text-indigo-300 capitalize">{{ userRole() }}</span>
                </h1>
                <p class="text-slate-300 text-sm lg:text-base leading-relaxed">
                  Unified university administration with Cloud SQL persistence, role-based access control, and academic operations.
                </p>
              </div>
            </div>

            <!-- Quick Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <app-card title="System Status" subtitle="Backend & DB">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-slate-900 tabular-nums">Online</span>
                  <span class="material-icons text-emerald-600 text-3xl">check_circle</span>
                </div>
                <p class="text-xs text-slate-500 mt-2">Node.js + Cloud SQL Connected</p>
              </app-card>

              <app-card title="Active Role" subtitle="Current session">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-indigo-600 uppercase tabular-nums">{{ userRole() }}</span>
                  <span class="material-icons text-indigo-600 text-3xl">verified_user</span>
                </div>
                <p class="text-xs text-slate-500 mt-2">Role-Based Access Ready</p>
              </app-card>

              <app-card title="Workspace Theme" subtitle="Interface system">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-slate-900 tabular-nums">Executive</span>
                  <span class="material-icons text-indigo-500 text-3xl">palette</span>
                </div>
                <p class="text-xs text-slate-500 mt-2">Slate & Royal Indigo</p>
              </app-card>

              <app-card title="Academic Term" subtitle="Current cycle">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-slate-900 tabular-nums">2025–26</span>
                  <span class="material-icons text-indigo-600 text-3xl">layers</span>
                </div>
                <p class="text-xs text-slate-500 mt-2">Active Semester Session</p>
              </app-card>
            </div>
          </div>
        </main>
      </div>
    </div>
  `
})
export class DashboardShell implements OnInit {
  private readonly router = inject(Router);
  private readonly userService = inject(CurrentUserService);
  private readonly platformId = inject(PLATFORM_ID);

  protected userRole = signal<string>('Student');
  protected userEmail = signal<string>('student@eduerp.edu');

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const activeRole = this.userService.syncFromStorage();
    if (activeRole === 'admin' || activeRole === 'superadmin' || activeRole === 'faculty') {
      this.router.navigateByUrl(this.userService.getHomeRoute(activeRole));
      return;
    }
    const email = localStorage.getItem('eduerp_user');
    this.userRole.set(activeRole);
    if (email) this.userEmail.set(email);
  }

  protected getUserInitial(): string {
    const email = this.userEmail();
    return email ? email.charAt(0).toUpperCase() : 'S';
  }

  protected logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
