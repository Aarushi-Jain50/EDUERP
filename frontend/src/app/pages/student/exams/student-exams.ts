import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { EmptyState } from '../../../components/shared/empty-state';
import { ExamMode } from '../../../services/examinations.service';
import { ExamSecurityService } from '../../../services/exam-security.service';
import { StudentFirebaseService } from '../../../services/student-firebase.service';
import { auth } from '../../../lib/firebase';
import { exportToPdf } from '../../../utils/export.helper';
import { StudentExamItem, StudentPortalFacade } from '../shared/student-portal.facade';

@Component({
  selector: 'app-student-exams',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeader, StatStrip, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 font-sans text-[#172554] text-[13px] pb-10 min-w-0">
      <app-page-header
        title="Protected Examinations Portal"
        [subtitle]="'Online & Offline examination schedule, proctoring launcher, and hall tickets for ' + facade.currentStudent().course + ' (' + facade.currentStudent().semester + ').'"
        [actionLabel]="examSecurity.isPortalUnlocked() ? 'Admit Card / Hall Ticket' : ''"
        actionIcon="badge"
        (actionClicked)="isAdmitCardOpen.set(true)"
      />

      @if (!examSecurity.isPortalUnlocked()) {
        <!-- Strict Exam Portal Verification Gate -->
        <section class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden max-w-2xl mx-auto">
          <div class="gradient-brand text-white p-5 sm:p-6 flex items-start justify-between gap-4">
            <div class="space-y-1">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white/10 text-indigo-200 text-[11px] font-semibold">
                <mat-icon class="text-xs">enhanced_encryption</mat-icon>
                <span>Strictly Protected Portal</span>
              </div>
              <h2 class="text-lg font-bold tracking-tight">Verify Identity to Enter Examinations</h2>
              <p class="text-xs text-slate-300">
                Examination timetables, online proctored papers, and hall ticket serials are locked per browser session.
              </p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <mat-icon class="text-xl text-indigo-200">lock</mat-icon>
            </div>
          </div>

          <div class="p-5 sm:p-6 space-y-5">
            @if (redirectedLocked()) {
              <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <mat-icon class="text-base text-amber-700 shrink-0">gpp_maybe</mat-icon>
                <span>Direct access to live examination rooms requires completing identity verification first.</span>
              </div>
            }

            @if (gateError()) {
              <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
                <span>{{ gateError() }}</span>
              </div>
            }

            <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Signed-In Candidate</p>
                <p class="font-bold text-[#172554] mt-0.5">{{ facade.currentStudent().name }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Registered Enrollment</p>
                <p class="font-mono font-bold text-[#6D42E8] mt-0.5">{{ facade.currentStudent().enrollmentNo }}</p>
              </div>
            </div>

            <form [formGroup]="unlockForm" (ngSubmit)="submitUnlock()" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label for="exam-gate-enroll" class="text-xs font-semibold text-[#172554]">Enrollment Number</label>
                  <input
                    id="exam-gate-enroll"
                    type="text"
                    formControlName="enrollmentNo"
                    placeholder="e.g. MCA2025001"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-mono uppercase text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="exam-gate-pin" class="text-xs font-semibold text-[#172554]">Exam Security PIN</label>
                  <input
                    id="exam-gate-pin"
                    type="password"
                    formControlName="hallPin"
                    placeholder="Last 4 digits of Enrollment"
                    class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#172554] focus:outline-none focus:border-[#6D42E8]"
                  />
                </div>
              </div>

              <p class="text-[11px] text-[#64748B]">
                Security PIN is the last 4 characters of your Enrollment No (<span class="font-mono font-semibold text-[#172554]">{{ examSecurity.expectedHallPin(facade.currentStudent().enrollmentNo) }}</span>). Unlocks for 45 minutes in this tab only.
              </p>

              <label for="exam-honor-pledge" class="flex items-start gap-2.5 p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 cursor-pointer">
                <input
                  id="exam-honor-pledge"
                  type="checkbox"
                  formControlName="honorAccepted"
                  class="mt-0.5 w-4 h-4 rounded accent-[#6D42E8] cursor-pointer"
                />
                <span class="text-xs text-[#172554] leading-relaxed">
                  <strong>Academic Integrity &amp; Proctoring Pledge:</strong> I confirm I am the enrolled candidate and agree to browser focus monitoring, anti-copy protections, and offline hall regulations.
                </span>
              </label>

              <div class="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                @if (hasVerifiedGoogleAuth()) {
                  <button
                    type="button"
                    (click)="unlockWithGoogle()"
                    class="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <mat-icon class="text-sm">verified_user</mat-icon>
                    <span>Quick Unlock via Verified Google Auth</span>
                  </button>
                }
                <button
                  type="submit"
                  class="gradient-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <mat-icon class="text-sm">lock_open</mat-icon>
                  <span>Verify &amp; Unlock Exams Portal</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      } @else {
        <!-- Active Protection Bar -->
        <div class="p-3.5 sm:px-5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 text-xs text-emerald-950">
            <mat-icon class="text-lg text-emerald-700 shrink-0">verified_user</mat-icon>
            <span>
              <strong>Exam Session Verified</strong> for {{ facade.currentStudent().enrollmentNo }}
              <span aria-hidden="true"> · </span>
              <span>Auto-locks at {{ examSecurity.unlockedUntilDisplay() }}</span>
              <span aria-hidden="true"> · </span>
              <span>Both Online Proctored &amp; Offline Hall exams active</span>
            </span>
          </div>
          <button
            type="button"
            (click)="lockPortal()"
            class="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100/60 text-xs font-semibold text-emerald-900 inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <mat-icon class="text-sm">lock</mat-icon>
            <span>Lock Portal</span>
          </button>
        </div>

        <app-stat-strip [items]="stats()" />

        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <!-- Tabs & Mode Filter -->
          <div class="px-4 sm:px-5 pt-2 sm:pt-3 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
              <button
                type="button"
                (click)="activeTab.set('upcoming')"
                class="min-h-[44px] pb-2.5 pt-1 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                [class]="activeTab() === 'upcoming' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
              >
                Upcoming ({{ filteredUpcoming().length }})
              </button>
              <button
                type="button"
                (click)="activeTab.set('completed')"
                class="min-h-[44px] pb-2.5 pt-1 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                [class]="activeTab() === 'completed' ? 'border-[#6D42E8] text-[#6D42E8]' : 'border-transparent text-[#64748B] hover:text-[#172554]'"
              >
                Completed ({{ filteredCompleted().length }})
              </button>
            </div>

            <!-- Mode Selector Tabs -->
            <div class="flex items-center gap-1.5 pb-2.5 sm:pb-2 overflow-x-auto">
              @for (m of modeFilters; track m) {
                <button
                  type="button"
                  (click)="modeFilter.set(m)"
                  class="px-3 py-1 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  [class]="modeFilter() === m
                    ? 'bg-[#6D42E8] text-white border-[#6D42E8]'
                    : 'bg-slate-50 text-[#64748B] border-[#E2E8F0] hover:text-[#172554]'"
                >
                  {{ m === 'All' ? 'All Modes' : m }}
                </button>
              }
            </div>
          </div>

          <!-- Upcoming Timeline -->
          @if (activeTab() === 'upcoming') {
            @if (filteredUpcoming().length > 0) {
              <div class="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                @for (item of filteredUpcoming(); track item.exam.id) {
                  @let attempt = attemptForExam(item.exam.id);
                  <div class="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div class="flex items-start gap-3.5 sm:gap-4 min-w-0">
                      <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col items-center justify-center shrink-0">
                        <span class="text-sm sm:text-base font-bold text-[#172554] leading-none tabular-nums">{{ item.dayNumber }}</span>
                        <span class="text-[10px] sm:text-[11px] font-semibold uppercase text-[#6D42E8] mt-1">{{ item.monthShort }}</span>
                      </div>

                      <div class="space-y-1.5 min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <h2 class="text-sm font-bold text-[#172554]">{{ item.exam.title }}</h2>
                          <span class="px-2 py-0.5 rounded-full bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-semibold whitespace-nowrap">
                            {{ item.exam.type }}
                          </span>
                          <span
                            class="px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap inline-flex items-center gap-1"
                            [class]="modeBadgeClass(item.exam.mode)"
                          >
                            <mat-icon class="text-[13px]">{{ modeIcon(item.exam.mode) }}</mat-icon>
                            <span>{{ item.exam.mode }}{{ item.exam.proctored ? ' · Proctored' : ' · In-Person' }}</span>
                          </span>
                          @if (attempt?.status === 'Submitted') {
                            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap">
                              Attempt Locked ({{ attempt?.answersCount }} Qs)
                            </span>
                          }
                        </div>

                        <p class="text-xs font-medium text-[#172554]">
                          {{ item.exam.subjectName }}
                          <span class="font-mono text-[#64748B] ml-1">({{ item.subjectCode }})</span>
                        </p>

                        <p class="text-xs text-[#64748B] tabular-nums leading-relaxed">
                          Time: {{ item.exam.time }} · Duration: {{ item.exam.duration }} mins · Max Marks: {{ item.exam.maxMarks }}
                        </p>

                        @if (item.exam.mode === 'Offline' || item.exam.mode === 'Hybrid') {
                          <p class="text-xs text-[#172554] flex items-center gap-1.5 flex-wrap">
                            <mat-icon class="text-sm text-indigo-600">location_on</mat-icon>
                            <span>Venue: <strong>{{ item.exam.venue || 'Examination Block Hall' }}</strong></span>
                            @if (item.exam.seatNo) {
                              <span aria-hidden="true">·</span>
                              <span>Seat: <strong class="font-mono">{{ item.exam.seatNo }}</strong></span>
                            }
                            @if (item.exam.reportingMinutesBefore) {
                              <span aria-hidden="true">·</span>
                              <span class="text-[#64748B]">Report {{ item.exam.reportingMinutesBefore }} min early</span>
                            }
                          </p>
                        } @else {
                          <p class="text-xs text-[#64748B] flex items-center gap-1.5">
                            <mat-icon class="text-sm text-emerald-600">security</mat-icon>
                            <span>Protected Browser: Tab-switch monitor (3 max alerts) · Clipboard disabled · Auto-saved</span>
                          </p>
                        }

                        <p class="text-xs text-[#6D42E8] font-medium flex items-center gap-1.5 flex-wrap">
                          <mat-icon class="text-sm">event_available</mat-icon>
                          <span>
                            Result Announcement: <strong>{{ facade.formatShortDate(item.resultAnnouncementDate) }}</strong>
                            at {{ item.resultAnnouncementTime }}
                            <span class="text-[#64748B] font-normal">({{ item.resultCountdownLabel }} · Results tab only)</span>
                          </span>
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                      <span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold whitespace-nowrap">
                        {{ item.exam.status === 'Ongoing' ? 'Live Now' : item.countdownLabel }}
                      </span>

                      @if (item.exam.mode === 'Online' || item.exam.mode === 'Hybrid') {
                        @if (attempt?.status === 'Submitted') {
                          <a
                            [routerLink]="['/student/exams', item.exam.id, 'live']"
                            class="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <mat-icon class="text-sm">receipt_long</mat-icon>
                            <span>Submission Receipt</span>
                          </a>
                        } @else {
                          <button
                            type="button"
                            (click)="openPrelaunch(item)"
                            class="gradient-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <mat-icon class="text-sm">shield_lock</mat-icon>
                            <span>{{ attempt ? 'Resume Protected Exam' : 'Launch Protected Exam' }}</span>
                          </button>
                        }
                      }

                      @if (item.exam.mode === 'Offline' || item.exam.mode === 'Hybrid') {
                        <button
                          type="button"
                          (click)="isAdmitCardOpen.set(true)"
                          class="px-3.5 py-2 rounded-xl border border-[#6D42E8]/30 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <mat-icon class="text-sm">badge</mat-icon>
                          <span>Hall Ticket</span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state
                icon="event_note"
                title="No matching upcoming exams"
                message="No upcoming examinations match your selected mode filter for this semester."
              />
            }
          }

          <!-- Completed List -->
          @if (activeTab() === 'completed') {
            @if (filteredCompleted().length > 0) {
              <div class="divide-y divide-[#E2E8F0]">
                @for (item of filteredCompleted(); track item.exam.id) {
                  <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div class="space-y-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-bold text-[#172554]">{{ item.exam.title }}</span>
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-[#64748B] border border-[#E2E8F0] text-[11px] font-medium whitespace-nowrap">
                          {{ item.exam.semester }}
                        </span>
                        <span
                          class="px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap"
                          [class]="modeBadgeClass(item.exam.mode)"
                        >
                          {{ item.exam.mode }}
                        </span>
                      </div>
                      <p class="text-xs text-[#64748B] leading-relaxed">
                        {{ item.exam.subjectName }} · Held on {{ facade.formatShortDate(item.exam.date) }} · Max {{ item.exam.maxMarks }} marks
                        @if (item.exam.venue) {
                          <span aria-hidden="true"> · </span>
                          <span>{{ item.exam.venue }}</span>
                        }
                      </p>
                      <p class="text-xs text-[#6D42E8] font-medium flex items-center gap-1.5 flex-wrap">
                        <mat-icon class="text-sm">schedule</mat-icon>
                        @if (item.hasPublishedResult) {
                          <span>Result announced on {{ facade.formatShortDate(item.resultAnnouncementDate) }} · View scorecard in Results tab</span>
                        } @else {
                          <span>Result will be announced on <strong>{{ facade.formatShortDate(item.resultAnnouncementDate) }}</strong> at {{ item.resultAnnouncementTime }} ({{ item.resultCountdownLabel }})</span>
                        }
                      </p>
                    </div>

                    <div class="shrink-0 w-full sm:w-auto">
                      @if (item.hasPublishedResult) {
                        <a
                          routerLink="/student/results"
                          [queryParams]="{ semester: item.exam.semester }"
                          class="w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center px-3.5 py-2 rounded-xl border border-[#6D42E8]/30 bg-purple-50 hover:bg-purple-100/70 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <mat-icon class="text-sm">grade</mat-icon>
                          <span>View in Results Tab</span>
                        </a>
                      } @else {
                        <a
                          routerLink="/student/results"
                          [queryParams]="{ tab: 'schedule' }"
                          class="w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/70 text-xs font-semibold text-amber-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <mat-icon class="text-sm">event_upcoming</mat-icon>
                          <span>{{ item.resultCountdownLabel }}</span>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state
                icon="history_edu"
                title="No completed exams"
                message="Completed examinations matching this mode filter will appear here."
              />
            }
          }
        </div>
      }

      <!-- Pre-Launch Protected Exam Verification Modal -->
      @if (prelaunchExam(); as target) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prelaunch-title"
        >
          <button
            type="button"
            aria-label="Close pre-launch modal"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
            (click)="prelaunchExam.set(null)"
          ></button>

          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 border border-[#E2E8F0] space-y-5">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-[#6D42E8]">Strict Proctoring Check</p>
                <h3 id="prelaunch-title" class="text-base font-bold text-[#172554] mt-0.5">{{ target.exam.title }}</h3>
                <p class="text-xs text-[#64748B]">{{ target.exam.subjectName }} ({{ target.subjectCode }})</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                (click)="prelaunchExam.set(null)"
                class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>

            <div class="space-y-2.5 text-xs">
              <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2.5">
                <mat-icon class="text-base text-emerald-600 shrink-0">check_circle</mat-icon>
                <span>Candidate verified: <strong>{{ facade.currentStudent().enrollmentNo }}</strong></span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2.5">
                <mat-icon class="text-base text-emerald-600 shrink-0">visibility</mat-icon>
                <span>Focus monitor enabled: Max <strong>3 tab switches</strong> before automatic lock &amp; submit.</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center gap-2.5">
                <mat-icon class="text-base text-emerald-600 shrink-0">timer</mat-icon>
                <span>Timed paper: <strong>{{ target.exam.duration }} minutes</strong> · {{ target.exam.maxMarks }} Marks.</span>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                (click)="prelaunchExam.set(null)"
                class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="enterOnlineExam(target.exam.id)"
                class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <mat-icon class="text-sm">lock</mat-icon>
                <span>Enter Protected Exam Room</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Admit Card / Hall Ticket Modal -->
      @if (isAdmitCardOpen() && examSecurity.isPortalUnlocked()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admit-card-heading"
        >
          <button
            type="button"
            aria-label="Close hall ticket modal"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default"
            (click)="isAdmitCardOpen.set(false)"
          ></button>

          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 border border-[#E2E8F0] max-h-[90dvh] overflow-y-auto">
            <div class="gradient-brand text-white p-5 flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] uppercase tracking-wider font-semibold text-indigo-300">
                  {{ facade.instituteProfile().name || 'University Examination Cell' }} · Serial HT-{{ facade.currentStudent().enrollmentNo }}
                </p>
                <h3 id="admit-card-heading" class="text-lg font-bold tracking-tight mt-0.5">
                  Provisional Examination Admit Card (Online &amp; Offline)
                </h3>
                <p class="text-xs text-slate-300 mt-0.5">
                  {{ facade.currentStudent().course }} · {{ facade.currentStudent().semester }}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                (click)="isAdmitCardOpen.set(false)"
                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shrink-0"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>

            <div class="p-5 space-y-5">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Candidate</p>
                  <p class="font-bold text-[#172554] mt-0.5">{{ facade.currentStudent().name }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Enrollment No</p>
                  <p class="font-mono font-bold text-[#6D42E8] mt-0.5">{{ facade.currentStudent().enrollmentNo }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Attendance</p>
                  <p
                    class="font-bold tabular-nums mt-0.5"
                    [class]="isAttendanceEligible() ? 'text-emerald-700' : 'text-rose-600'"
                  >
                    {{ attendance().percentage }}% ({{ isAttendanceEligible() ? 'Eligible' : 'Condonation Req.' }})
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Hall Status</p>
                  <p class="font-bold text-[#172554] mt-0.5">Section {{ facade.currentStudent().section }}</p>
                </div>
              </div>

              @if (examGroups().upcoming.length > 0) {
                <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead class="bg-slate-50 border-b border-[#E2E8F0] text-[10px] uppercase tracking-wider text-[#64748B]">
                      <tr>
                        <th class="px-3.5 py-2.5">Code</th>
                        <th class="px-3.5 py-2.5">Subject &amp; Mode</th>
                        <th class="px-3.5 py-2.5">Date &amp; Shift</th>
                        <th class="px-3.5 py-2.5">Venue / Proctoring</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#E2E8F0]">
                      @for (item of examGroups().upcoming; track item.exam.id) {
                        <tr>
                          <td class="px-3.5 py-2.5 font-mono font-semibold text-[#172554]">{{ item.subjectCode }}</td>
                          <td class="px-3.5 py-2.5">
                            <p class="font-semibold text-[#172554]">{{ item.exam.subjectName }}</p>
                            <p class="text-[11px] text-[#64748B]">{{ item.exam.title }} · {{ item.exam.mode }}</p>
                          </td>
                          <td class="px-3.5 py-2.5 whitespace-nowrap tabular-nums">
                            {{ facade.formatShortDate(item.exam.date) }} · {{ item.exam.time }}
                          </td>
                          <td class="px-3.5 py-2.5 text-[11px] text-[#172554]">
                            {{ item.exam.venue || 'Online Proctored' }}{{ item.exam.seatNo ? ' (Seat ' + item.exam.seatNo + ')' : '' }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <p class="text-xs text-[#64748B] bg-slate-50 border border-[#E2E8F0] rounded-xl p-4">
                  No upcoming examination papers are currently scheduled for this term.
                </p>
              }

              <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <p><strong>Offline Hall Rules:</strong> Arrive 30 mins prior with this Admit Card &amp; Student ID. Smartwatches &amp; phones are prohibited.</p>
                <p><strong>Online Exam Rules:</strong> Use the Protected Browser Launcher; switching tabs more than 3 times locks and submits the exam.</p>
              </div>

              <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  (click)="isAdmitCardOpen.set(false)"
                  class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
                <button
                  type="button"
                  (click)="downloadAdmitCardPdf()"
                  class="gradient-accent text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                  <span>Download Hall Ticket PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentExams implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(StudentPortalFacade);
  protected readonly examSecurity = inject(ExamSecurityService);
  private readonly firebaseService = inject(StudentFirebaseService);

  protected readonly activeTab = signal<'upcoming' | 'completed'>('upcoming');
  protected readonly modeFilter = signal<'All' | ExamMode>('All');
  protected readonly modeFilters: ('All' | ExamMode)[] = ['All', 'Online', 'Offline', 'Hybrid'];
  protected readonly isAdmitCardOpen = signal<boolean>(false);
  protected readonly prelaunchExam = signal<StudentExamItem | null>(null);
  protected readonly gateError = signal<string | null>(null);
  protected readonly redirectedLocked = signal<boolean>(false);

  protected readonly unlockForm = new FormGroup({
    enrollmentNo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hallPin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    honorAccepted: new FormControl(false, { nonNullable: true }),
  });

  protected readonly examGroups = this.facade.studentExams;
  protected readonly attendance = this.facade.overallAttendanceSummary;

  protected readonly hasVerifiedGoogleAuth = computed(
    () => Boolean(auth.currentUser?.emailVerified)
  );

  protected readonly isAttendanceEligible = computed(
    () => !this.attendance().isBelowThreshold
  );

  protected readonly filteredUpcoming = computed(() => {
    const mf = this.modeFilter();
    return this.examGroups().upcoming.filter(i => mf === 'All' || i.exam.mode === mf);
  });

  protected readonly filteredCompleted = computed(() => {
    const mf = this.modeFilter();
    return this.examGroups().completed.filter(i => mf === 'All' || i.exam.mode === mf);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const groups = this.examGroups();
    const onlineCount = groups.upcoming.filter(
      u => u.exam.mode === 'Online' || u.exam.mode === 'Hybrid'
    ).length;
    const offlineCount = groups.upcoming.filter(
      u => u.exam.mode === 'Offline' || u.exam.mode === 'Hybrid'
    ).length;
    return [
      {
        label: 'Online / Hybrid',
        value: onlineCount,
        subtext: 'Proctored browser ready',
        icon: 'laptop_chromebook',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100',
      },
      {
        label: 'Offline Hall',
        value: offlineCount,
        subtext: 'In-person scheduled papers',
        icon: 'apartment',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100',
      },
      {
        label: 'Completed',
        value: groups.completed.length,
        subtext: 'All semesters recorded',
        icon: 'task_alt',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
      },
    ];
  });

  ngOnInit(): void {
    const student = this.facade.currentStudent();
    this.unlockForm.patchValue({ enrollmentNo: student.enrollmentNo });

    const lockedParam = this.route.snapshot.queryParamMap.get('locked');
    if (lockedParam === '1') {
      this.redirectedLocked.set(true);
    }
  }

  protected submitUnlock(): void {
    this.gateError.set(null);
    const val = this.unlockForm.getRawValue();
    const res = this.examSecurity.verifyAndUnlock(
      val.enrollmentNo,
      val.hallPin,
      val.honorAccepted
    );
    if (!res.success) {
      this.gateError.set(res.error || 'Verification failed.');
      return;
    }
    this.redirectedLocked.set(false);
  }

  protected unlockWithGoogle(): void {
    this.gateError.set(null);
    const res = this.examSecurity.verifyWithSignedGoogleSession(
      this.unlockForm.controls.honorAccepted.value
    );
    if (!res.success) {
      this.gateError.set(res.error || 'Google session verification failed.');
      return;
    }
    this.redirectedLocked.set(false);
  }

  protected lockPortal(): void {
    this.isAdmitCardOpen.set(false);
    this.prelaunchExam.set(null);
    this.examSecurity.lockPortal();
  }

  protected attemptForExam(examId: string) {
    return this.firebaseService.getExamAttempt(examId);
  }

  protected openPrelaunch(item: StudentExamItem): void {
    this.prelaunchExam.set(item);
  }

  protected enterOnlineExam(examId: string): void {
    this.prelaunchExam.set(null);
    void this.router.navigate(['/student/exams', examId, 'live']);
  }

  protected modeIcon(mode: ExamMode): string {
    if (mode === 'Online') return 'laptop_mac';
    if (mode === 'Hybrid') return 'devices';
    return 'apartment';
  }

  protected modeBadgeClass(mode: ExamMode): string {
    if (mode === 'Online') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (mode === 'Hybrid') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-100 text-[#172554] border-slate-300';
  }

  protected downloadAdmitCardPdf(): void {
    const s = this.facade.currentStudent();
    const upcoming = this.examGroups().upcoming;
    const columns = ['Code', 'Subject', 'Mode', 'Date & Time', 'Venue / Hall & Seat'];
    const rows = upcoming.map(u => [
      u.subjectCode,
      u.exam.subjectName,
      u.exam.mode,
      `${this.facade.formatShortDate(u.exam.date)} ${u.exam.time}`,
      `${u.exam.venue || 'Online Proctored'}${u.exam.seatNo ? ` (${u.exam.seatNo})` : ''}`,
    ]);

    exportToPdf(
      'Official Examination Admit Card (Online & Offline)',
      columns,
      rows.length > 0 ? rows : [['-', 'No upcoming scheduled papers', '-', '-', '-']],
      `${s.enrollmentNo}-admit-card`,
      [
        `Candidate: ${s.name} (${s.enrollmentNo}) | ${s.course} · ${s.semester}`,
        `Hall Ticket Serial: HT-${s.enrollmentNo} | Attendance: ${this.attendance().percentage}% (${this.isAttendanceEligible() ? 'Eligible' : 'Condonation Required'})`,
      ]
    );
  }
}
