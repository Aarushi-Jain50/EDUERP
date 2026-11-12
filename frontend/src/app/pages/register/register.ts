import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from '../../components/ui/button';
import { InputComponent } from '../../components/ui/input';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register',
  imports: [RouterLink, FormsModule, Button, InputComponent],
  template: `
    <div class="min-h-screen w-full flex flex-col lg:flex-row bg-[#F5F6FF]">
      <!-- Left Panel: Midnight Navy Gradient -->
      <div class="lg:w-1/2 gradient-brand relative flex flex-col justify-between p-8 lg:p-16 text-white overflow-hidden">
        <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full aurora-glow pointer-events-none"></div>

        <div class="relative z-10 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg">
            <span class="material-icons text-white">school</span>
          </div>
          <span class="text-xl font-bold tracking-tight">EduERP <span class="text-xs uppercase px-2 py-0.5 rounded-full bg-white/10 text-pink-300 font-mono">v2.0</span></span>
        </div>

        <div class="relative z-10 my-auto py-12 max-w-lg">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-xs font-medium text-pink-300 mb-6">
            <span class="material-icons text-sm">person_add</span> Institutional Onboarding
          </div>
          <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Join the academic <span class="gradient-text font-extrabold">ecosystem.</span>
          </h1>
          <p class="text-slate-300 text-base lg:text-lg leading-relaxed mb-8">
            Register your institutional account for MCA Semester IV Major Project ERP. Manage academics, attendance, examinations, and fee ledger securely.
          </p>

          <div class="glass-dark p-6 rounded-2xl border border-white/15 space-y-3">
            <div class="flex items-center gap-3">
              <span class="material-icons text-emerald-400">check_circle</span>
              <span class="text-sm text-white font-medium">Role-Based Granular Access Control</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="material-icons text-emerald-400">check_circle</span>
              <span class="text-sm text-white font-medium">Automated Attendance & SMS Alerts</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="material-icons text-emerald-400">check_circle</span>
              <span class="text-sm text-white font-medium">Encrypted MySQL & JWT Backend</span>
            </div>
          </div>
        </div>

        <div class="relative z-10 text-xs text-slate-400">
          <p>© 2026 EduERP Systems Inc. All rights reserved.</p>
        </div>
      </div>

      <!-- Right Panel: Registration Form -->
      <div class="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-[#F5F6FF]">
        <div class="w-full max-w-md space-y-6">
          <div>
            <h2 class="text-3xl font-bold tracking-tight text-[#172554]">Create Account</h2>
            <p class="text-sm text-[#64748B] mt-1">Register as Student, Faculty, Parent or Administrator.</p>
          </div>

          <!-- Role Selector -->
          <div class="space-y-1.5">
            <div class="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">Register As</div>
            <div class="grid grid-cols-4 gap-2 bg-slate-200/70 p-1.5 rounded-xl">
              @for (r of roles; track r.id) {
                <button
                  type="button"
                  (click)="selectedRole.set(r.id)"
                  [class]="selectedRole() === r.id ? 'bg-white text-[#6D42E8] shadow-sm font-semibold' : 'text-[#64748B] hover:text-[#172554] font-medium'"
                  class="py-2 px-1 text-xs rounded-lg transition-all text-center truncate cursor-pointer"
                >
                  {{ r.name }}
                </button>
              }
            </div>
          </div>

          <form (submit)="onRegister($event)" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <app-input
                label="First Name"
                placeholder="Aarushi"
                icon="person"
                [required]="true"
                [(value)]="firstName"
              />
              <app-input
                label="Last Name"
                placeholder="Jain"
                icon="person_outline"
                [required]="true"
                [(value)]="lastName"
              />
            </div>

            <app-input
              label="Institutional Email"
              type="email"
              placeholder="user&#64;eduerp.edu"
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

            <app-input
              label="Confirm Password"
              type="password"
              placeholder="••••••••••••"
              icon="lock_reset"
              [required]="true"
              [(value)]="confirmPassword"
            />

            @if (errorMessage()) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <span class="material-icons text-sm">error</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            @if (successMessage()) {
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <span class="material-icons text-sm">check_circle</span>
                <span>{{ successMessage() }}</span>
              </div>
            }

            <app-button
              type="submit"
              variant="primary"
              size="lg"
              [fullWidth]="true"
              icon="how_to_reg"
            >
              Complete Registration
            </app-button>
          </form>

          <div class="text-center pt-2 text-sm text-[#64748B]">
            Already have an account?
            <a routerLink="/login" class="text-[#6D42E8] font-semibold hover:underline ml-1">Sign In Here</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class Register {
  private readonly router = inject(Router);

  protected readonly roles = [
    { id: 'student', name: 'Student' },
    { id: 'faculty', name: 'Faculty' },
    { id: 'parent', name: 'Parent' },
    { id: 'admin', name: 'Admin' },
  ];

  protected selectedRole = signal<string>('student');
  protected firstName = signal<string>('');
  protected lastName = signal<string>('');
  protected email = signal<string>('');
  protected password = signal<string>('');
  protected confirmPassword = signal<string>('');
  protected errorMessage = signal<string>('');
  protected successMessage = signal<string>('');

  protected onRegister(event: Event): void {
    event.preventDefault();
    if (!this.firstName() || !this.lastName() || !this.email() || !this.password() || !this.confirmPassword()) {
      this.errorMessage.set('Please fill in all required registration fields.');
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('Registration successful! Redirecting to login...');
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1500);
  }
}
