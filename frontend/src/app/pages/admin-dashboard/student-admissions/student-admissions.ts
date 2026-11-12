import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { StudentAdmission, AdmissionStatus } from '../../../models/student.model';

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
            class="pointer-events-auto p-3.5 rounded-xl shadow-xl border text-xs font-medium flex items-start gap-3 transition-all animate-in slide-in-from-right-5 duration-200"
            [class.bg-emerald-50]="toast.type === 'success'"
            [class.border-emerald-200]="toast.type === 'success'"
            [class.text-emerald-900]="toast.type === 'success'"
            [class.bg-red-50]="toast.type === 'error'"
            [class.border-red-200]="toast.type === 'error'"
            [class.text-red-900]="toast.type === 'error'"
            [class.bg-blue-50]="toast.type === 'info'"
            [class.border-blue-200]="toast.type === 'info'"
            [class.text-blue-900]="toast.type === 'info'"
          >
            <span class="material-icons text-base mt-0.5"
              [class.text-emerald-600]="toast.type === 'success'"
              [class.text-red-600]="toast.type === 'error'"
              [class.text-blue-600]="toast.type === 'info'"
            >
              {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'cancel' : 'info' }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-[13px] leading-tight">
                {{ toast.type === 'success' ? 'Action Successful' : toast.type === 'error' ? 'Application Notice' : 'Status Updated' }}
              </p>
              <p class="mt-0.5 leading-snug">{{ toast.text }}</p>
            </div>
            <button
              type="button"
              (click)="dismissToast(toast.id)"
              class="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              <span class="material-icons text-xs">close</span>
            </button>
          </div>
        }
      </div>

      <!-- 1. Page Header -->
      <app-page-header
        title="Student Admissions"
        subtitle="Review applications, manage approval workflow, and enroll candidates."
        primaryActionLabel="New Application"
        primaryActionIcon="person_add_alt"
        (primaryActionClicked)="openAddDrawer()"
      />

      <!-- 2. Stat Strip -->
      <app-stat-strip [items]="stats()" />

      <!-- 3. Status Filter Tabs (Above Toolbar & Table Card) -->
      <div class="bg-white rounded-xl border border-[#E2E8F0] p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          (click)="activeTab.set('All')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          [class]="activeTab() === 'All' ? 'bg-[#1A1745] text-white shadow-xs' : 'text-[#64748B] hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>All Applications</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [class]="activeTab() === 'All' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
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
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Applied' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'">
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
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Under Review' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'">
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
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'">
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
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Rejected' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'">
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
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" [class]="activeTab() === 'Enrolled' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'">
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
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="courseFilter.set($event)"
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

      <!-- 6. Add Application Drawer (560px Wide) -->
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
          
          <!-- SECTION 1: APPLICANT DETAILS -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Applicant Personal Details</h3>
            </div>

            <div>
              <label for="adm-applicant-name" class="block font-semibold text-slate-700 mb-1">
                Full Applicant Name <span class="text-red-500">*</span>
              </label>
              <input
                id="adm-applicant-name"
                type="text"
                formControlName="applicantName"
                placeholder="e.g. Vikramaditya Roy"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="adm-gender" class="block font-semibold text-slate-700 mb-1">
                  Gender <span class="text-red-500">*</span>
                </label>
                <select
                  id="adm-gender"
                  formControlName="gender"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label for="adm-dob" class="block font-semibold text-slate-700 mb-1">
                  Date of Birth <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-dob"
                  type="date"
                  formControlName="dob"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="adm-email" class="block font-semibold text-slate-700 mb-1">
                  Email Address <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-email"
                  type="email"
                  formControlName="email"
                  placeholder="e.g. vikram.roy@gmail.com"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>

              <div>
                <label for="adm-phone" class="block font-semibold text-slate-700 mb-1">
                  Mobile Number (10 Digits) <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-phone"
                  type="tel"
                  maxLength="10"
                  formControlName="phone"
                  placeholder="e.g. 9830099887"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

            <div>
              <label for="adm-address" class="block font-semibold text-slate-700 mb-1">
                Communication Address <span class="text-red-500">*</span>
              </label>
              <textarea
                id="adm-address"
                rows="2"
                formControlName="address"
                placeholder="Full residential address"
                class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              ></textarea>
            </div>
          </div>

          <!-- SECTION 2: COURSE & QUALIFICATION -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">school</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Program & Academic Background</h3>
            </div>

            <div>
              <label for="adm-course" class="block font-semibold text-slate-700 mb-1">
                Course Applied For <span class="text-red-500">*</span>
              </label>
              <select
                id="adm-course"
                formControlName="courseApplied"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              >
                @for (c of courses(); track c.id) {
                  <option [value]="c.name">{{ c.name }} ({{ c.code }})</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label for="adm-prevqual" class="block font-semibold text-slate-700 mb-1">
                  Previous Qualification <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-prevqual"
                  type="text"
                  formControlName="previousQualification"
                  placeholder="e.g. B.Sc Computer Science (Calcutta Univ)"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>

              <div>
                <label for="adm-percentage" class="block font-semibold text-slate-700 mb-1">
                  Percentage (%) <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-percentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  formControlName="percentage"
                  placeholder="e.g. 84.5"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 3: GUARDIAN -->
          <div class="space-y-3 pt-2" formGroupName="guardian">
            <div class="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">family_restroom</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">3. Guardian Information</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label for="adm-guardian-name" class="block font-semibold text-slate-700 mb-1">
                  Guardian Name <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-guardian-name"
                  type="text"
                  formControlName="name"
                  placeholder="e.g. Debashis Roy"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>

              <div>
                <label for="adm-guardian-rel" class="block font-semibold text-slate-700 mb-1">
                  Relation <span class="text-red-500">*</span>
                </label>
                <select
                  id="adm-guardian-rel"
                  formControlName="relation"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div>
                <label for="adm-guardian-phone" class="block font-semibold text-slate-700 mb-1">
                  Guardian Phone <span class="text-red-500">*</span>
                </label>
                <input
                  id="adm-guardian-phone"
                  type="tel"
                  maxLength="10"
                  formControlName="phone"
                  placeholder="e.g. 9830000000"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>
          </div>

        </form>
      </app-form-drawer>

      <!-- 7. View Admission Application Drawer -->
      @if (viewingAdmission(); as adm) {
        <app-form-drawer
          [isOpen]="true"
          title="Application Details"
          subtitle="Read-only view of candidate admission application."
          widthClass="max-w-[560px]"
          [showSaveButton]="false"
          (closed)="viewingAdmission.set(null)"
        >
          <div class="space-y-4">
            <!-- Header Banner -->
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

            <!-- Details Card -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold text-slate-900 uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Academic Background & Qualification
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <span class="text-slate-500 block text-[11px]">Previous Qualification</span>
                  <span class="font-semibold text-slate-800">{{ adm.previousQualification }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Aggregate Percentage</span>
                  <span class="font-extrabold text-indigo-700 text-sm">{{ adm.percentage }}%</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Application Date</span>
                  <span class="font-semibold text-slate-800">{{ adm.appliedOn }}</span>
                </div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5 text-xs">
              <div class="font-bold text-slate-900 uppercase tracking-wider text-purple-800 pb-1 border-b border-slate-200">
                Contact & Guardian Information
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="text-slate-500 block text-[11px]">Applicant Email</span>
                  <span class="font-semibold text-slate-800 truncate block">{{ adm.email }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Applicant Phone</span>
                  <span class="font-semibold text-slate-800">{{ adm.phone }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Guardian Name & Relation</span>
                  <span class="font-semibold text-slate-800">{{ adm.guardian.name }} ({{ adm.guardian.relation }})</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Guardian Contact</span>
                  <span class="font-semibold text-slate-800">{{ adm.guardian.phone }}</span>
                </div>
              </div>
            </div>

            <!-- Contextual Quick Action Buttons in View Drawer -->
            <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              @if (adm.status === 'Applied') {
                <button
                  type="button"
                  (click)="updateStatus(adm.id, 'Under Review')"
                  class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Mark Under Review
                </button>
              }
              @if (adm.status === 'Applied' || adm.status === 'Under Review') {
                <button
                  type="button"
                  (click)="updateStatus(adm.id, 'Approved')"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Approve Candidate
                </button>
                <button
                  type="button"
                  (click)="updateStatus(adm.id, 'Rejected')"
                  class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Reject Candidate
                </button>
              }
              @if (adm.status === 'Approved') {
                <button
                  type="button"
                  (click)="enrollApplicant(adm.id)"
                  class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D42E8] to-[#D946EF] text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span class="material-icons text-sm">school</span>
                  <span>Enroll as Student</span>
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

  // State Signals
  protected readonly searchQuery = signal<string>('');
  protected readonly courseFilter = signal<string>('');
  protected readonly activeTab = signal<'All' | AdmissionStatus>('All');

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly viewingAdmission = signal<StudentAdmission | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  protected readonly toasts = computed(() => this.studentsService.toasts());
  protected readonly courses = computed(() => this.academicService.courses());
  protected readonly tabCounts = computed(() => this.studentsService.admissionTabCounts());

  // Stat Strip Computing
  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.studentsService.admissionStats();
    return [
      { label: 'Total Applications', value: s.total, helperText: 'Current 2026-27 admission cycle', icon: 'assignment', colorClass: 'text-[#6D42E8] bg-purple-50' },
      { label: 'Under Review', value: s.underReview, helperText: 'Document verification in progress', icon: 'pending_actions', colorClass: 'text-amber-600 bg-amber-50' },
      { label: 'Approved & Enrolled', value: s.approved + s.enrolled, helperText: 'Eligible candidates for onboarding', icon: 'how_to_reg', colorClass: 'text-emerald-600 bg-emerald-50' }
    ];
  });

  // Toolbar Course Options
  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Courses', value: '' }];
    this.courses().forEach(c => {
      options.push({ label: c.name, value: c.name });
    });
    return options;
  });

  // Table Columns
  protected readonly columns: TableColumn[] = [
    { key: 'applicationNo', header: 'Application No', isMono: true, isBold: true },
    { key: 'applicantName', header: 'Applicant', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'courseApplied', header: 'Course Applied' },
    { key: 'appliedOn', header: 'Applied On' },
    { key: 'prevQualWithPct', header: 'Previous Qualification' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  // Custom Row Action Menu Items
  protected readonly customRowActions: TableCustomAction<StudentAdmission>[] = [
    {
      id: 'review',
      label: 'Mark Under Review',
      icon: 'pending_actions',
      showIf: (row: StudentAdmission) => row.status === 'Applied'
    },
    {
      id: 'approve',
      label: 'Approve Candidate',
      icon: 'check_circle',
      showIf: (row: StudentAdmission) => row.status === 'Applied' || row.status === 'Under Review'
    },
    {
      id: 'reject',
      label: 'Reject Candidate',
      icon: 'cancel',
      danger: true,
      showIf: (row: StudentAdmission) => row.status !== 'Rejected' && row.status !== 'Enrolled'
    },
    {
      id: 'enroll',
      label: 'Enroll as Student',
      icon: 'school',
      showIf: (row: StudentAdmission) => row.status === 'Approved'
    }
  ];

  // Filtered Table Dataset
  protected readonly tableData = computed(() => {
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

  // Reactive Form Definition
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
      guardian: {
        name: '',
        relation: 'Father',
        phone: ''
      }
    });
    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(adm: StudentAdmission): void {
    this.viewingAdmission.set(adm);
  }

  protected handleCustomAction(event: { actionId: string; row: StudentAdmission }): void {
    const { actionId, row } = event;
    if (actionId === 'review') {
      this.updateStatus(row.id, 'Under Review');
    } else if (actionId === 'approve') {
      this.updateStatus(row.id, 'Approved');
    } else if (actionId === 'reject') {
      this.updateStatus(row.id, 'Rejected');
    } else if (actionId === 'enroll') {
      this.enrollApplicant(row.id);
    }
  }

  protected updateStatus(id: string, newStatus: AdmissionStatus): void {
    this.studentsService.updateAdmissionStatus(id, newStatus);
    if (this.viewingAdmission()?.id === id) {
      const updated = this.studentsService.admissions().find(a => a.id === id);
      if (updated) this.viewingAdmission.set(updated);
    }
  }

  protected enrollApplicant(admissionId: string): void {
    const res = this.studentsService.enrollApplicantAsStudent(admissionId);
    if (res.success && this.viewingAdmission()?.id === admissionId) {
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
}
