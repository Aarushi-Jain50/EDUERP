import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { UserAccountsService } from '../../../services/user-accounts.service';
import {
  AdmissionStatus,
  DocumentVerificationStatus,
  StudentAdmission
} from '../../../models/student.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

export interface AdmissionRow extends StudentAdmission {
  prevQualWithPct: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-admissions-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans relative">

      <!-- Toast Notifications Container -->
      <div class="fixed top-20 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        @for (toast of toasts(); track toast.id) {
          <div
            class="pointer-events-auto p-3.5 rounded-xl shadow-xl border text-xs font-medium flex items-start gap-3"
            [class]="toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'"
          >
            <span class="material-icons text-base mt-0.5">
              {{ toast.type === 'error' ? 'cancel' : toast.type === 'info' ? 'info' : 'check_circle' }}
            </span>
            <p class="flex-1 leading-snug">{{ toast.text }}</p>
            <button type="button" (click)="dismissToast(toast.id)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons text-xs">close</span>
            </button>
          </div>
        }
      </div>

      <!-- Issued Portal Credentials Banner -->
      @if (issuedCredentials(); as creds) {
        <div class="p-4 rounded-xl bg-emerald-900 text-white border border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-2.5 text-xs">
            <span class="material-icons text-emerald-400 text-xl mt-0.5">vpn_key</span>
            <div>
              <p class="font-bold text-sm">Student Enrolled & Login Provisioned</p>
              <p class="text-emerald-200 mt-0.5">
                Enrollment: <span class="font-mono font-bold text-white">{{ creds.enrollmentNo }}</span>
                · Username: <span class="font-mono font-bold text-white">&#64;{{ creds.username }}</span>
                · Temp Password: <span class="font-mono font-bold text-amber-300">{{ creds.tempPass }}</span>
              </p>
            </div>
          </div>
          <button type="button" (click)="issuedCredentials.set(null)" class="text-emerald-300 hover:text-white self-end sm:self-center cursor-pointer">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      }

      @if (bannerError(); as err) {
        <div class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-base text-red-600">error_outline</span>
            <span>{{ err }}</span>
          </div>
          <button type="button" (click)="bannerError.set(null)" class="text-red-500 hover:text-red-800 cursor-pointer">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      }

      <!-- 1. Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Student Admissions"
          subtitle="Review applications, verify candidate documents, detect duplicates, approve candidates, and auto-enroll with portal credentials."
          actionLabel="New Application"
          actionIcon="person_add_alt"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="exportExcel()"
            class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-emerald-600">table_view</span>
            <span>Excel</span>
          </button>
          <button
            type="button"
            (click)="exportPdf()"
            class="h-10 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-rose-600">picture_as_pdf</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="stats()" />

      <!-- 3. Status Filter Tabs -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          (click)="activeTab.set('All')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'All' ? 'bg-[#1A1745] text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>All Applications</span>
          <span class="px-1.5 rounded-full text-[10px] font-bold" [class]="activeTab() === 'All' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
            {{ tabCounts().all }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('Applied')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'Applied' ? 'bg-[#6D42E8] text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>Applied</span>
          <span class="px-1.5 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Applied' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'">
            {{ tabCounts().applied }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('Under Review')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'Under Review' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>Under Review</span>
          <span class="px-1.5 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Under Review' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'">
            {{ tabCounts().underReview }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('Approved')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'Approved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>Approved</span>
          <span class="px-1.5 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'">
            {{ tabCounts().approved }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('Rejected')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'Rejected' ? 'bg-red-600 text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>Rejected</span>
          <span class="px-1.5 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Rejected' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'">
            {{ tabCounts().rejected }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('Enrolled')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'Enrolled' ? 'bg-[#D946EF] text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>Enrolled</span>
          <span class="px-1.5 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Enrolled' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'">
            {{ tabCounts().enrolled }}
          </span>
        </button>
      </div>

      <!-- 4. Data Toolbar -->
      <app-data-toolbar
        searchPlaceholder="Search by applicant name, application no, email..."
        [searchValue]="searchQuery()"
        [filter1Options]="courseFilterOptions()"
        [filter1Value]="courseFilter()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="courseFilter.set($event)"
        (resetClicked)="resetFilters()"
      />

      <!-- 5. Data Table Card -->
      <app-data-table
        [columns]="columns"
        [data]="tableData()"
        idKey="id"
        [hideEdit]="true"
        [hideDelete]="true"
        [customActions]="customRowActions"
        emptyIcon="assignment"
        emptyTitle="No admission applications found"
        emptyMessage="No candidate records match your active tab or search filter."
        emptyActionLabel="Create Application"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- 6. Add Application Drawer -->
      <app-form-drawer
        [isOpen]="isFormDrawerOpen()"
        title="Submit New Admission Application"
        subtitle="Enter candidate personal background, academic qualification, and course preference."
        saveLabel="Submit Application"
        widthClass="max-w-[560px]"
        (closed)="isFormDrawerOpen.set(false)"
        (saved)="submitApplication()"
      >
        @if (formErrorMessage()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mb-3">
            <span class="material-icons text-base text-red-500">error</span>
            <span>{{ formErrorMessage() }}</span>
          </div>
        }

        <form [formGroup]="admissionForm" class="space-y-4 text-xs sm:text-[13px]">
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Applicant Personal Details</h3>
            </div>

            <div>
              <label for="adm-applicant-name" class="block font-semibold text-slate-700 mb-1">Full Applicant Name <span class="text-red-500">*</span></label>
              <input id="adm-applicant-name" type="text" formControlName="applicantName" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="adm-gender" class="block font-semibold text-slate-700 mb-1">Gender <span class="text-red-500">*</span></label>
                <select id="adm-gender" formControlName="gender" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label for="adm-dob" class="block font-semibold text-slate-700 mb-1">Date of Birth <span class="text-red-500">*</span></label>
                <input id="adm-dob" type="date" formControlName="dob" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="adm-email" class="block font-semibold text-slate-700 mb-1">Email Address <span class="text-red-500">*</span></label>
                <input id="adm-email" type="email" formControlName="email" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="adm-phone" class="block font-semibold text-slate-700 mb-1">Mobile Number (10 Digits) <span class="text-red-500">*</span></label>
                <input id="adm-phone" type="tel" maxLength="10" formControlName="phone" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div>
              <label for="adm-address" class="block font-semibold text-slate-700 mb-1">Communication Address <span class="text-red-500">*</span></label>
              <textarea id="adm-address" rows="2" formControlName="address" class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900"></textarea>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">school</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Program & Academic Background</h3>
            </div>

            <div>
              <label for="adm-course" class="block font-semibold text-slate-700 mb-1">Course Applied For <span class="text-red-500">*</span></label>
              <select id="adm-course" formControlName="courseApplied" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                @for (c of courses(); track c.id) {
                  <option [value]="c.name">{{ c.name }} ({{ c.code }})</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label for="adm-prevqual" class="block font-semibold text-slate-700 mb-1">Previous Qualification <span class="text-red-500">*</span></label>
                <input id="adm-prevqual" type="text" formControlName="previousQualification" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="adm-percentage" class="block font-semibold text-slate-700 mb-1">Percentage (%) <span class="text-red-500">*</span></label>
                <input id="adm-percentage" type="number" step="0.1" min="0" max="100" formControlName="percentage" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>
          </div>

          <div class="space-y-3 pt-2" formGroupName="guardian">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">family_restroom</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">3. Guardian Information</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label for="adm-guardian-name" class="block font-semibold text-slate-700 mb-1">Guardian Name <span class="text-red-500">*</span></label>
                <input id="adm-guardian-name" type="text" formControlName="name" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="adm-guardian-rel" class="block font-semibold text-slate-700 mb-1">Relation <span class="text-red-500">*</span></label>
                <select id="adm-guardian-rel" formControlName="relation" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label for="adm-guardian-phone" class="block font-semibold text-slate-700 mb-1">Guardian Phone <span class="text-red-500">*</span></label>
                <input id="adm-guardian-phone" type="tel" maxLength="10" formControlName="phone" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>
          </div>
        </form>
      </app-form-drawer>

      <!-- 7. View Admission Application Drawer -->
      @if (viewingAdmission(); as adm) {
        <app-form-drawer
          [isOpen]="true"
          title="Application Review Dossier"
          subtitle="Verify academic eligibility, duplicate candidate checks, documents, and enroll applicant."
          widthClass="max-w-[580px]"
          [showSaveButton]="false"
          (closed)="viewingAdmission.set(null)"
        >
          <div class="space-y-4">
            <div class="p-4 bg-gradient-to-r from-[#1A1745] to-[#2E286E] text-white rounded-2xl shadow-sm flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D42E8] to-[#D946EF] p-0.5 shrink-0 shadow-md">
                <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-lg font-extrabold text-white uppercase">
                  {{ adm.initials }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-base font-bold truncate">{{ adm.applicantName }}</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-pink-300 border border-white/20">
                    {{ adm.status }}
                  </span>
                </div>
                <p class="text-xs text-purple-200 font-mono mt-0.5">{{ adm.applicationNo }}</p>
                <p class="text-xs text-slate-300 mt-1 truncate">{{ adm.courseApplied }} • Applied on {{ adm.appliedOn }}</p>
              </div>
            </div>

            <!-- Duplicate Candidate Alert -->
            @if (duplicateAlert(); as dup) {
              @if (dup.isDuplicate) {
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                  <span class="material-icons text-base text-amber-600 shrink-0">warning_amber</span>
                  <div>
                    <p class="font-bold">Potential Duplicate Candidate Detected</p>
                    <p class="text-[11px] mt-0.5">{{ dup.reason }}</p>
                  </div>
                </div>
              }
            }

            <!-- Eligibility Warning (< 50%) -->
            @if (adm.percentage < 50) {
              <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <span class="material-icons text-base text-red-600">gpp_bad</span>
                <span><strong>Eligibility Alert:</strong> Score ({{ adm.percentage }}%) is below the 50% minimum institutional admission threshold.</span>
              </div>
            }

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Academic Background & Qualification
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <span class="text-slate-500 block text-[11px]">Previous Qualification</span>
                  <span class="font-semibold text-slate-800">{{ adm.previousQualification }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Aggregate Percentage</span>
                  <span class="font-extrabold text-sm" [class]="adm.percentage < 50 ? 'text-red-600' : 'text-indigo-700'">{{ adm.percentage }}%</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Application Date</span>
                  <span class="font-semibold text-slate-800">{{ adm.appliedOn }}</span>
                </div>
              </div>
            </div>

            <!-- Document Verification Checklist -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <span class="material-icons text-sm">verified</span> Document Verification Checklist
              </div>
              <div class="space-y-2">
                @for (doc of getAdmissionDocs(adm); track doc.key) {
                  <div class="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-semibold text-slate-800 truncate">{{ doc.label }}</p>
                      <span
                        class="text-[10px] font-bold uppercase"
                        [class]="doc.status === 'Verified' ? 'text-emerald-600' : doc.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'"
                      >
                        {{ doc.status }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        (click)="setAdmissionDocStatus(adm.id, doc.key, 'Verified')"
                        class="px-2 py-1 rounded text-[10px] font-bold border cursor-pointer"
                        [class]="doc.status === 'Verified' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        (click)="setAdmissionDocStatus(adm.id, doc.key, 'Pending')"
                        class="px-2 py-1 rounded text-[10px] font-bold border cursor-pointer"
                        [class]="doc.status === 'Pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'"
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        (click)="setAdmissionDocStatus(adm.id, doc.key, 'Rejected')"
                        class="px-2 py-1 rounded text-[10px] font-bold border cursor-pointer"
                        [class]="doc.status === 'Rejected' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Contact, Guardian & Reviewer Notes
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div><span class="text-slate-500 block text-[11px]">Applicant Email</span><span class="font-semibold text-slate-800 truncate block">{{ adm.email }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Applicant Phone</span><span class="font-semibold text-slate-800">{{ adm.phone }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Guardian</span><span class="font-semibold text-slate-800">{{ adm.guardian.name }} ({{ adm.guardian.relation }})</span></div>
                <div><span class="text-slate-500 block text-[11px]">Guardian Phone</span><span class="font-semibold text-slate-800">{{ adm.guardian.phone }}</span></div>
              </div>
              @if (adm.status !== 'Enrolled') {
                <div class="pt-2">
                  <label for="adm-review-notes" class="block text-[11px] font-semibold text-slate-600 mb-1">Admission Officer Notes</label>
                  <textarea
                    id="adm-review-notes"
                    rows="2"
                    [value]="reviewNotesDraft()"
                    (input)="reviewNotesDraft.set($any($event.target).value)"
                    placeholder="Record verification comments or interview remarks..."
                    class="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  ></textarea>
                </div>
              } @else if (adm.reviewNotes) {
                <p class="text-[11px] text-slate-600 pt-1"><strong>Notes:</strong> {{ adm.reviewNotes }}</p>
              }
            </div>

            <div class="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
              @if (adm.status === 'Applied') {
                <button
                  type="button"
                  (click)="updateStatus(adm.id, 'Under Review')"
                  class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs cursor-pointer"
                >
                  Mark Under Review
                </button>
              }
              @if (adm.status === 'Applied' || adm.status === 'Under Review') {
                <button
                  type="button"
                  (click)="updateStatus(adm.id, 'Approved')"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
                >
                  Approve Candidate
                </button>
                <button
                  type="button"
                  (click)="updateStatus(adm.id, 'Rejected')"
                  class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs cursor-pointer"
                >
                  Reject Candidate
                </button>
              }
              @if (adm.status === 'Approved') {
                <button
                  type="button"
                  (click)="enrollApplicant(adm.id)"
                  class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D42E8] to-[#D946EF] text-white font-bold text-xs shadow-md hover:opacity-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span class="material-icons text-sm">school</span>
                  <span>Enroll & Provision Account</span>
                </button>
              }
            </div>
          </div>
        </app-form-drawer>
      }

    </div>
  `
})
export class StudentAdmissionsPage {
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);
  private readonly userAccountsService = inject(UserAccountsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly courseFilter = signal<string>('');
  protected readonly activeTab = signal<'All' | AdmissionStatus>('All');

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly viewingAdmission = signal<StudentAdmission | null>(null);
  protected readonly reviewNotesDraft = signal<string>('');
  protected readonly formErrorMessage = signal<string | null>(null);
  protected readonly bannerError = signal<string | null>(null);
  protected readonly issuedCredentials = signal<{ enrollmentNo: string; username: string; tempPass: string } | null>(null);

  protected readonly toasts = computed(() => this.studentsService.toasts());
  protected readonly courses = computed(() => this.academicService.courses());
  protected readonly tabCounts = computed(() => this.studentsService.admissionTabCounts());

  protected readonly duplicateAlert = computed(() => {
    const adm = this.viewingAdmission();
    if (!adm) return null;
    return this.studentsService.checkDuplicateCandidate(adm.email, adm.phone, adm.id);
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.studentsService.admissionStats();
    return [
      {
        label: 'Total Applications',
        value: s.total,
        subtext: 'Current admission cycle',
        icon: 'assignment',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Under Review',
        value: s.underReview,
        subtext: 'Document verification active',
        icon: 'pending_actions',
        iconBgClass: 'bg-amber-50 border-amber-100',
        iconColorClass: 'text-amber-600'
      },
      {
        label: 'Approved & Enrolled',
        value: s.approved + s.enrolled,
        subtext: 'Cleared for onboarding',
        icon: 'how_to_reg',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      }
    ];
  });

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Courses', value: '' }];
    this.courses().forEach(c => options.push({ label: c.name, value: c.name }));
    return options;
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.courseFilter() !== '';
  });

  protected readonly columns: TableColumn[] = [
    { key: 'applicationNo', header: 'Application No', isMono: true, isBold: true },
    { key: 'applicantName', header: 'Applicant', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'courseApplied', header: 'Course Applied' },
    { key: 'appliedOn', header: 'Applied On' },
    { key: 'prevQualWithPct', header: 'Previous Qualification' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<AdmissionRow>[] = [
    {
      id: 'review',
      label: 'Mark Under Review',
      icon: 'pending_actions',
      showIf: row => row.status === 'Applied'
    },
    {
      id: 'approve',
      label: 'Approve Candidate',
      icon: 'check_circle',
      showIf: row => row.status === 'Applied' || row.status === 'Under Review'
    },
    {
      id: 'reject',
      label: 'Reject Candidate',
      icon: 'cancel',
      danger: true,
      showIf: row => row.status !== 'Rejected' && row.status !== 'Enrolled'
    },
    {
      id: 'enroll',
      label: 'Enroll as Student',
      icon: 'school',
      showIf: row => row.status === 'Approved'
    }
  ];

  protected readonly tableData = computed<AdmissionRow[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const course = this.courseFilter();
    const tab = this.activeTab();

    return this.studentsService.admissions()
      .filter(a => {
        const matchesTab = tab === 'All' || a.status === tab;
        const matchesCourse = !course || a.courseApplied === course;
        const matchesSearch =
          !query ||
          a.applicantName.toLowerCase().includes(query) ||
          a.applicationNo.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query) ||
          a.previousQualification.toLowerCase().includes(query);
        return matchesTab && matchesCourse && matchesSearch;
      })
      .map(a => ({
        ...a,
        prevQualWithPct: `${a.previousQualification} (${a.percentage}%)`
      }));
  });

  protected readonly admissionForm = new FormGroup({
    applicantName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gender: new FormControl<'Male' | 'Female' | 'Other'>('Male', { nonNullable: true, validators: [Validators.required] }),
    dob: new FormControl('2004-01-01', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    courseApplied: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    previousQualification: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    percentage: new FormControl<number>(75.0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(100)] }),
    guardian: new FormGroup({
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      relation: new FormControl('Father', { nonNullable: true, validators: [Validators.required] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] })
    })
  });

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.courseFilter.set('');
  }

  protected openAddDrawer(): void {
    const defaultCourse = this.courses()[0]?.name || 'Master of Computer Applications';
    this.formErrorMessage.set(null);
    this.admissionForm.reset({
      applicantName: '',
      gender: 'Male',
      dob: '2004-01-01',
      email: '',
      phone: '',
      address: '',
      courseApplied: defaultCourse,
      previousQualification: '',
      percentage: 80.0,
      guardian: { name: '', relation: 'Father', phone: '' }
    });
    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(adm: AdmissionRow): void {
    this.viewingAdmission.set(adm);
    this.reviewNotesDraft.set(adm.reviewNotes || '');
  }

  protected handleCustomAction(event: { actionId: string; row: AdmissionRow }): void {
    const { actionId, row } = event;
    if (actionId === 'review') this.updateStatus(row.id, 'Under Review');
    else if (actionId === 'approve') this.updateStatus(row.id, 'Approved');
    else if (actionId === 'reject') this.updateStatus(row.id, 'Rejected');
    else if (actionId === 'enroll') this.enrollApplicant(row.id);
  }

  protected getAdmissionDocs(adm: StudentAdmission) {
    return this.studentsService.getDocumentsForAdmission(adm);
  }

  protected setAdmissionDocStatus(admissionId: string, docKey: string, status: DocumentVerificationStatus): void {
    this.studentsService.verifyAdmissionDocument(admissionId, docKey, status);
    const updated = this.studentsService.admissions().find(a => a.id === admissionId);
    if (updated) this.viewingAdmission.set(updated);
  }

  protected updateStatus(id: string, newStatus: AdmissionStatus): void {
    this.studentsService.updateAdmissionStatus(id, newStatus, this.reviewNotesDraft().trim() || undefined);
    if (this.viewingAdmission()?.id === id) {
      const updated = this.studentsService.admissions().find(a => a.id === id);
      if (updated) this.viewingAdmission.set(updated);
    }
  }

  protected enrollApplicant(admissionId: string): void {
    this.bannerError.set(null);
    const res = this.studentsService.enrollApplicantAsStudent(admissionId);
    if (!res.success) {
      this.bannerError.set(res.error || 'Enrollment failed.');
      return;
    }
    if (res.student) {
      const creds = this.userAccountsService.createLinkedAccountForStudent(res.student);
      if (creds) {
        this.issuedCredentials.set({
          enrollmentNo: res.enrollmentNo || res.student.enrollmentNo,
          username: creds.username,
          tempPass: creds.tempPass
        });
      }
    }
    if (this.viewingAdmission()?.id === admissionId) {
      const updated = this.studentsService.admissions().find(a => a.id === admissionId);
      if (updated) this.viewingAdmission.set(updated);
    }
  }

  protected submitApplication(): void {
    this.admissionForm.markAllAsTouched();
    if (this.admissionForm.invalid) {
      this.formErrorMessage.set('Please fill in all required fields with valid input.');
      return;
    }

    const val = this.admissionForm.getRawValue();
    const selectedCourseObj = this.courses().find(c => c.name === val.courseApplied);
    const departmentName = selectedCourseObj ? selectedCourseObj.department : 'Computer Applications';
    const departmentId = selectedCourseObj ? `dept-${selectedCourseObj.code.toLowerCase()}` : 'dept-mca';
    const courseId = selectedCourseObj ? selectedCourseObj.id : 'course-mca';

    const res = this.studentsService.saveAdmission({
      applicantName: val.applicantName,
      gender: val.gender,
      dob: val.dob,
      email: val.email,
      phone: val.phone,
      address: val.address,
      courseId,
      courseApplied: val.courseApplied,
      departmentId,
      department: departmentName,
      previousQualification: val.previousQualification,
      percentage: val.percentage,
      guardian: val.guardian
    });

    if (res.success) {
      this.isFormDrawerOpen.set(false);
    } else {
      this.formErrorMessage.set(res.error || 'Failed to submit application.');
    }
  }

  protected dismissToast(id: string): void {
    this.studentsService.removeToast(id);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.tableData().map(a => ({
        'Application No': a.applicationNo,
        Applicant: a.applicantName,
        Email: a.email,
        Phone: a.phone,
        'Course Applied': a.courseApplied,
        Qualification: a.previousQualification,
        'Percentage (%)': a.percentage,
        'Applied On': a.appliedOn,
        Status: a.status
      })),
      'EduERP_Student_Admissions'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Student Admissions & Onboarding Pipeline',
      ['App No', 'Applicant', 'Course Applied', 'Applied On', 'Qualification & Score', 'Status'],
      this.tableData().map(a => [a.applicationNo, a.applicantName, a.courseApplied, a.appliedOn, a.prevQualWithPct, a.status]),
      'EduERP_Student_Admissions'
    );
  }
}
