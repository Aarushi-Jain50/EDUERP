import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RbacRole } from '../../models/user-role.model';
import { AuditService } from '../../services/audit.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { CurrentUserService } from '../../services/current-user.service';
import { SettingsService } from '../../services/settings.service';

type LoginFlowStep = 'credentials' | '2fa' | 'forgot';
type TwoFactorMethod = 'email_otp' | 'totp';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-secure-login',
  imports: [RouterLink, ReactiveFormsModule, MatIconModule],
  host: {
    class: 'block min-h-screen'
  },
  template: `
    <div class="min-h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900">

      <!-- Top 3-Zone Institutional Header -->
      <header class="w-full border-b border-slate-200/90 bg-white/85 backdrop-blur-md sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a routerLink="/admin/secure-login" class="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div class="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs">
              <mat-icon class="text-lg text-indigo-400">admin_panel_settings</mat-icon>
            </div>
            <span
              class="text-lg font-bold tracking-tight text-slate-900"
              style="font-family: 'Plus Jakarta Sans', sans-serif;"
            >
              EduERP Admin
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
            <span class="whitespace-nowrap shrink-0 text-slate-900 font-semibold">{{ institute().name }}</span>
            <span aria-hidden="true">·</span>
            <span class="whitespace-nowrap shrink-0">Restricted Access Gateway</span>
            <span aria-hidden="true">·</span>
            <span class="whitespace-nowrap shrink-0 tabular-nums">Session {{ currentAcademicYear() }}</span>
          </nav>

          <div class="flex items-center gap-3 shrink-0">
            <a
              routerLink="/login"
              class="px-4 py-2 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-600 hover:text-indigo-600 text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Academic Portals
            </a>
          </div>
        </div>
      </header>

      <!-- Main Secure Admin Workspace -->
      <main class="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center">
        <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          <!-- Left Zone (6 cols): Secure Admin Authentication Console -->
          <section
            aria-label="Admin Portal Authentication"
            class="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between"
          >
            @switch (step()) {

              <!-- STEP 1: PRIMARY CREDENTIALS -->
              @case ('credentials') {
                <div class="space-y-6">
                  <div class="flex items-start justify-between gap-4 pb-5 border-b border-slate-200/90">
                    <div class="space-y-1">
                      <h1
                        class="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900"
                        style="font-family: 'Plus Jakarta Sans', sans-serif; text-wrap: balance;"
                      >
                        Admin Portal
                      </h1>
                      <p class="text-xs sm:text-[13px] text-slate-500">
                        Authorized institutional administrators only. Two-factor verification is mandatory.
                      </p>
                    </div>
                    <div class="w-11 h-11 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                      <mat-icon class="text-xl text-indigo-400">verified_user</mat-icon>
                    </div>
                  </div>

                  @if (sessionExpiredNotice()) {
                    <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                      <mat-icon class="text-base text-amber-700 shrink-0">schedule</mat-icon>
                      <span>{{ sessionExpiredNotice() }}</span>
                    </div>
                  }

                  <form [formGroup]="credentialsForm" (ngSubmit)="submitCredentials()" autocomplete="off" class="space-y-4">
                    <div class="space-y-1.5">
                      <label for="admin-email" class="block text-xs font-semibold text-slate-900">
                        Administrator Email
                      </label>
                      <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <mat-icon class="text-base">mail</mat-icon>
                        </span>
                        <input
                          id="admin-email"
                          type="email"
                          formControlName="email"
                          autocomplete="off"
                          placeholder="Enter authorized administrator email"
                          class="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
                        />
                      </div>
                      @if (credentialsForm.controls.email.touched && credentialsForm.controls.email.invalid) {
                        <p class="text-[11px] text-rose-600 font-medium">
                          Please enter a valid administrator email address.
                        </p>
                      }
                    </div>

                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label for="admin-password" class="block text-xs font-semibold text-slate-900">
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
                          id="admin-password"
                          [type]="showPassword() ? 'text' : 'password'"
                          formControlName="password"
                          autocomplete="new-password"
                          (keydown)="checkCapsLock($event)"
                          (keyup)="checkCapsLock($event)"
                          placeholder="Enter your administrator password"
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
                      @if (credentialsForm.controls.password.touched && credentialsForm.controls.password.invalid) {
                        <p class="text-[11px] text-rose-600 font-medium">
                          Password is required (minimum 6 characters).
                        </p>
                      }
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1">
                      <label class="inline-flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-900">
                        <input
                          type="checkbox"
                          formControlName="keepSession"
                          class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span>Keep session across reloads</span>
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
                      <div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                        <mat-icon class="text-base shrink-0">gpp_bad</mat-icon>
                        <span>{{ errorMessage() }}</span>
                      </div>
                    }

                    <button
                      type="submit"
                      [disabled]="isSubmitting()"
                      class="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 disabled:opacity-70 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      @if (isSubmitting()) {
                        <mat-icon class="text-base animate-spin">progress_activity</mat-icon>
                        <span>Verifying Credentials...</span>
                      } @else {
                        <mat-icon class="text-base text-indigo-400">shield</mat-icon>
                        <span>Continue to 2FA Verification</span>
                      }
                    </button>
                  </form>

                  <div class="relative flex items-center py-1">
                    <div class="flex-grow border-t border-slate-200"></div>
                    <span class="shrink mx-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Or Authorize via Firebase
                    </span>
                    <div class="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    type="button"
                    [disabled]="isSubmitting()"
                    (click)="loginWithFirebaseGoogle()"
                    class="w-full py-3 px-4 rounded-xl border border-slate-200/90 bg-white hover:border-[#6D42E8] hover:bg-purple-50/40 disabled:opacity-70 text-slate-900 text-xs sm:text-[13px] font-semibold transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
                  >
                    <mat-icon class="text-base text-[#6D42E8]">verified_user</mat-icon>
                    <span>Sign in with Authorized Google Account (Firebase Auth)</span>
                  </button>
                </div>

                <div class="pt-5 mt-6 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Public admin self-registration is disabled.</span>
                  <a routerLink="/login" class="text-indigo-600 font-semibold hover:underline">
                    Faculty / Student / Parent Login
                  </a>
                </div>
              }

              <!-- STEP 2: TWO-FACTOR AUTHENTICATION (2FA) -->
              @case ('2fa') {
                <div class="space-y-6">
                  <div class="space-y-2 pb-5 border-b border-slate-200/90">
                    <button
                      type="button"
                      (click)="backToCredentials()"
                      class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      <mat-icon class="text-sm">arrow_back</mat-icon>
                      <span>Use different credentials</span>
                    </button>

                    <div class="flex items-start justify-between gap-4 pt-1">
                      <div>
                        <h2
                          class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                          style="font-family: 'Plus Jakarta Sans', sans-serif;"
                        >
                          Two-Factor Verification
                        </h2>
                        <p class="text-xs sm:text-[13px] text-slate-500 mt-1">
                          Enter the 6-digit security code for <strong class="text-slate-900">{{ maskedEmail() }}</strong>.
                        </p>
                      </div>
                      <span
                        class="text-xs font-semibold text-indigo-600 tabular-nums shrink-0"
                        style="font-family: 'JetBrains Mono', monospace;"
                      >
                        {{ countdownLabel() }}
                      </span>
                    </div>
                  </div>

                  <!-- 2FA Method Selector -->
                  @if (available2FAMethods().length > 1) {
                    <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/90">
                      <button
                        type="button"
                        (click)="selected2FAMethod.set('email_otp')"
                        [class]="selected2FAMethod() === 'email_otp'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900 font-medium'"
                        class="py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <mat-icon class="text-sm text-indigo-600">mark_email_read</mat-icon>
                        <span>Email OTP</span>
                      </button>
                      <button
                        type="button"
                        (click)="selected2FAMethod.set('totp')"
                        [class]="selected2FAMethod() === 'totp'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900 font-medium'"
                        class="py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <mat-icon class="text-sm text-indigo-600">phonelink_lock</mat-icon>
                        <span>Authenticator App</span>
                      </button>
                    </div>
                  }

                  <p class="text-xs text-slate-500 leading-relaxed">
                    @if (selected2FAMethod() === 'totp') {
                      Open your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) and enter the current 6-digit TOTP code.
                    } @else {
                      A single-use 6-digit OTP was generated by the authentication server for your administrator email.
                    }
                  </p>

                  <form [formGroup]="twoFactorForm" (ngSubmit)="submitTwoFactor()" autocomplete="off" class="space-y-4">
                    <div class="space-y-1.5">
                      <label for="admin-2fa-code" class="block text-xs font-semibold text-slate-900">
                        6-Digit Verification Code
                      </label>
                      <input
                        id="admin-2fa-code"
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        formControlName="code"
                        autocomplete="one-time-code"
                        placeholder="000000"
                        class="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200/90 text-center text-lg font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:border-indigo-600 tabular-nums"
                        style="font-family: 'JetBrains Mono', monospace;"
                      />
                      @if (twoFactorForm.controls.code.touched && twoFactorForm.controls.code.invalid) {
                        <p class="text-[11px] text-rose-600 font-medium">
                          Enter all 6 numeric digits of your verification code.
                        </p>
                      }
                    </div>

                    @if (infoMessage()) {
                      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                        <mat-icon class="text-base text-emerald-700 shrink-0">check_circle</mat-icon>
                        <span>{{ infoMessage() }}</span>
                      </div>
                    }

                    @if (errorMessage()) {
                      <div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                        <mat-icon class="text-base shrink-0">error_outline</mat-icon>
                        <span>{{ errorMessage() }}</span>
                      </div>
                    }

                    <button
                      type="submit"
                      [disabled]="isSubmitting()"
                      class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      @if (isSubmitting()) {
                        <mat-icon class="text-base animate-spin">progress_activity</mat-icon>
                        <span>Authorizing Session...</span>
                      } @else {
                        <mat-icon class="text-base">verified_user</mat-icon>
                        <span>Verify & Open Admin Dashboard</span>
                      }
                    </button>
                  </form>

                  @if (selected2FAMethod() === 'email_otp') {
                    <div class="flex items-center justify-between pt-2 text-xs text-slate-500">
                      <span>Need a fresh Email OTP?</span>
                      <button
                        type="button"
                        [disabled]="isSubmitting()"
                        (click)="resendOtp()"
                        class="text-indigo-600 font-semibold hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Resend Verification Code
                      </button>
                    </div>
                  }
                </div>
              }

              <!-- FORGOT PASSWORD RECOVERY -->
              @case ('forgot') {
                <div class="space-y-6">
                  <div class="space-y-2 pb-5 border-b border-slate-200/90">
                    <button
                      type="button"
                      (click)="backToCredentials()"
                      class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      <mat-icon class="text-sm">arrow_back</mat-icon>
                      <span>Back to Admin Sign In</span>
                    </button>
                    <h2
                      class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                      style="font-family: 'Plus Jakarta Sans', sans-serif;"
                    >
                      Administrator Account Recovery
                    </h2>
                    <p class="text-xs sm:text-[13px] text-slate-500">
                      Request a server-verified recovery code and rotate your administrator password.
                    </p>
                  </div>

                  @if (!recoveryCodeSent()) {
                    <form [formGroup]="forgotRequestForm" (ngSubmit)="requestPasswordRecovery()" autocomplete="off" class="space-y-4">
                      <div class="space-y-1.5">
                        <label for="recover-admin-email" class="block text-xs font-semibold text-slate-900">
                          Registered Administrator Email
                        </label>
                        <input
                          id="recover-admin-email"
                          type="email"
                          formControlName="email"
                          autocomplete="off"
                          placeholder="Enter administrator email"
                          class="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                        />
                        @if (forgotRequestForm.controls.email.touched && forgotRequestForm.controls.email.invalid) {
                          <p class="text-[11px] text-rose-600 font-medium">Enter a valid administrator email address.</p>
                        }
                      </div>

                      @if (errorMessage()) {
                        <div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                          {{ errorMessage() }}
                        </div>
                      }

                      <button
                        type="submit"
                        [disabled]="isSubmitting()"
                        class="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <mat-icon class="text-base">send</mat-icon>
                        <span>{{ isSubmitting() ? 'Dispatching...' : 'Send Recovery Verification Code' }}</span>
                      </button>
                    </form>
                  } @else if (!recoveryCompleted()) {
                    <form [formGroup]="forgotConfirmForm" (ngSubmit)="confirmPasswordReset()" autocomplete="off" class="space-y-4">
                      @if (infoMessage()) {
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-900">
                          {{ infoMessage() }}
                        </div>
                      }

                      <div class="space-y-1.5">
                        <label for="recover-code" class="block text-xs font-semibold text-slate-900">
                          6-Digit Recovery Code
                        </label>
                        <input
                          id="recover-code"
                          type="text"
                          inputmode="numeric"
                          maxlength="6"
                          formControlName="code"
                          autocomplete="one-time-code"
                          placeholder="000000"
                          class="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-sm font-semibold tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 tabular-nums"
                          style="font-family: 'JetBrains Mono', monospace;"
                        />
                      </div>

                      <div class="space-y-1.5">
                        <label for="recover-new-pass" class="block text-xs font-semibold text-slate-900">
                          New Strong Password
                        </label>
                        <div class="relative">
                          <input
                            id="recover-new-pass"
                            [type]="showResetPassword() ? 'text' : 'password'"
                            formControlName="newPassword"
                            autocomplete="new-password"
                            placeholder="Min 8 chars, upper, lower, digit, symbol"
                            class="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-50 border border-slate-200/90 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                          />
                          <button
                            type="button"
                            (click)="toggleResetPasswordVisibility()"
                            [attr.aria-label]="showResetPassword() ? 'Hide password' : 'Show password'"
                            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 cursor-pointer"
                          >
                            <mat-icon class="text-base">{{ showResetPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                          </button>
                        </div>
                      </div>

                      @if (errorMessage()) {
                        <div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                          {{ errorMessage() }}
                        </div>
                      }

                      <button
                        type="submit"
                        [disabled]="isSubmitting()"
                        class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        {{ isSubmitting() ? 'Updating Password...' : 'Reset Administrator Password' }}
                      </button>
                    </form>
                  } @else {
                    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                      <div class="flex items-center gap-2 font-semibold text-sm">
                        <mat-icon class="text-base text-emerald-700">check_circle</mat-icon>
                        <span>Password Reset Complete</span>
                      </div>
                      <p class="text-xs leading-relaxed">
                        Your administrator password has been hashed and updated, and all previous sessions were revoked.
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="backToCredentials()"
                      class="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Return to Admin Sign In
                    </button>
                  }
                </div>
              }
            }
          </section>

          <!-- Right Zone (6 cols): Deep Midnight Security Architecture Panel -->
          <aside class="lg:col-span-6 relative rounded-2xl bg-[#0F172A] text-white p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
            <div class="relative z-10 space-y-6">
              <div class="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <p class="text-xs font-medium text-indigo-300">Zero-Trust Portal Controls</p>
                  <h2
                    class="text-lg font-bold text-white mt-0.5"
                    style="font-family: 'Plus Jakarta Sans', sans-serif;"
                  >
                    Administrative Security Architecture
                  </h2>
                </div>
                <mat-icon class="text-2xl text-indigo-400">policy</mat-icon>
              </div>

              <div class="space-y-4">
                <div class="py-3 border-b border-white/10 flex items-start gap-3">
                  <mat-icon class="text-lg text-indigo-400 shrink-0 mt-0.5">key</mat-icon>
                  <div>
                    <h3 class="text-sm font-semibold text-white">Salted Scrypt Password Verification</h3>
                    <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                      Credentials are verified strictly on the backend against scrypt hashes with automatic brute-force lockout after 5 failed attempts.
                    </p>
                  </div>
                </div>

                <div class="py-3 border-b border-white/10 flex items-start gap-3">
                  <mat-icon class="text-lg text-indigo-400 shrink-0 mt-0.5">phonelink_lock</mat-icon>
                  <div>
                    <h3 class="text-sm font-semibold text-white">Mandatory Server-Side 2FA</h3>
                    <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                      Every Admin session requires a second-factor challenge verified on the server via Email OTP or RFC 6238 Authenticator App TOTP.
                    </p>
                  </div>
                </div>

                <div class="py-3 border-b border-white/10 flex items-start gap-3">
                  <mat-icon class="text-lg text-indigo-400 shrink-0 mt-0.5">gavel</mat-icon>
                  <div>
                    <h3 class="text-sm font-semibold text-white">Strict RBAC & Session Revocation</h3>
                    <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                      Admin APIs and routes enforce the ADMIN role via signed JWT sessions tracked in the backend database and revoked on sign-out.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Campus Policy Numbers (Non-Confidential) -->
              <div class="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <p class="text-[11px] text-slate-300">Min Password</p>
                  <p class="text-lg font-bold text-white mt-1 tabular-nums" style="font-family: 'JetBrains Mono', monospace;">
                    {{ securityPolicy().minPasswordLength }} chars
                  </p>
                </div>
                <div>
                  <p class="text-[11px] text-slate-300">Session TTL</p>
                  <p class="text-lg font-bold text-white mt-1 tabular-nums" style="font-family: 'JetBrains Mono', monospace;">
                    {{ securityPolicy().sessionTimeoutMinutes }}m
                  </p>
                </div>
                <div>
                  <p class="text-[11px] text-slate-300">Lockout Threshold</p>
                  <p class="text-lg font-bold text-white mt-1 tabular-nums" style="font-family: 'JetBrains Mono', monospace;">
                    {{ securityPolicy().maxFailedLogins }} tries
                  </p>
                </div>
              </div>
            </div>

            <div class="relative z-10 pt-5 mt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <span>{{ institute().address }}</span>
              <span class="tabular-nums">{{ institute().email }}</span>
            </div>
          </aside>

        </div>
      </main>
    </div>
  `
})
export class AdminSecureLogin implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authSession = inject(AuthSessionService);
  private readonly userService = inject(CurrentUserService);
  private readonly settingsService = inject(SettingsService);
  private readonly auditService = inject(AuditService);

  protected readonly institute = this.settingsService.profile;
  protected readonly securityPolicy = this.settingsService.security;
  protected readonly currentAcademicYear = computed(() => this.settingsService.academic().currentAcademicYear);

  protected readonly step = signal<LoginFlowStep>('credentials');
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly showPassword = signal<boolean>(false);
  protected readonly showResetPassword = signal<boolean>(false);
  protected readonly capsLockActive = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly infoMessage = signal<string>('');
  protected readonly sessionExpiredNotice = signal<string>('');

  protected readonly challengeToken = signal<string>('');
  protected readonly maskedEmail = signal<string>('');
  protected readonly available2FAMethods = signal<TwoFactorMethod[]>(['email_otp']);
  protected readonly selected2FAMethod = signal<TwoFactorMethod>('email_otp');
  protected readonly remainingSeconds = signal<number>(300);

  protected readonly recoveryCodeSent = signal<boolean>(false);
  protected readonly recoveryCompleted = signal<boolean>(false);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly countdownLabel = computed(() => {
    const secs = Math.max(0, this.remainingSeconds());
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  });

  protected readonly credentialsForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    }),
    keepSession: new FormControl(false, { nonNullable: true })
  });

  protected readonly twoFactorForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)]
    })
  });

  protected readonly forgotRequestForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });

  protected readonly forgotConfirmForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)]
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)]
    })
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const reason = this.route.snapshot.queryParamMap.get('reason');
      if (reason === 'session_expired') {
        this.sessionExpiredNotice.set('Your previous administrator session expired. Please authenticate again.');
      }

      this.authSession.verifyAdminSession().subscribe(res => {
        if (res.valid && res.user?.role === RbacRole.ADMIN) {
          this.userService.loginAs(res.user.isSuperAdmin ? 'superadmin' : 'admin', res.user.email);
          this.router.navigateByUrl(this.resolveAdminReturnUrl());
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  protected toggleResetPasswordVisibility(): void {
    this.showResetPassword.update(v => !v);
  }

  protected checkCapsLock(event: KeyboardEvent): void {
    if (typeof event.getModifierState === 'function') {
      this.capsLockActive.set(event.getModifierState('CapsLock'));
    }
  }

  protected openForgotPassword(): void {
    this.stopCountdown();
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.recoveryCodeSent.set(false);
    this.recoveryCompleted.set(false);
    this.forgotRequestForm.patchValue({
      email: this.credentialsForm.controls.email.value.trim()
    });
    this.step.set('forgot');
  }

  protected backToCredentials(): void {
    this.stopCountdown();
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.twoFactorForm.reset({ code: '' });
    this.challengeToken.set('');
    this.step.set('credentials');
  }

  protected submitCredentials(): void {
    if (this.credentialsForm.invalid) {
      this.credentialsForm.markAllAsTouched();
      this.errorMessage.set('Please enter a valid administrator email and password.');
      return;
    }

    const { email, password } = this.credentialsForm.getRawValue();
    this.errorMessage.set('');
    this.sessionExpiredNotice.set('');
    this.isSubmitting.set(true);

    this.authSession.adminLoginStep1(email.trim(), password).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.challengeToken.set(res.challengeToken);
        this.maskedEmail.set(res.maskedEmail);
        this.available2FAMethods.set(res.methods?.length ? res.methods : ['email_otp']);
        this.selected2FAMethod.set('email_otp');
        this.infoMessage.set('');
        this.twoFactorForm.reset({ code: '' });
        this.step.set('2fa');
        this.startCountdown(res.expiresInSeconds || 300);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const msg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(msg || 'Authentication failed. Please verify your administrator credentials.');
      }
    });
  }

  protected async loginWithFirebaseGoogle(): Promise<void> {
    this.errorMessage.set('');
    this.sessionExpiredNotice.set('');
    this.isSubmitting.set(true);

    try {
      const keepSession = this.credentialsForm.controls.keepSession.value;
      const res = await this.authSession.adminFirebaseLogin(keepSession);
      this.isSubmitting.set(false);

      if (res.success && res.user) {
        this.userService.loginAs(res.user.isSuperAdmin ? 'superadmin' : 'admin', res.user.email, res.user.name);
        this.auditService.log({
          userId: res.user.id,
          userName: res.user.email,
          role: 'ADMIN',
          module: 'Authentication',
          action: 'Login',
          target: 'Admin Portal (Firebase Verified)',
          status: 'Success'
        });
        this.router.navigateByUrl(this.resolveAdminReturnUrl());
      }
    } catch (err: unknown) {
      this.isSubmitting.set(false);
      if (err instanceof HttpErrorResponse) {
        const msg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(msg || 'Google Admin verification failed.');
      } else if (err instanceof Error) {
        this.errorMessage.set(err.message);
      } else {
        this.errorMessage.set('Unable to complete Firebase Google Admin Sign-In.');
      }
    }
  }

  protected submitTwoFactor(): void {
    if (this.twoFactorForm.invalid) {
      this.twoFactorForm.markAllAsTouched();
      this.errorMessage.set('Please enter a valid 6-digit verification code.');
      return;
    }

    const code = this.twoFactorForm.controls.code.value.trim();
    const keepSession = this.credentialsForm.controls.keepSession.value;
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.isSubmitting.set(true);

    this.authSession.adminVerify2FA(this.challengeToken(), code, this.selected2FAMethod(), keepSession).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.stopCountdown();
        this.userService.loginAs(res.user.isSuperAdmin ? 'superadmin' : 'admin', res.user.email);
        this.auditService.log({
          userId: res.user.id,
          userName: res.user.email,
          role: 'ADMIN',
          module: 'Authentication',
          action: 'Login',
          target: 'Admin Portal (2FA Verified)',
          status: 'Success'
        });
        this.router.navigateByUrl(this.resolveAdminReturnUrl());
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const msg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(msg || '2FA verification failed. Please check the code and try again.');
      }
    });
  }

  protected resendOtp(): void {
    if (!this.challengeToken()) return;
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.isSubmitting.set(true);

    this.authSession.adminResend2FA(this.challengeToken()).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.challengeToken.set(res.challengeToken);
        this.maskedEmail.set(res.maskedEmail);
        this.infoMessage.set(res.message);
        this.startCountdown(res.expiresInSeconds || 300);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const msg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(msg || 'Unable to resend verification code. Please sign in again.');
      }
    });
  }

  protected requestPasswordRecovery(): void {
    if (this.forgotRequestForm.invalid) {
      this.forgotRequestForm.markAllAsTouched();
      return;
    }

    const email = this.forgotRequestForm.controls.email.value.trim();
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authSession.adminForgotPassword(email).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.infoMessage.set(res.message);
        this.recoveryCodeSent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const msg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(msg || 'Failed to initiate recovery request.');
      }
    });
  }

  protected confirmPasswordReset(): void {
    if (this.forgotConfirmForm.invalid) {
      this.forgotConfirmForm.markAllAsTouched();
      this.errorMessage.set('Enter the 6-digit recovery code and a strong new password (min 8 chars).');
      return;
    }

    const email = this.forgotRequestForm.controls.email.value.trim();
    const { code, newPassword } = this.forgotConfirmForm.getRawValue();
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authSession.adminResetPassword(email, code.trim(), newPassword).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.recoveryCompleted.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const msg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(msg || 'Unable to reset password. Verify the recovery code and password requirements.');
      }
    });
  }

  private startCountdown(seconds: number): void {
    this.stopCountdown();
    this.remainingSeconds.set(seconds);
    if (!isPlatformBrowser(this.platformId)) return;
    this.countdownTimer = setInterval(() => {
      this.remainingSeconds.update(s => {
        if (s <= 1) {
          this.stopCountdown();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private resolveAdminReturnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl')?.trim();
    if (
      raw &&
      raw.startsWith('/admin/') &&
      !raw.startsWith('//') &&
      !raw.startsWith('/admin/secure-login')
    ) {
      return raw;
    }
    return '/admin/dashboard';
  }
}
