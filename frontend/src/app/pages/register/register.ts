import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { animate, stagger } from 'motion';
import { AuthSessionService } from '../../services/auth-session.service';
import { CurrentUserService, UserRole } from '../../services/current-user.service';
import { SettingsService } from '../../services/settings.service';
import { AcademicService } from '../../services/academic.service';
import { AuditService } from '../../services/audit.service';

type PublicRegisterRole = 'faculty' | 'student' | 'parent';

interface DestinationOption {
  label: string;
  route: string;
  icon: string;
}

interface OnboardingHighlight {
  index: string;
  title: string;
  summary: string;
  route: string;
  routeLabel: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface RoleOnboardingConfig {
  id: PublicRegisterRole;
  apiRole: 'FACULTY' | 'STUDENT' | 'PARENT';
  name: string;
  cardTitle: string;
  cardSummary: string;
  icon: string;
  formTitle: string;
  formSubtitle: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierIcon: string;
  unitLabel: string;
  unitMode: 'department' | 'program' | 'ward';
  unitPlaceholder: string;
  destinations: readonly DestinationOption[];
  highlights: readonly OnboardingHighlight[];
  faqs: readonly FaqItem[];
}

interface RegisteredAccountSummary {
  id: string;
  name: string;
  username: string;
  email: string;
  role: PublicRegisterRole;
  roleLabel: string;
}

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirmPassword = control.get('confirmPassword')?.value as string | undefined;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register',
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  host: {
    class: 'block min-h-screen'
  },
  template: `
    <div class="min-h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900">

      <!-- Top 3-Zone Institutional Header -->
      <header class="w-full border-b border-slate-200/90 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-8">
          <a routerLink="/login" class="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <mat-icon class="text-lg">school</mat-icon>
            </div>
            <span
              class="text-lg font-bold tracking-tight text-slate-900"
              style="font-family: 'Plus Jakarta Sans', sans-serif;"
            >
              EduERP
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
            <span class="whitespace-nowrap shrink-0 text-slate-900 font-semibold">{{ institute().name }}</span>
            <span aria-hidden="true">·</span>
            <span class="whitespace-nowrap shrink-0 tabular-nums">Session {{ currentAcademicYear() }}</span>
            <span aria-hidden="true">·</span>
            <span class="whitespace-nowrap shrink-0">{{ institute().email }}</span>
          </nav>

          <div class="flex items-center gap-3 shrink-0">
            <a
              routerLink="/login"
              class="px-3 sm:px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-600 hover:text-indigo-600 text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      <!-- Main Studio Workspace -->
      <main #studioRoot class="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10 space-y-5 sm:space-y-7">

        <!-- Interactive 3-Portal Role Selector Dock -->
        <section aria-label="Select Account Role" class="space-y-3 stagger-block">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1
                class="text-xl sm:text-3xl font-bold tracking-tight text-slate-900"
                style="font-family: 'Plus Jakarta Sans', sans-serif; text-wrap: balance;"
              >
                Create your institutional account
              </h1>
              <p class="text-xs sm:text-[13px] text-slate-500 mt-1">
                Choose your academic role below to configure institutional verification, portal access, and onboarding.
              </p>
            </div>
            <span class="hidden sm:inline text-xs text-slate-500">
              Use arrow keys or click to switch roles
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Registration roles"
            class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3"
          >
            @for (role of roleConfigs; track role.id) {
              @let isActive = selectedRole() === role.id;
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="isActive"
                (click)="selectRole(role.id)"
                (keydown)="onDockKeydown($event)"
                [class]="isActive
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                  : 'bg-white text-slate-900 border-slate-200/90 hover:border-indigo-600/50 hover:bg-white'"
                class="p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <div
                  [class]="isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'"
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                >
                  <mat-icon class="text-xl">{{ role.icon }}</mat-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="text-sm font-bold truncate"
                      style="font-family: 'Plus Jakarta Sans', sans-serif;"
                    >
                      {{ role.cardTitle }}
                    </span>
                    @if (isActive) {
                      <mat-icon class="text-sm text-indigo-400 shrink-0">check_circle</mat-icon>
                    }
                  </div>
                  <p
                    [class]="isActive ? 'text-slate-300' : 'text-slate-500'"
                    class="text-xs mt-1 leading-snug line-clamp-2"
                  >
                    {{ role.cardSummary }}
                  </p>
                </div>
              </button>
            }
          </div>
        </section>

        <!-- Dual-Zone Interactive Registration & Campus Onboarding Workbench -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch stagger-block">

          <!-- Left Zone (6 cols): Interactive Registration Console -->
          <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-8 flex flex-col justify-between min-w-0">
            @if (!registeredAccount()) {
              <div class="space-y-5 sm:space-y-6">
                <!-- Role-Specific Header -->
                <div class="flex items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-200/90">
                  <div class="space-y-1 min-w-0">
                    <h2
                      class="text-lg sm:text-2xl font-bold tracking-tight text-slate-900"
                      style="font-family: 'Plus Jakarta Sans', sans-serif;"
                    >
                      {{ activeConfig().formTitle }}
                    </h2>
                    <p class="text-xs sm:text-[13px] text-slate-500">
                      {{ activeConfig().formSubtitle }}
                    </p>
                  </div>
                  <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <mat-icon class="text-xl">{{ activeConfig().icon }}</mat-icon>
                  </div>
                </div>

                <!-- Reactive Registration Form -->
                <form [formGroup]="registerForm" (ngSubmit)="onRegister()" autocomplete="off" class="space-y-4">
                  <!-- Name Row -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div class="space-y-1.5">
                      <label for="reg-first-name" class="block text-xs font-semibold text-slate-900">
                        First Name
                      </label>
                      <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <mat-icon class="text-base">person</mat-icon>
                        </span>
                        <input
                          id="reg-first-name"
                          type="text"
                          formControlName="firstName"
                          autocomplete="off"
                          placeholder="First name"
                          class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                        />
                      </div>
                      @if (registerForm.controls.firstName.touched && registerForm.controls.firstName.invalid) {
                        <p class="text-[11px] text-rose-600 font-medium">Enter at least 2 characters.</p>
                      }
                    </div>

                    <div class="space-y-1.5">
                      <label for="reg-last-name" class="block text-xs font-semibold text-slate-900">
                        Last Name
                      </label>
                      <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <mat-icon class="text-base">person_outline</mat-icon>
                        </span>
                        <input
                          id="reg-last-name"
                          type="text"
                          formControlName="lastName"
                          autocomplete="off"
                          placeholder="Last name"
                          class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                        />
                      </div>
                      @if (registerForm.controls.lastName.touched && registerForm.controls.lastName.invalid) {
                        <p class="text-[11px] text-rose-600 font-medium">Enter at least 2 characters.</p>
                      }
                    </div>
                  </div>

                  <!-- Institutional Email -->
                  <div class="space-y-1.5">
                    <label for="reg-email" class="block text-xs font-semibold text-slate-900">
                      Institutional Email Address
                    </label>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <mat-icon class="text-base">mail</mat-icon>
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        formControlName="email"
                        autocomplete="off"
                        placeholder="name@eduerp.edu"
                        class="w-full h-11 pl-9 pr-9 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                      />
                      @if (registerForm.controls.email.value) {
                        <button
                          type="button"
                          (click)="clearEmail()"
                          aria-label="Clear email"
                          class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 cursor-pointer"
                        >
                          <mat-icon class="text-sm">close</mat-icon>
                        </button>
                      }
                    </div>
                    @if (registerForm.controls.email.touched && registerForm.controls.email.invalid) {
                      <p class="text-[11px] text-rose-600 font-medium">
                        Please enter a valid institutional email address.
                      </p>
                    }
                  </div>

                  <!-- Role-Specific Institutional Linkage -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div class="space-y-1.5">
                      <label for="reg-identifier-code" class="block text-xs font-semibold text-slate-900">
                        {{ activeConfig().identifierLabel }}
                      </label>
                      <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <mat-icon class="text-base">{{ activeConfig().identifierIcon }}</mat-icon>
                        </span>
                        <input
                          id="reg-identifier-code"
                          type="text"
                          formControlName="identifierCode"
                          autocomplete="off"
                          [placeholder]="activeConfig().identifierPlaceholder"
                          class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                        />
                      </div>
                    </div>

                    <div class="space-y-1.5">
                      <label for="reg-unit" class="block text-xs font-semibold text-slate-900">
                        {{ activeConfig().unitLabel }}
                      </label>
                      @if (activeConfig().unitMode === 'department') {
                        <div class="relative">
                          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <mat-icon class="text-base">apartment</mat-icon>
                          </span>
                          <select
                            id="reg-unit"
                            formControlName="departmentOrProgram"
                            class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                          >
                            <option value="">Select department (optional)</option>
                            @for (dept of departmentOptions(); track dept) {
                              <option [value]="dept">{{ dept }}</option>
                            }
                          </select>
                        </div>
                      } @else if (activeConfig().unitMode === 'program') {
                        <div class="relative">
                          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <mat-icon class="text-base">menu_book</mat-icon>
                          </span>
                          <select
                            id="reg-unit"
                            formControlName="departmentOrProgram"
                            class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                          >
                            <option value="">Select program (optional)</option>
                            @for (prog of courseOptions(); track prog) {
                              <option [value]="prog">{{ prog }}</option>
                            }
                          </select>
                        </div>
                      } @else {
                        <div class="relative">
                          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <mat-icon class="text-base">badge</mat-icon>
                          </span>
                          <input
                            id="reg-unit"
                            type="text"
                            formControlName="departmentOrProgram"
                            autocomplete="off"
                            [placeholder]="activeConfig().unitPlaceholder"
                            class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                          />
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Password & Strength Feedback -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <label for="reg-password" class="block text-xs font-semibold text-slate-900">
                        Account Password
                      </label>
                      @if (capsLockActive()) {
                        <span class="text-[11px] font-medium text-amber-700 inline-flex items-center gap-1">
                          <mat-icon class="text-xs">keyboard_capslock</mat-icon>
                          <span>Caps Lock active</span>
                        </span>
                      } @else if (passwordInputValue()) {
                        <span class="text-[11px] font-medium tabular-nums" [class]="strengthTextClass()">
                          {{ passwordStrengthLabel() }} · {{ passwordScore() }}/4
                        </span>
                      }
                    </div>

                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <mat-icon class="text-base">lock</mat-icon>
                      </span>
                      <input
                        id="reg-password"
                        [type]="showPassword() ? 'text' : 'password'"
                        formControlName="password"
                        autocomplete="new-password"
                        (input)="onPasswordInput()"
                        (keydown)="checkCapsLock($event)"
                        (keyup)="checkCapsLock($event)"
                        placeholder="Create a secure password (min. 6 chars)"
                        class="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                      />
                      <button
                        type="button"
                        (click)="togglePasswordVisibility()"
                        [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 cursor-pointer"
                      >
                        <mat-icon class="text-base">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </div>

                    @if (passwordInputValue()) {
                      <div class="grid grid-cols-4 gap-1.5 pt-1" aria-hidden="true">
                        @for (idx of [1, 2, 3, 4]; track idx) {
                          <div
                            class="h-1 rounded-full transition-colors"
                            [class]="passwordScore() >= idx ? strengthBarClass() : 'bg-slate-200'"
                          ></div>
                        }
                      </div>
                    }

                    @if (registerForm.controls.password.touched && registerForm.controls.password.invalid) {
                      <p class="text-[11px] text-rose-600 font-medium">
                        Password must be at least 6 characters long.
                      </p>
                    }
                  </div>

                  <!-- Confirm Password -->
                  <div class="space-y-1.5">
                    <label for="reg-confirm-password" class="block text-xs font-semibold text-slate-900">
                      Confirm Password
                    </label>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <mat-icon class="text-base">lock_reset</mat-icon>
                      </span>
                      <input
                        id="reg-confirm-password"
                        [type]="showConfirmPassword() ? 'text' : 'password'"
                        formControlName="confirmPassword"
                        autocomplete="new-password"
                        placeholder="Re-enter your password"
                        class="w-full h-11 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                      />
                      <button
                        type="button"
                        (click)="toggleConfirmPasswordVisibility()"
                        [attr.aria-label]="showConfirmPassword() ? 'Hide confirm password' : 'Show confirm password'"
                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 cursor-pointer"
                      >
                        <mat-icon class="text-base">{{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </div>
                    @if (
                      registerForm.controls.confirmPassword.touched &&
                      (registerForm.controls.confirmPassword.invalid || registerForm.hasError('passwordMismatch'))
                    ) {
                      <p class="text-[11px] text-rose-600 font-medium">
                        Passwords must match exactly.
                      </p>
                    }
                  </div>

                  <!-- Role-Specific Landing Workspace Picker -->
                  <div class="space-y-2 pt-1">
                    <div class="flex items-center justify-between gap-2 text-xs">
                      <span class="font-semibold text-slate-900">Open After Registration</span>
                      <span class="text-slate-500 truncate">{{ selectedDestinationLabel() }}</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      @for (dest of activeConfig().destinations; track dest.route) {
                        <button
                          type="button"
                          (click)="selectedDestinationRoute.set(dest.route)"
                          [class]="activeDestinationRoute() === dest.route
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
                            : 'bg-slate-50 text-slate-500 border-slate-200/90 hover:text-slate-900 font-medium'"
                          class="py-2 px-2 rounded-xl border text-[11px] transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer min-w-0"
                        >
                          <mat-icon class="text-xs shrink-0">{{ dest.icon }}</mat-icon>
                          <span class="truncate">{{ dest.label }}</span>
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Terms Acceptance -->
                  <div class="space-y-1 pt-1">
                    <label class="inline-flex items-start gap-2.5 cursor-pointer text-xs text-slate-500 hover:text-slate-900">
                      <input
                        type="checkbox"
                        formControlName="acceptTerms"
                        class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <span>
                        I confirm my institutional affiliation with {{ institute().name }} and agree to campus portal access policies.
                      </span>
                    </label>
                    @if (registerForm.controls.acceptTerms.touched && registerForm.controls.acceptTerms.invalid) {
                      <p class="text-[11px] text-rose-600 font-medium pl-6">
                        Please confirm institutional access terms to continue.
                      </p>
                    }
                  </div>

                  @if (errorMessage()) {
                    <div
                      role="alert"
                      class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2"
                    >
                      <mat-icon class="text-base shrink-0">error_outline</mat-icon>
                      <span>{{ errorMessage() }}</span>
                    </div>
                  }

                  <button
                    type="submit"
                    [disabled]="isRegistering()"
                    class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    @if (isRegistering()) {
                      <mat-icon class="text-base animate-spin shrink-0">progress_activity</mat-icon>
                      <span>Creating {{ activeConfig().name }} Account...</span>
                    } @else {
                      <mat-icon class="text-base shrink-0">how_to_reg</mat-icon>
                      <span>Create {{ activeConfig().name }} Account</span>
                    }
                  </button>
                </form>
              </div>

              <div class="pt-5 mt-6 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Already have an active portal account?</span>
                <a routerLink="/login" class="text-indigo-600 font-semibold hover:underline">
                  Sign in to {{ institute().name }}
                </a>
              </div>
            } @else {
              <!-- Provisioned Account Confirmation State -->
              @let created = registeredAccount()!;
              <div class="space-y-6">
                <div class="flex items-start justify-between gap-4 pb-5 border-b border-slate-200/90">
                  <div class="space-y-1 min-w-0">
                    <h2
                      class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                      style="font-family: 'Plus Jakarta Sans', sans-serif;"
                    >
                      Account Registered
                    </h2>
                    <p class="text-xs sm:text-[13px] text-slate-500">
                      Your institutional {{ created.roleLabel }} credentials have been provisioned and saved.
                    </p>
                  </div>
                  <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                    <mat-icon class="text-2xl">check_circle</mat-icon>
                  </div>
                </div>

                <div class="divide-y divide-slate-200/80 text-xs">
                  <div class="py-3 flex items-center justify-between gap-4">
                    <span class="text-slate-500">Full Name</span>
                    <span class="font-semibold text-slate-900 text-right">{{ created.name }}</span>
                  </div>
                  <div class="py-3 flex items-center justify-between gap-4">
                    <span class="text-slate-500">Portal Role</span>
                    <span class="font-semibold text-indigo-600 text-right">{{ created.roleLabel }}</span>
                  </div>
                  <div class="py-3 flex items-center justify-between gap-4">
                    <span class="text-slate-500">Institutional Email</span>
                    <span class="font-semibold text-slate-900 text-right truncate">{{ created.email }}</span>
                  </div>
                  <div class="py-3 flex items-center justify-between gap-4">
                    <span class="text-slate-500">Assigned Username</span>
                    <span
                      class="font-semibold text-slate-900 tabular-nums text-right"
                      style="font-family: 'JetBrains Mono', monospace;"
                    >
                      {{ created.username }}
                    </span>
                  </div>
                  <div class="py-3 flex items-center justify-between gap-4">
                    <span class="text-slate-500">Target Workspace</span>
                    <span class="font-semibold text-slate-900 text-right">{{ selectedDestinationLabel() }}</span>
                  </div>
                </div>

                <div class="space-y-3 pt-2">
                  <button
                    type="button"
                    (click)="enterRegisteredPortal()"
                    class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    <mat-icon class="text-base shrink-0">arrow_forward</mat-icon>
                    <span>Open {{ created.roleLabel }} Portal Now</span>
                  </button>

                  <button
                    type="button"
                    (click)="goToLoginWithRole()"
                    class="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-600 hover:text-indigo-600 text-xs font-semibold text-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <mat-icon class="text-sm shrink-0">login</mat-icon>
                    <span>Go to Sign In Page</span>
                  </button>
                </div>
              </div>

              <div class="pt-5 mt-6 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Need to enroll another member?</span>
                <button
                  type="button"
                  (click)="resetForAnotherRegistration()"
                  class="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Register another account
                </button>
              </div>
            }
          </div>

          <!-- Right Zone (6 cols): Campus Showcase, Role Onboarding Guide & Registration FAQ -->
          <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between min-w-0">
            <div>
              <!-- Campus Architectural Hero Frame with Measured Scrim -->
              <div class="relative aspect-[16/9] w-full bg-gradient-to-br from-[#0F172A] via-slate-900 to-[#0B1120] overflow-hidden">
                <img
                  src="/assets/images/campus_academic_atrium_1794811069299.jpg"
                  alt="University academic campus atrium and study terraces"
                  referrerpolicy="no-referrer"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/35 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
                  <p class="text-[11px] font-medium text-slate-200 tracking-wide truncate">
                    Academic Session {{ currentAcademicYear() }} · {{ departmentCount() }} Departments · {{ courseCount() }} Programs
                  </p>
                  <h3
                    class="text-base sm:text-xl font-bold text-white mt-0.5 sm:mt-1"
                    style="font-family: 'Plus Jakarta Sans', sans-serif; text-wrap: balance;"
                  >
                    {{ institute().name }}
                  </h3>
                  <p class="text-[11px] sm:text-xs text-slate-200 mt-0.5 truncate">
                    {{ institute().address }}
                  </p>
                </div>
              </div>

              <!-- Interactive Onboarding Walkthrough (Synced to Selected Role & Destination) -->
              <div class="p-4 sm:p-8 space-y-4 sm:space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/90">
                  <div class="min-w-0">
                    <h4
                      class="text-base sm:text-lg font-bold tracking-tight text-slate-900"
                      style="font-family: 'Plus Jakarta Sans', sans-serif;"
                    >
                      {{ activeConfig().name }} Onboarding Steps
                    </h4>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Choose your starting module below to launch right after account setup.
                    </p>
                  </div>

                  <button
                    type="button"
                    (click)="showHelpDrawer.set(!showHelpDrawer())"
                    class="px-3 py-1.5 rounded-lg border border-slate-200/90 bg-slate-50 hover:border-indigo-600 hover:text-indigo-600 text-xs font-semibold text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <mat-icon class="text-sm text-indigo-600 shrink-0">{{ showHelpDrawer() ? 'close' : 'help_outline' }}</mat-icon>
                    <span>{{ showHelpDrawer() ? 'Onboarding Steps' : 'Registration Help' }}</span>
                  </button>
                </div>

                @if (!showHelpDrawer()) {
                  <div class="divide-y divide-slate-200/80">
                    @for (item of activeConfig().highlights; track item.index) {
                      @let isDestinationSelected = activeDestinationRoute() === item.route;
                      <button
                        type="button"
                        (click)="selectedDestinationRoute.set(item.route)"
                        [class]="isDestinationSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'"
                        class="w-full py-3 sm:py-3.5 px-2.5 sm:px-3 text-left transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 cursor-pointer rounded-xl"
                      >
                        <div class="flex items-start gap-3 min-w-0">
                          <span
                            [class]="isDestinationSelected ? 'text-indigo-600' : 'text-slate-500'"
                            class="text-xs font-bold tabular-nums mt-0.5 shrink-0"
                            style="font-family: 'JetBrains Mono', monospace;"
                          >
                            {{ item.index }}
                          </span>
                          <div class="min-w-0">
                            <p class="text-xs sm:text-[13px] font-semibold text-slate-900">
                              {{ item.title }}
                            </p>
                            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                              {{ item.summary }}
                            </p>
                          </div>
                        </div>

                        <span
                          [class]="isDestinationSelected ? 'text-indigo-600 font-semibold' : 'text-slate-500'"
                          class="text-[11px] whitespace-nowrap shrink-0 pl-7 sm:pl-0 sm:mt-0.5 flex items-center gap-1"
                        >
                          @if (isDestinationSelected) {
                            <mat-icon class="text-sm shrink-0">check_circle</mat-icon>
                          }
                          <span>{{ item.routeLabel }}</span>
                        </span>
                      </button>
                    }
                  </div>
                } @else {
                  <!-- Inline Registration Help FAQ -->
                  <div class="divide-y divide-slate-200/80">
                    @for (faq of activeConfig().faqs; track faq.id) {
                      @let isOpen = expandedFaqId() === faq.id;
                      <div>
                        <button
                          type="button"
                          (click)="toggleFaq(faq.id)"
                          class="w-full py-3.5 text-left flex items-center justify-between gap-3 text-xs font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>{{ faq.question }}</span>
                          <mat-icon class="text-base text-slate-500 shrink-0">
                            {{ isOpen ? 'expand_less' : 'expand_more' }}
                          </mat-icon>
                        </button>
                        @if (isOpen) {
                          <p class="pb-3.5 text-xs text-slate-500 leading-relaxed">
                            {{ faq.answer }}
                          </p>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Quiet Campus Support Footer -->
            <div class="px-4 sm:px-8 py-4 border-t border-slate-200/90 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Admissions & IT Helpdesk: {{ institute().email }}</span>
              <span class="tabular-nums whitespace-nowrap">{{ institute().contact }}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  `
})
export class Register {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authSession = inject(AuthSessionService);
  private readonly userService = inject(CurrentUserService);
  private readonly settingsService = inject(SettingsService);
  private readonly academicService = inject(AcademicService);
  private readonly auditService = inject(AuditService);

  private readonly studioRoot = viewChild<ElementRef<HTMLElement>>('studioRoot');

  protected readonly institute = this.settingsService.profile;
  protected readonly currentAcademicYear = computed(() => this.settingsService.academic().currentAcademicYear);
  protected readonly departmentCount = computed(() => this.academicService.departments().length);
  protected readonly courseCount = computed(() => this.academicService.courses().length);

  protected readonly departmentOptions = computed(() => {
    const names = this.academicService.departments().map(d => d.name);
    return names.length > 0
      ? names
      : ['Computer Applications', 'Computer Science & Engineering', 'Management Studies'];
  });

  protected readonly courseOptions = computed(() => {
    const names = this.academicService.courses().map(c => c.name);
    return names.length > 0
      ? names
      : ['MCA (Master of Computer Applications)', 'BCA (Bachelor of Computer Applications)', 'B.Tech CSE'];
  });

  protected readonly roleConfigs: readonly RoleOnboardingConfig[] = [
    {
      id: 'faculty',
      apiRole: 'FACULTY',
      name: 'Faculty',
      cardTitle: 'Faculty',
      cardSummary: 'Teaching roster, lecture attendance & assessment grading',
      icon: 'co_present',
      formTitle: 'Faculty Account Registration',
      formSubtitle: 'Provision your faculty portal credentials and link your teaching department.',
      identifierLabel: 'Employee ID (Optional)',
      identifierPlaceholder: 'e.g. EMP-2041',
      identifierIcon: 'badge',
      unitLabel: 'Academic Department',
      unitMode: 'department',
      unitPlaceholder: 'Select department',
      destinations: [
        { label: 'Dashboard', route: '/faculty/dashboard', icon: 'dashboard' },
        { label: 'Attendance', route: '/faculty/attendance', icon: 'how_to_reg' },
        { label: 'My Classes', route: '/faculty/my-classes', icon: 'class' },
        { label: 'Marks', route: '/faculty/results-marks', icon: 'grade' }
      ],
      highlights: [
        {
          index: '01.',
          title: 'Department & Class Roster Sync',
          summary: 'Access your allocated subjects, section schedules, and enrolled student cohorts automatically.',
          route: '/faculty/my-classes',
          routeLabel: 'My Classes'
        },
        {
          index: '02.',
          title: 'One-Click Lecture Attendance',
          summary: 'Record class presence cleanly with automated shortage alerts and daily session history.',
          route: '/faculty/attendance',
          routeLabel: 'Attendance'
        },
        {
          index: '03.',
          title: 'Internal Marks & Examination Entry',
          summary: 'Submit coursework evaluations, practical scores, and semester grading sheets directly.',
          route: '/faculty/results-marks',
          routeLabel: 'Marks'
        }
      ],
      faqs: [
        {
          id: 'reg-fac-1',
          question: 'Can administrators register from this public page?',
          answer: 'No. For institutional security, Administrator accounts cannot be self-registered publicly and must be provisioned by an existing Super Admin.'
        },
        {
          id: 'reg-fac-2',
          question: 'What if my Employee ID is not issued yet?',
          answer: 'Employee ID and Department are optional during initial onboarding and can be updated from your Faculty Profile later.'
        }
      ]
    },
    {
      id: 'student',
      apiRole: 'STUDENT',
      name: 'Student',
      cardTitle: 'Student',
      cardSummary: 'Class timetable, attendance tracker, exams & grade cards',
      icon: 'school',
      formTitle: 'Student Account Registration',
      formSubtitle: 'Create your student self-service login to view schedules, attendance, and results.',
      identifierLabel: 'Enrollment No. (Optional)',
      identifierPlaceholder: 'e.g. ENR2026041',
      identifierIcon: 'pin',
      unitLabel: 'Degree Program',
      unitMode: 'program',
      unitPlaceholder: 'Select program',
      destinations: [
        { label: 'Dashboard', route: '/student/dashboard', icon: 'dashboard' },
        { label: 'Timetable', route: '/student/timetable', icon: 'calendar_month' },
        { label: 'Attendance', route: '/student/attendance', icon: 'how_to_reg' },
        { label: 'Results', route: '/student/results', icon: 'grade' }
      ],
      highlights: [
        {
          index: '01.',
          title: 'Live Semester Timetable',
          summary: 'Track daily lectures, assigned rooms, faculty names, and practical lab blocks in one view.',
          route: '/student/timetable',
          routeLabel: 'Timetable'
        },
        {
          index: '02.',
          title: 'Eligibility & Attendance Standing',
          summary: 'Monitor subject-wise presence percentages against institutional examination thresholds.',
          route: '/student/attendance',
          routeLabel: 'Attendance'
        },
        {
          index: '03.',
          title: 'Grade Cards & Published Results',
          summary: 'Inspect internal assessment scores, semester SGPA/CGPA summaries, and marksheets.',
          route: '/student/results',
          routeLabel: 'Results'
        }
      ],
      faqs: [
        {
          id: 'reg-stu-1',
          question: 'Which email should I use to register as a student?',
          answer: 'Use your official university or admissions-registered email address so your academic records match cleanly.'
        },
        {
          id: 'reg-stu-2',
          question: 'Can I sign in right after creating my account?',
          answer: 'Yes. Once your account is saved on the server, you can launch directly into your Student Portal or sign in anytime.'
        }
      ]
    },
    {
      id: 'parent',
      apiRole: 'PARENT',
      name: 'Parent',
      cardTitle: 'Parent / Guardian',
      cardSummary: 'Ward attendance standing, published results & fee ledger',
      icon: 'family_restroom',
      formTitle: 'Parent & Guardian Registration',
      formSubtitle: 'Set up your guardian portal credentials to follow your ward’s academic progress.',
      identifierLabel: 'Mobile Number (Optional)',
      identifierPlaceholder: 'e.g. 9876543210',
      identifierIcon: 'call',
      unitLabel: 'Ward Enrollment / Email',
      unitMode: 'ward',
      unitPlaceholder: 'Optional student ID or email',
      destinations: [
        { label: 'Dashboard', route: '/parent/dashboard', icon: 'dashboard' },
        { label: 'My Children', route: '/parent/my-children', icon: 'family_restroom' },
        { label: 'Attendance', route: '/parent/attendance', icon: 'how_to_reg' },
        { label: 'Fees', route: '/parent/fees', icon: 'account_balance_wallet' }
      ],
      highlights: [
        {
          index: '01.',
          title: 'Linked Student Profiles',
          summary: 'Switch seamlessly between enrolled wards to view semester progress and institutional notices.',
          route: '/parent/my-children',
          routeLabel: 'My Children'
        },
        {
          index: '02.',
          title: 'Daily & Subject Attendance Alerts',
          summary: 'Review lecture presence logs and receive timely visibility on threshold alerts.',
          route: '/parent/attendance',
          routeLabel: 'Attendance'
        },
        {
          index: '03.',
          title: 'Fee Schedules & Official Receipts',
          summary: 'Inspect installment breakdowns, paid dues, and campus accounts-office receipts.',
          route: '/parent/fees',
          routeLabel: 'Fees'
        }
      ],
      faqs: [
        {
          id: 'reg-par-1',
          question: 'How is my guardian account linked to my child?',
          answer: 'Enter the same email or mobile registered with campus admissions, or provide your child’s enrollment ID above.'
        },
        {
          id: 'reg-par-2',
          question: 'Can multiple guardians monitor the same ward?',
          answer: 'Each authorized guardian can create an individual login using their registered institutional contact email.'
        }
      ]
    }
  ];

  protected readonly selectedRole = signal<PublicRegisterRole>('student');
  protected readonly selectedDestinationRoute = signal<string>('/student/dashboard');
  protected readonly showHelpDrawer = signal<boolean>(false);
  protected readonly expandedFaqId = signal<string>('reg-stu-1');

  protected readonly showPassword = signal<boolean>(false);
  protected readonly showConfirmPassword = signal<boolean>(false);
  protected readonly capsLockActive = signal<boolean>(false);
  protected readonly passwordInputValue = signal<string>('');
  protected readonly isRegistering = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly registeredAccount = signal<RegisteredAccountSummary | null>(null);

  protected readonly registerForm = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email]
      }),
      identifierCode: new FormControl('', { nonNullable: true }),
      departmentOrProgram: new FormControl('', { nonNullable: true }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)]
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      acceptTerms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue]
      })
    },
    { validators: passwordsMatchValidator }
  );

  protected readonly activeConfig = computed(
    () => this.roleConfigs.find(r => r.id === this.selectedRole()) ?? this.roleConfigs[1]
  );

  protected readonly activeDestinationRoute = computed(() => {
    const dests = this.activeConfig().destinations;
    const chosen = this.selectedDestinationRoute();
    return dests.some(d => d.route === chosen) ? chosen : dests[0].route;
  });

  protected readonly selectedDestinationLabel = computed(() => {
    const route = this.activeDestinationRoute();
    return this.activeConfig().destinations.find(d => d.route === route)?.label ?? 'Dashboard';
  });

  protected readonly passwordScore = computed(() => {
    const pwd = this.passwordInputValue();
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  });

  protected readonly passwordStrengthLabel = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'Weak';
    if (score === 2) return 'Fair';
    if (score === 3) return 'Good';
    return 'Strong';
  });

  protected readonly strengthTextClass = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'text-rose-600';
    if (score === 2) return 'text-amber-600';
    if (score === 3) return 'text-indigo-600';
    return 'text-emerald-700';
  });

  protected readonly strengthBarClass = computed(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'bg-rose-500';
    if (score === 2) return 'bg-amber-500';
    if (score === 3) return 'bg-indigo-600';
    return 'bg-emerald-600';
  });

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const rootEl = this.studioRoot()?.nativeElement;
      if (!prefersReducedMotion && rootEl) {
        const blocks = rootEl.querySelectorAll('.stagger-block');
        animate(
          blocks,
          { opacity: [0, 1], y: [12, 0] },
          { delay: stagger(0.06), duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        );
      }
    });
  }

  protected onDockKeydown(event: KeyboardEvent): void {
    const order: readonly PublicRegisterRole[] = ['faculty', 'student', 'parent'];
    const idx = order.indexOf(this.selectedRole());
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.selectRole(order[(idx + 1) % order.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.selectRole(order[(idx - 1 + order.length) % order.length]);
    }
  }

  protected selectRole(roleId: PublicRegisterRole): void {
    this.selectedRole.set(roleId);
    const config = this.roleConfigs.find(r => r.id === roleId) ?? this.roleConfigs[1];
    this.selectedDestinationRoute.set(config.destinations[0].route);
    this.expandedFaqId.set(config.faqs[0]?.id ?? '');
    this.showHelpDrawer.set(false);
    this.errorMessage.set('');
    this.registeredAccount.set(null);
    this.registerForm.patchValue({
      identifierCode: '',
      departmentOrProgram: ''
    });
    this.registerForm.markAsUntouched();
  }

  protected clearEmail(): void {
    this.registerForm.patchValue({ email: '' });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  protected onPasswordInput(): void {
    this.passwordInputValue.set(this.registerForm.controls.password.value);
  }

  protected checkCapsLock(event: KeyboardEvent): void {
    if (typeof event.getModifierState === 'function') {
      this.capsLockActive.set(event.getModifierState('CapsLock'));
    }
  }

  protected toggleFaq(id: string): void {
    this.expandedFaqId.update(curr => (curr === id ? '' : id));
  }

  protected onRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      if (this.registerForm.hasError('passwordMismatch')) {
        this.errorMessage.set('Password and confirmation password must match.');
      } else {
        this.errorMessage.set('Please complete all required fields before creating your account.');
      }
      return;
    }

    const config = this.activeConfig();
    const raw = this.registerForm.getRawValue();
    const firstName = raw.firstName.trim();
    const lastName = raw.lastName.trim();
    const email = raw.email.trim().toLowerCase();

    this.errorMessage.set('');
    this.isRegistering.set(true);

    this.authSession
      .registerPublicUser({
        firstName,
        lastName,
        email,
        password: raw.password,
        role: config.apiRole,
        identifierCode: raw.identifierCode.trim() || undefined,
        departmentOrProgram: raw.departmentOrProgram.trim() || undefined
      })
      .subscribe({
        next: res => {
          this.isRegistering.set(false);
          const createdName = res.user?.name || `${firstName} ${lastName}`;
          const createdUsername =
            res.user?.username || `${firstName}_${lastName}`.toLowerCase().replace(/[^a-z0-9_]/g, '');

          this.auditService.log({
            userId: res.user?.id || `usr-${config.id}`,
            userName: email,
            role: config.name,
            module: 'Authentication',
            action: 'Create',
            target: `${config.name} Portal Onboarding`,
            status: 'Success'
          });

          this.registeredAccount.set({
            id: res.user?.id || '',
            name: createdName,
            username: createdUsername,
            email: res.user?.email || email,
            role: config.id,
            roleLabel: config.name
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isRegistering.set(false);
          const serverMessage = (err.error as { message?: string } | null)?.message;
          this.errorMessage.set(
            serverMessage || 'Unable to complete registration right now. Please verify your details and try again.'
          );
        }
      });
  }

  protected enterRegisteredPortal(): void {
    const account = this.registeredAccount();
    if (!account) return;
    const role: UserRole = account.role;
    this.userService.loginAs(role, account.email, account.name);
    const destination = this.activeDestinationRoute() || this.userService.getHomeRoute(role);
    this.router.navigateByUrl(destination);
  }

  protected goToLoginWithRole(): void {
    const role = this.registeredAccount()?.role ?? this.selectedRole();
    this.router.navigate(['/login'], { queryParams: { role } });
  }

  protected resetForAnotherRegistration(): void {
    this.registeredAccount.set(null);
    this.errorMessage.set('');
    this.passwordInputValue.set('');
    this.registerForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      identifierCode: '',
      departmentOrProgram: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    });
    this.registerForm.markAsUntouched();
  }
}
