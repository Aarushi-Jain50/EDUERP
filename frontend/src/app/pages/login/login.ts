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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { animate, stagger } from 'motion';
import { CurrentUserService, UserRole } from '../../services/current-user.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { SettingsService } from '../../services/settings.service';
import { StudentsService } from '../../services/students.service';
import { FacultyService } from '../../services/faculty.service';
import { ParentsService } from '../../services/parents.service';
import { AcademicService } from '../../services/academic.service';
import { AuditService } from '../../services/audit.service';

interface IdentifierMode {
  id: 'email' | 'alt';
  label: string;
  inputLabel: string;
  placeholder: string;
  icon: string;
  inputType: 'email' | 'text' | 'tel';
}

interface DestinationOption {
  label: string;
  route: string;
  icon: string;
}

interface PortalHighlight {
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

interface RoleWorkspaceConfig {
  id: UserRole;
  name: string;
  cardTitle: string;
  cardSummary: string;
  icon: string;
  formTitle: string;
  formSubtitle: string;
  identifierModes: readonly [IdentifierMode, IdentifierMode];
  destinations: readonly DestinationOption[];
  highlights: readonly PortalHighlight[];
  faqs: readonly FaqItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
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
              routerLink="/register"
              class="px-3 sm:px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-600 hover:text-indigo-600 text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Register Account
            </a>
          </div>
        </div>
      </header>

      <!-- Main Studio Workspace -->
      <main #studioRoot class="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10 space-y-5 sm:space-y-7">

        <!-- Interactive 4-Portal Selector Dock -->
        <section aria-label="Select Portal Role" class="space-y-3 stagger-block">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1
                class="text-xl sm:text-3xl font-bold tracking-tight text-slate-900"
                style="font-family: 'Plus Jakarta Sans', sans-serif; text-wrap: balance;"
              >
                Choose your institutional portal
              </h1>
              <p class="text-xs sm:text-[13px] text-slate-500 mt-1">
                Select a role below to customize your sign-in method, landing workspace, and campus tools.
              </p>
            </div>
            <span class="hidden sm:inline text-xs text-slate-500">
              Use arrow keys or click to switch roles
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Portal roles"
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

        <!-- Dual-Zone Interactive Authentication & Role Workbench -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch stagger-block">

          <!-- Left Zone (6 cols): Clean White Interactive Sign-In Console -->
          <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-8 flex flex-col justify-between min-w-0">
            @if (!isForgotMode()) {
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

                <!-- Role-Specific Identifier Mode Toggle -->
                <div class="space-y-2">
                  <span class="block text-xs font-semibold text-slate-900">Sign-In Method</span>
                  <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/90">
                    @for (mode of activeConfig().identifierModes; track mode.id) {
                      <button
                        type="button"
                        (click)="selectIdentifierMode(mode.id)"
                        [class]="identifierModeId() === mode.id
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900 font-medium'"
                        class="py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer min-w-0"
                      >
                        <mat-icon class="text-sm text-indigo-600 shrink-0">{{ mode.icon }}</mat-icon>
                        <span class="truncate">{{ mode.label }}</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- Reactive Credentials Form (Zero Autofill) -->
                <form [formGroup]="loginForm" (ngSubmit)="onLogin()" autocomplete="off" class="space-y-4">
                  <div class="space-y-1.5">
                    <label for="auth-identifier" class="block text-xs font-semibold text-slate-900">
                      {{ activeIdentifierMode().inputLabel }}
                    </label>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <mat-icon class="text-base">{{ activeIdentifierMode().icon }}</mat-icon>
                      </span>
                      <input
                        id="auth-identifier"
                        [type]="activeIdentifierMode().inputType"
                        formControlName="identifier"
                        autocomplete="off"
                        [placeholder]="activeIdentifierMode().placeholder"
                        class="w-full h-11 pl-9 pr-9 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                      />
                      @if (loginForm.controls.identifier.value) {
                        <button
                          type="button"
                          (click)="clearIdentifier()"
                          aria-label="Clear input"
                          class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 cursor-pointer"
                        >
                          <mat-icon class="text-sm">close</mat-icon>
                        </button>
                      }
                    </div>
                    @if (loginForm.controls.identifier.touched && loginForm.controls.identifier.invalid) {
                      <p class="text-[11px] text-rose-600 font-medium">
                        {{ identifierModeId() === 'email' ? 'Please enter a valid institutional email address.' : 'Please enter your ' + activeIdentifierMode().label.toLowerCase() + '.' }}
                      </p>
                    }
                  </div>

                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <label for="auth-password" class="block text-xs font-semibold text-slate-900">
                        Password
                      </label>
                      @if (capsLockActive()) {
                        <span class="text-[11px] font-medium text-amber-700 inline-flex items-center gap-1">
                          <mat-icon class="text-xs">keyboard_capslock</mat-icon>
                          <span>Caps Lock active</span>
                        </span>
                      }
                    </div>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <mat-icon class="text-base">lock</mat-icon>
                      </span>
                      <input
                        id="auth-password"
                        [type]="showPassword() ? 'text' : 'password'"
                        formControlName="password"
                        autocomplete="new-password"
                        (keydown)="checkCapsLock($event)"
                        (keyup)="checkCapsLock($event)"
                        placeholder="Enter your account password"
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
                    @if (loginForm.controls.password.touched && loginForm.controls.password.invalid) {
                      <p class="text-[11px] text-rose-600 font-medium">Password must be at least 4 characters.</p>
                    }
                  </div>

                  <!-- Role-Specific Landing Workspace Picker -->
                  <div class="space-y-2 pt-1">
                    <div class="flex items-center justify-between gap-2 text-xs">
                      <span class="font-semibold text-slate-900">Open Directly To</span>
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

                  <!-- Keep Session & Forgot Password Row -->
                  <div class="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <label class="inline-flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-900">
                      <input
                        type="checkbox"
                        formControlName="keepSession"
                        class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <span>Keep me signed in on this device</span>
                    </label>

                    <button
                      type="button"
                      (click)="openForgotPassword()"
                      class="text-indigo-600 font-semibold hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  @if (errorMessage()) {
                    <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <mat-icon class="text-base shrink-0">error_outline</mat-icon>
                      <span>{{ errorMessage() }}</span>
                    </div>
                  }

                  <button
                    type="submit"
                    [disabled]="isSigningIn() || isGoogleSigningIn()"
                    class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    @if (isSigningIn()) {
                      <mat-icon class="text-base animate-spin shrink-0">progress_activity</mat-icon>
                      <span>Authenticating {{ activeConfig().name }}...</span>
                    } @else {
                      <mat-icon class="text-base shrink-0">login</mat-icon>
                      <span>Sign In to {{ activeConfig().name }} Portal</span>
                    }
                  </button>

                  <div class="relative flex items-center py-1">
                    <div class="flex-1 border-t border-slate-200/90"></div>
                    <span class="px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">or</span>
                    <div class="flex-1 border-t border-slate-200/90"></div>
                  </div>

                  <button
                    type="button"
                    (click)="onGoogleSignIn()"
                    [disabled]="isSigningIn() || isGoogleSigningIn()"
                    class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-600 disabled:opacity-70 text-slate-900 text-xs sm:text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    @if (isGoogleSigningIn()) {
                      <mat-icon class="text-base animate-spin text-indigo-600 shrink-0">progress_activity</mat-icon>
                      <span>Connecting Google Account...</span>
                    } @else {
                      <mat-icon class="text-base text-indigo-600 shrink-0">account_circle</mat-icon>
                      <span>Continue with Google ({{ activeConfig().name }})</span>
                    }
                  </button>
                </form>
              </div>

              <div class="pt-5 mt-6 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>New to {{ institute().name }}?</span>
                <a routerLink="/register" class="text-indigo-600 font-semibold hover:underline">
                  Create an institutional account
                </a>
              </div>
            } @else {
              <!-- Interactive Account Recovery Flow -->
              <div class="space-y-6">
                <div class="space-y-2 pb-5 border-b border-slate-200/90">
                  <button
                    type="button"
                    (click)="closeForgotPassword()"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    <mat-icon class="text-sm">arrow_back</mat-icon>
                    <span>Back to {{ activeConfig().name }} Sign In</span>
                  </button>
                  <h2
                    class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                    style="font-family: 'Plus Jakarta Sans', sans-serif;"
                  >
                    Recover {{ activeConfig().name }} Access
                  </h2>
                  <p class="text-xs sm:text-[13px] text-slate-500">
                    Submit your registered institutional email to request a password reset link.
                  </p>
                </div>

                @if (!resetSubmittedEmail()) {
                  <form [formGroup]="resetForm" (ngSubmit)="submitPasswordReset()" class="space-y-4">
                    <div class="space-y-1.5">
                      <label for="recovery-email" class="block text-xs font-semibold text-slate-900">
                        Registered Email Address
                      </label>
                      <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <mat-icon class="text-base">mail</mat-icon>
                        </span>
                        <input
                          id="recovery-email"
                          type="email"
                          formControlName="email"
                          autocomplete="off"
                          placeholder="Enter your registered email"
                          class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                      @if (resetForm.controls.email.touched && resetForm.controls.email.invalid) {
                        <p class="text-[11px] text-rose-600 font-medium">Enter a valid email address.</p>
                      }
                    </div>

                    <button
                      type="submit"
                      class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <mat-icon class="text-base">send</mat-icon>
                      <span>Request Password Reset</span>
                    </button>
                  </form>
                } @else {
                  <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                    <div class="flex items-center gap-2 font-semibold text-sm">
                      <mat-icon class="text-base text-emerald-700 shrink-0">check_circle</mat-icon>
                      <span>Recovery Request Logged</span>
                    </div>
                    <p class="text-xs leading-relaxed">
                      If an active {{ activeConfig().name.toLowerCase() }} account matches <strong class="font-semibold">{{ resetSubmittedEmail() }}</strong>, reset instructions will be dispatched. For urgent help, contact {{ institute().email }}.
                    </p>
                  </div>

                  <button
                    type="button"
                    (click)="closeForgotPassword()"
                    class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                }
              </div>
            }
          </div>

          <!-- Right Zone (6 cols): Campus Showcase, Role Walkthrough & Access Support -->
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

              <!-- Interactive Portal Walkthrough (Synced to Sign-In Destination) -->
              <div class="p-4 sm:p-8 space-y-4 sm:space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/90">
                  <div class="min-w-0">
                    <h4
                      class="text-base sm:text-lg font-bold tracking-tight text-slate-900"
                      style="font-family: 'Plus Jakarta Sans', sans-serif;"
                    >
                      Inside Your {{ activeConfig().name }} Portal
                    </h4>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Select any workflow below to set it as your landing page after sign-in.
                    </p>
                  </div>

                  <button
                    type="button"
                    (click)="showHelpDrawer.set(!showHelpDrawer())"
                    class="px-3 py-1.5 rounded-lg border border-slate-200/90 bg-slate-50 hover:border-indigo-600 hover:text-indigo-600 text-xs font-semibold text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <mat-icon class="text-sm text-indigo-600 shrink-0">{{ showHelpDrawer() ? 'close' : 'help_outline' }}</mat-icon>
                    <span>{{ showHelpDrawer() ? 'Portal Overview' : 'Sign-In Help' }}</span>
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
                  <!-- Inline Sign-In Help FAQ -->
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
              <span>Helpdesk: {{ institute().email }}</span>
              <span class="tabular-nums whitespace-nowrap">{{ institute().contact }}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  `
})
export class Login {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userService = inject(CurrentUserService);
  private readonly authSession = inject(AuthSessionService);
  private readonly settingsService = inject(SettingsService);
  private readonly studentsService = inject(StudentsService);
  private readonly facultyService = inject(FacultyService);
  private readonly parentsService = inject(ParentsService);
  private readonly academicService = inject(AcademicService);
  private readonly auditService = inject(AuditService);

  private readonly studioRoot = viewChild<ElementRef<HTMLElement>>('studioRoot');

  protected readonly institute = this.settingsService.profile;
  protected readonly currentAcademicYear = computed(() => this.settingsService.academic().currentAcademicYear);
  protected readonly departmentCount = computed(() => this.academicService.departments().length);
  protected readonly courseCount = computed(() => this.academicService.courses().length);

  protected readonly roleConfigs: readonly RoleWorkspaceConfig[] = [
    {
      id: 'faculty',
      name: 'Faculty',
      cardTitle: 'Faculty',
      cardSummary: 'Lecture attendance, coursework grading & timetables',
      icon: 'co_present',
      formTitle: 'Faculty Portal Sign In',
      formSubtitle: 'Sign in with your faculty email or employee ID to open your teaching workspace.',
      identifierModes: [
        {
          id: 'email',
          label: 'Faculty Email',
          inputLabel: 'Faculty Email',
          placeholder: 'Enter faculty email address',
          icon: 'mail',
          inputType: 'email'
        },
        {
          id: 'alt',
          label: 'Employee ID',
          inputLabel: 'Employee ID',
          placeholder: 'Enter employee ID',
          icon: 'badge',
          inputType: 'text'
        }
      ],
      destinations: [
        { label: 'Dashboard', route: '/faculty/dashboard', icon: 'dashboard' },
        { label: 'Attendance', route: '/faculty/attendance', icon: 'how_to_reg' },
        { label: 'My Classes', route: '/faculty/my-classes', icon: 'class' },
        { label: 'Marks', route: '/faculty/results-marks', icon: 'grade' }
      ],
      highlights: [
        {
          index: '01.',
          title: 'Lecture Attendance & Session Logs',
          summary: 'Mark section-wise presence in seconds and review students approaching threshold limits.',
          route: '/faculty/attendance',
          routeLabel: 'Attendance'
        },
        {
          index: '02.',
          title: 'Assigned Courses & Weekly Timetable',
          summary: 'Inspect allocated subjects, room schedules, and live class rosters from one view.',
          route: '/faculty/my-classes',
          routeLabel: 'My Classes'
        },
        {
          index: '03.',
          title: 'Coursework & Examination Marks Entry',
          summary: 'Submit internal assessments, practical scores, and grade sheets cleanly.',
          route: '/faculty/results-marks',
          routeLabel: 'Marks'
        }
      ],
      faqs: [
        {
          id: 'fac-1',
          question: 'Where do I find my Employee ID?',
          answer: 'Your Employee ID is listed on your faculty appointment letter and institutional ID card.'
        },
        {
          id: 'fac-2',
          question: 'Can I jump straight to Attendance marking on login?',
          answer: 'Yes. Click Lecture Attendance in this panel or select Attendance under Open Directly To.'
        }
      ]
    },
    {
      id: 'student',
      name: 'Student',
      cardTitle: 'Student',
      cardSummary: 'Weekly classes, attendance tracker, exams & results',
      icon: 'school',
      formTitle: 'Student Portal Sign In',
      formSubtitle: 'Use your student email or university enrollment number to access your academic portal.',
      identifierModes: [
        {
          id: 'email',
          label: 'Student Email',
          inputLabel: 'Student Email',
          placeholder: 'Enter student email address',
          icon: 'mail',
          inputType: 'email'
        },
        {
          id: 'alt',
          label: 'Enrollment No.',
          inputLabel: 'Enrollment Number',
          placeholder: 'Enter enrollment number',
          icon: 'pin',
          inputType: 'text'
        }
      ],
      destinations: [
        { label: 'Dashboard', route: '/student/dashboard', icon: 'dashboard' },
        { label: 'Timetable', route: '/student/timetable', icon: 'calendar_month' },
        { label: 'Attendance', route: '/student/attendance', icon: 'how_to_reg' },
        { label: 'Results', route: '/student/results', icon: 'grade' }
      ],
      highlights: [
        {
          index: '01.',
          title: 'Daily & Weekly Lecture Schedule',
          summary: 'Follow live period timings, faculty room allocations, and upcoming lab sessions.',
          route: '/student/timetable',
          routeLabel: 'Timetable'
        },
        {
          index: '02.',
          title: 'Subject-Wise Attendance Standing',
          summary: 'Monitor your eligibility percentage against the university minimum requirement.',
          route: '/student/attendance',
          routeLabel: 'Attendance'
        },
        {
          index: '03.',
          title: 'Published Results & Semester Grade Cards',
          summary: 'Download semester performance summaries, SGPA/CGPA standings, and marksheets.',
          route: '/student/results',
          routeLabel: 'Results'
        }
      ],
      faqs: [
        {
          id: 'stu-1',
          question: 'Can I sign in using my Enrollment Number?',
          answer: 'Yes. Switch Sign-In Method to Enrollment No. and enter your official university enrollment number.'
        },
        {
          id: 'stu-2',
          question: 'What attendance percentage is required for exams?',
          answer: 'Students must maintain at least the institute minimum attendance threshold to qualify for end-term examinations.'
        }
      ]
    },
    {
      id: 'parent',
      name: 'Parent',
      cardTitle: 'Parent / Guardian',
      cardSummary: 'Ward attendance alerts, results, fees & faculty chat',
      icon: 'family_restroom',
      formTitle: 'Parent & Guardian Sign In',
      formSubtitle: 'Access your linked child’s academic standing, fee receipts, and faculty communication.',
      identifierModes: [
        {
          id: 'email',
          label: 'Guardian Email',
          inputLabel: 'Registered Guardian Email',
          placeholder: 'Enter registered guardian email',
          icon: 'mail',
          inputType: 'email'
        },
        {
          id: 'alt',
          label: 'Registered Mobile',
          inputLabel: 'Registered Mobile Number',
          placeholder: 'Enter 10-digit mobile number',
          icon: 'call',
          inputType: 'tel'
        }
      ],
      destinations: [
        { label: 'Dashboard', route: '/parent/dashboard', icon: 'dashboard' },
        { label: 'My Children', route: '/parent/my-children', icon: 'family_restroom' },
        { label: 'Attendance', route: '/parent/attendance', icon: 'how_to_reg' },
        { label: 'Fees', route: '/parent/fees', icon: 'account_balance_wallet' }
      ],
      highlights: [
        {
          index: '01.',
          title: 'Linked Ward Profiles & Overview',
          summary: 'Switch seamlessly between enrolled children to review semester progress and notices.',
          route: '/parent/my-children',
          routeLabel: 'My Children'
        },
        {
          index: '02.',
          title: 'Attendance Alerts & Calendar Log',
          summary: 'Inspect subject-wise attendance records and daily presence across the semester.',
          route: '/parent/attendance',
          routeLabel: 'Attendance'
        },
        {
          index: '03.',
          title: 'Fee Installments & Official Receipts',
          summary: 'View prescribed semester ledgers, paid installments, and accounts-office receipts.',
          route: '/parent/fees',
          routeLabel: 'Fees'
        }
      ],
      faqs: [
        {
          id: 'par-1',
          question: 'How are my children linked to my guardian login?',
          answer: 'Admissions links every student record to your guardian email and mobile number; multi-child households switch wards from the top bar.'
        },
        {
          id: 'par-2',
          question: 'Can tuition fees be paid online from the Parent Portal?',
          answer: 'Fee payments are accepted directly at the campus accounts office. Official receipts and installment status appear in your portal.'
        }
      ]
    }
  ];

  protected readonly selectedRole = signal<UserRole>('faculty');
  protected readonly identifierModeId = signal<'email' | 'alt'>('email');
  protected readonly selectedDestinationRoute = signal<string>('/faculty/dashboard');
  protected readonly showHelpDrawer = signal<boolean>(false);
  protected readonly expandedFaqId = signal<string>('');

  // Auth interaction state
  protected readonly showPassword = signal<boolean>(false);
  protected readonly capsLockActive = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly isSigningIn = signal<boolean>(false);
  protected readonly isGoogleSigningIn = signal<boolean>(false);
  protected readonly isForgotMode = signal<boolean>(false);
  protected readonly resetSubmittedEmail = signal<string>('');

  // Strictly blank reactive form — NO demo or autofilled credentials
  protected readonly loginForm = new FormGroup({
    identifier: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)]
    }),
    keepSession: new FormControl(false, { nonNullable: true })
  });

  protected readonly resetForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });

  protected readonly activeConfig = computed(
    () => this.roleConfigs.find(r => r.id === this.selectedRole()) ?? this.roleConfigs[0]
  );

  protected readonly activeIdentifierMode = computed(() => {
    const modes = this.activeConfig().identifierModes;
    return modes.find(m => m.id === this.identifierModeId()) ?? modes[0];
  });

  protected readonly activeDestinationRoute = computed(() => {
    const dests = this.activeConfig().destinations;
    const chosen = this.selectedDestinationRoute();
    return dests.some(d => d.route === chosen) ? chosen : dests[0].route;
  });

  protected readonly selectedDestinationLabel = computed(() => {
    const route = this.activeDestinationRoute();
    return this.activeConfig().destinations.find(d => d.route === route)?.label ?? 'Dashboard';
  });

  constructor() {
    const queryRole = this.route.snapshot.queryParamMap.get('role');
    if (queryRole === 'faculty' || queryRole === 'student' || queryRole === 'parent') {
      this.selectRole(queryRole);
    }

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
    const order: readonly UserRole[] = ['faculty', 'student', 'parent'];
    const idx = order.indexOf(this.selectedRole());
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.selectRole(order[(idx + 1) % order.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.selectRole(order[(idx - 1 + order.length) % order.length]);
    }
  }

  protected selectRole(roleId: UserRole): void {
    this.selectedRole.set(roleId);
    const config = this.roleConfigs.find(r => r.id === roleId) ?? this.roleConfigs[0];
    this.selectedDestinationRoute.set(config.destinations[0].route);
    this.expandedFaqId.set(config.faqs[0]?.id ?? '');
    this.showHelpDrawer.set(false);
    this.errorMessage.set('');
    this.isForgotMode.set(false);
    this.resetSubmittedEmail.set('');
    this.loginForm.markAsUntouched();
  }

  protected selectIdentifierMode(modeId: 'email' | 'alt'): void {
    this.identifierModeId.set(modeId);
    const ctrl = this.loginForm.controls.identifier;
    if (modeId === 'email') {
      ctrl.setValidators([Validators.required, Validators.email]);
    } else {
      ctrl.setValidators([Validators.required, Validators.minLength(3)]);
    }
    ctrl.updateValueAndValidity();
    ctrl.markAsUntouched();
    this.errorMessage.set('');
  }

  protected clearIdentifier(): void {
    this.loginForm.patchValue({ identifier: '' });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  protected checkCapsLock(event: KeyboardEvent): void {
    if (typeof event.getModifierState === 'function') {
      this.capsLockActive.set(event.getModifierState('CapsLock'));
    }
  }

  protected toggleFaq(id: string): void {
    this.expandedFaqId.update(curr => (curr === id ? '' : id));
  }

  protected openForgotPassword(): void {
    this.resetSubmittedEmail.set('');
    const currentId = this.loginForm.controls.identifier.value.trim();
    this.resetForm.patchValue({
      email: this.identifierModeId() === 'email' ? currentId : ''
    });
    this.isForgotMode.set(true);
  }

  protected closeForgotPassword(): void {
    this.isForgotMode.set(false);
    this.resetSubmittedEmail.set('');
  }

  protected submitPasswordReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.resetSubmittedEmail.set(this.resetForm.controls.email.value.trim());
  }

  protected onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please enter your required credentials before signing in.');
      return;
    }

    const rawIdentifier = this.loginForm.controls.identifier.value.trim();
    const role = this.selectedRole();
    const resolvedEmail = this.resolveEmailForIdentifier(role, rawIdentifier);

    this.errorMessage.set('');
    this.isSigningIn.set(true);

    this.userService.loginAs(role, resolvedEmail);
    this.auditService.log({
      userId: this.userService.userId(),
      userName: resolvedEmail,
      role: this.activeConfig().name,
      module: 'Authentication',
      action: 'Login',
      target: `${this.activeConfig().name} Portal`,
      status: 'Success'
    });

    const returnUrl = this.resolveSafeReturnUrl(role);
    const destination = returnUrl || this.activeDestinationRoute() || this.userService.getHomeRoute(role);
    setTimeout(() => {
      this.isSigningIn.set(false);
      this.router.navigateByUrl(destination);
    }, 180);
  }

  protected async onGoogleSignIn(): Promise<void> {
    const role = this.selectedRole();
    const portalRole: 'faculty' | 'student' | 'parent' =
      role === 'student' || role === 'parent' ? role : 'faculty';

    this.errorMessage.set('');
    this.isGoogleSigningIn.set(true);

    try {
      const syncedUser = await this.authSession.signInWithGoogle(portalRole);
      this.userService.loginAs(portalRole, syncedUser.email, syncedUser.name);
      this.auditService.log({
        userId: this.userService.userId(),
        userName: syncedUser.email,
        role: this.activeConfig().name,
        module: 'Authentication',
        action: 'Login',
        target: `${this.activeConfig().name} Portal (Google)`,
        status: 'Success'
      });

      const returnUrl = this.resolveSafeReturnUrl(portalRole);
      const destination = returnUrl || this.activeDestinationRoute() || this.userService.getHomeRoute(portalRole);
      await this.router.navigateByUrl(destination);
    } catch {
      this.errorMessage.set('Google Sign-In could not be completed. Please try again.');
    } finally {
      this.isGoogleSigningIn.set(false);
    }
  }

  private resolveSafeReturnUrl(role: UserRole): string | null {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl')?.trim();
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return null;
    }
    const allowedPrefix = `/${role}/`;
    if (raw === `/${role}` || raw.startsWith(allowedPrefix)) {
      return raw;
    }
    return null;
  }

  private resolveEmailForIdentifier(role: UserRole, identifier: string): string {
    const normalized = identifier.trim().toLowerCase();
    if (this.identifierModeId() === 'email') {
      return identifier.trim();
    }

    if (role === 'student') {
      const stu = this.studentsService.students().find(
        s => s.enrollmentNo.toLowerCase() === normalized || s.email.toLowerCase() === normalized
      );
      if (stu) return stu.email;
    } else if (role === 'faculty') {
      const fac = this.facultyService.facultyList().find(
        f => f.employeeId.toLowerCase() === normalized || f.email.toLowerCase() === normalized
      );
      if (fac) return fac.email;
    } else if (role === 'parent') {
      const digitsOnly = identifier.replace(/\D/g, '');
      const par = this.parentsService.parentsList().find(
        p => p.phone.replace(/\D/g, '') === digitsOnly || p.email.toLowerCase() === normalized
      );
      if (par) return par.email;
    }

    return identifier.trim();
  }
}
