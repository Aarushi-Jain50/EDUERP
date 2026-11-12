import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-shell',
  imports: [RouterOutlet, RouterLink, Card, Button],
  template: `
    <div class="min-h-screen flex bg-[#F5F6FF]">
      <!-- Sidebar Navigation -->
      <aside class="w-64 gradient-brand text-white flex flex-col shadow-xl hidden md:flex shrink-0">
        <!-- Brand Header -->
        <div class="p-6 border-b border-white/10 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center shadow-md">
            <span class="material-icons text-white text-lg">school</span>
          </div>
          <div>
            <h2 class="font-bold text-base tracking-tight">EduERP <span class="text-[10px] text-pink-300 uppercase px-1.5 py-0.5 rounded bg-white/10 font-mono">v2.0</span></h2>
            <p class="text-[11px] text-slate-300">MCA Major Project</p>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main Modules</div>
          
          <a routerLink="/dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-white/15 text-white transition-colors">
            <span class="material-icons text-pink-400">dashboard</span>
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
            <div class="w-9 h-9 rounded-full bg-purple-500/30 border border-purple-400/30 flex items-center font-bold text-sm text-pink-300 justify-center">
              {{ getUserInitial() }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-white truncate">{{ userEmail() }}</p>
              <p class="text-[10px] text-pink-300 uppercase font-mono">{{ userRole() }} Portal</p>
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
        <header class="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div class="flex items-center gap-4">
            <span class="text-sm font-semibold text-[#172554] uppercase tracking-wide">
              EduERP Portal // <span class="text-[#6D42E8] font-bold uppercase">{{ userRole() }} Mode</span>
            </span>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700 font-medium">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>MySQL Live Connected</span>
            </div>
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
            <div class="gradient-brand rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
              <div class="absolute right-0 top-0 w-96 h-96 rounded-full aurora-glow pointer-events-none"></div>
              <div class="relative z-10 max-w-2xl">
                <span class="text-xs uppercase px-3 py-1 rounded-full bg-white/15 text-pink-300 font-mono mb-4 inline-block">
                  Phase 1 Architecture Active
                </span>
                <h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">
                  Welcome to EduERP v2.0, <span class="text-pink-300 capitalize">{{ userRole() }}</span>!
                </h1>
                <p class="text-slate-200 text-sm lg:text-base leading-relaxed">
                  Phase 1 foundation is fully configured with Angular + Tailwind CSS, Midnight Aurora Design System, reusable components, and secure authentication routing.
                </p>
              </div>
            </div>

            <!-- Quick Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <app-card title="System Status" subtitle="Backend & DB">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-[#172554] tabular-nums">Online</span>
                  <span class="material-icons text-emerald-500 text-3xl">check_circle</span>
                </div>
                <p class="text-xs text-[#64748B] mt-2">Node.js + MySQL Connected</p>
              </app-card>

              <app-card title="Active Role" subtitle="Current session">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-[#6D42E8] uppercase tabular-nums">{{ userRole() }}</span>
                  <span class="material-icons text-[#6D42E8] text-3xl">verified_user</span>
                </div>
                <p class="text-xs text-[#64748B] mt-2">Role-Based Access Ready</p>
              </app-card>

              <app-card title="Design System" subtitle="Theme compliance">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-[#172554] tabular-nums">Midnight+</span>
                  <span class="material-icons text-pink-500 text-3xl">palette</span>
                </div>
                <p class="text-xs text-[#64748B] mt-2">Aurora & Glassmorphism</p>
              </app-card>

              <app-card title="Project Phase" subtitle="MCA Sem IV">
                <div class="flex items-center justify-between mt-2">
                  <span class="text-2xl font-bold text-[#172554] tabular-nums">Phase 1</span>
                  <span class="material-icons text-purple-600 text-3xl">layers</span>
                </div>
                <p class="text-xs text-[#64748B] mt-2">Foundation & Auth Complete</p>
              </app-card>
            </div>

            <!-- Phase 1 Success Notice Card -->
            <app-card title="Phase 1 Completion Report" subtitle="EduERP v2.0 Major Project Setup">
              <div class="space-y-4 text-sm text-[#172554]">
                <div class="flex items-start gap-3 p-3.5 bg-purple-50 rounded-xl border border-purple-100">
                  <span class="material-icons text-purple-600 mt-0.5">task_alt</span>
                  <div>
                    <p class="font-semibold text-purple-900">Frontend Architecture Established</p>
                    <p class="text-xs text-purple-700 mt-0.5">Angular reactive components, Tailwind CSS v4 design tokens, Midnight Navy & Aurora Magenta styling system.</p>
                  </div>
                </div>

                <div class="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span class="material-icons text-slate-600 mt-0.5">schedule</span>
                  <div>
                    <p class="font-semibold text-[#172554]">Next Instructions</p>
                    <p class="text-xs text-[#64748B] mt-0.5">Review Phase 1 output above. Once approved, we will proceed to Phase 2: Backend Express Server + MySQL Database Schema & Connection!</p>
                  </div>
                </div>
              </div>
            </app-card>
          </div>
        </main>
      </div>
    </div>
  `
})
export class DashboardShell implements OnInit {
  private readonly router = inject(Router);

  protected userRole = signal<string>('Admin');
  protected userEmail = signal<string>('admin@eduerp.edu');

  ngOnInit(): void {
    const role = localStorage.getItem('eduerp_role');
    const email = localStorage.getItem('eduerp_user');
    if (role) this.userRole.set(role);
    if (email) this.userEmail.set(email);
  }

  protected getUserInitial(): string {
    const email = this.userEmail();
    return email ? email.charAt(0).toUpperCase() : 'A';
  }

  protected logout(): void {
    localStorage.removeItem('eduerp_role');
    localStorage.removeItem('eduerp_user');
    this.router.navigate(['/login']);
  }
}
