import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from '../../components/ui/button';
import { InputComponent } from '../../components/ui/input';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  imports: [RouterLink, FormsModule, Button, InputComponent],
  template: `
    <div class="min-h-screen w-full flex flex-col lg:flex-row bg-[#F5F6FF]">
      <!-- Left Panel: Midnight Navy Gradient with Aurora Glow & Hero content -->
      <div class="lg:w-1/2 gradient-brand relative flex flex-col justify-center p-8 lg:p-16 text-white overflow-hidden">
        <!-- Soft Aurora Radial Glow -->
        <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full aurora-glow pointer-events-none"></div>
        <div class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full aurora-glow pointer-events-none"></div>

        <!-- Top Brand Wordmark -->
        <div class="absolute top-8 left-8 lg:left-16 z-10 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg">
            <span class="material-icons text-white">school</span>
          </div>
          <span class="text-xl font-bold tracking-tight">EduERP <span class="text-xs uppercase px-2 py-0.5 rounded-full bg-white/15 text-pink-300 font-mono">v2.0</span></span>
        </div>

        <!-- Hero Headline & Subtitle -->
        <div class="relative z-10 my-auto py-12 max-w-lg">
          <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            A clearer <span class="gradient-text font-extrabold">tomorrow.</span>
          </h1>
          <p class="text-slate-200 text-base lg:text-lg leading-relaxed mb-8">
            Experience the next generation Smart Educational ERP system. Unified academic management, automated attendance, advanced analytics, and real-time role-based collaboration.
          </p>

          <!-- Glassmorphism Feature Card with Refined Spacing & Border -->
          <div class="glass-dark p-7 rounded-2xl border border-white/25 shadow-2xl space-y-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/30 flex items-center justify-center text-pink-300 shadow-inner">
                  <span class="material-icons">analytics</span>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white">Real-Time Performance Analytics</h4>
                  <p class="text-xs text-slate-300 mt-0.5">Live student tracking & grading matrix</p>
                </div>
              </div>
              <span class="text-xs font-mono font-semibold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">Active 99.9%</span>
            </div>
            <div class="grid grid-cols-3 gap-4 pt-4 border-t border-white/15 text-center">
              <div>
                <p class="text-xl font-extrabold text-white tabular-nums">4,850+</p>
                <p class="text-[11px] font-medium text-slate-300 mt-0.5">Active Students</p>
              </div>
              <div>
                <p class="text-xl font-extrabold text-white tabular-nums">280+</p>
                <p class="text-[11px] font-medium text-slate-300 mt-0.5">Faculty Members</p>
              </div>
              <div>
                <p class="text-xl font-extrabold text-white tabular-nums">98.4%</p>
                <p class="text-[11px] font-medium text-slate-300 mt-0.5">Attendance Avg</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Clean White Login Form -->
      <div class="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-[#F5F6FF]">
        <div class="w-full max-w-md space-y-7">
          <!-- Header -->
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-[#172554]">Welcome Back</h2>
            <p class="text-sm font-medium text-[#64748B] mt-1.5">Sign in to your account to access your institutional portal.</p>
          </div>

          <!-- Refined High-Contrast Role Selector Tabs -->
          <div class="space-y-2">
            <div class="block text-xs font-bold uppercase tracking-wider text-[#1E293B]">Select Portal Role</div>
            <div class="grid grid-cols-4 gap-2 bg-slate-200/90 p-1.5 rounded-xl shadow-inner">
              @for (r of roles; track r.id) {
                <button
                  type="button"
                  (click)="selectRole(r.id)"
                  [class]="selectedRole() === r.id ? 'bg-[#6D42E8] text-white shadow-md font-bold' : 'text-slate-800 bg-white/70 hover:bg-white font-semibold border border-slate-200/80'"
                  class="py-2.5 px-2 text-xs rounded-lg transition-all text-center truncate cursor-pointer"
                >
                  {{ r.name }}
                </button>
              }
            </div>
          </div>

          <!-- Login Form -->
          <form (submit)="onLogin($event)" class="space-y-5">
            <app-input
              label="Institutional Email"
              type="email"
              placeholder="e.g. admin&#64;eduerp.edu"
              icon="mail"
              [required]="true"
              [(value)]="email"
            />

            <app-input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon="lock"
              [required]="true"
              [(value)]="password"
            />

            <div class="flex items-center justify-between text-xs">
              <label class="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input id="remember-device" type="checkbox" class="rounded border-slate-300 text-[#6D42E8] focus:ring-[#6D42E8]" />
                <span>Remember this device</span>
              </label>
              <a href="#" class="text-[#6D42E8] font-semibold hover:underline">Forgot password?</a>
            </div>

            @if (errorMessage()) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2 shadow-xs">
                <span class="material-icons text-sm">error</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <app-button
              type="submit"
              variant="primary"
              size="lg"
              [fullWidth]="true"
              icon="login"
            >
              Sign In to {{ getRoleName() }} Portal
            </app-button>
          </form>

          <!-- Register Link -->
          <div class="text-center pt-2 text-sm text-[#64748B] font-medium">
            Don't have an account yet?
            <a routerLink="/register" class="text-[#6D42E8] font-bold hover:underline ml-1">Register New Account</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class Login {
  private readonly router = inject(Router);

  protected readonly roles = [
    { id: 'admin', name: 'Admin', email: 'admin@eduerp.edu', pass: 'admin123' },
    { id: 'faculty', name: 'Faculty', email: 'faculty@eduerp.edu', pass: 'faculty123' },
    { id: 'student', name: 'Student', email: 'student@eduerp.edu', pass: 'student123' },
    { id: 'parent', name: 'Parent', email: 'parent@eduerp.edu', pass: 'parent123' },
  ];

  protected selectedRole = signal<string>('admin');
  protected email = signal<string>('admin@eduerp.edu');
  protected password = signal<string>('admin123');
  protected errorMessage = signal<string>('');

  protected selectRole(roleId: string): void {
    this.selectedRole.set(roleId);
    const found = this.roles.find(r => r.id === roleId);
    if (found) {
      this.email.set(found.email);
      this.password.set(found.pass);
    }
    this.errorMessage.set('');
  }

  protected getRoleName(): string {
    const found = this.roles.find(r => r.id === this.selectedRole());
    return found ? found.name : 'Admin';
  }

  protected onLogin(event: Event): void {
    event.preventDefault();
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }
    localStorage.setItem('eduerp_role', this.selectedRole());
    localStorage.setItem('eduerp_user', this.email());
    this.router.navigate(['/dashboard']);
  }
}
