import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { read, utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import {
  BulkStudentImportRow,
  DocumentVerificationStatus,
  Student
} from '../../../models/student.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-students-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog
  ],
  template: `
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans relative">

      <!-- Toast Notifications -->
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

      <!-- 1. Page Header + Lifecycle Actions -->
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <app-page-header
          class="flex-1"
          title="Students Directory"
          subtitle="Manage enrolled student profiles, document verification, semester promotion, section transfer, and bulk imports."
          actionLabel="Add Student"
          actionIcon="person_add"
          (actionClicked)="openAddDrawer()"
        />
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            (click)="openBulkImportDrawer()"
            class="h-10 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm">upload_file</span>
            <span>Bulk Import</span>
          </button>
          <button
            type="button"
            (click)="openPromoteDrawer()"
            class="h-10 px-3 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span class="material-icons text-sm">trending_up</span>
            <span>Promote / Transfer</span>
          </button>
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

      <!-- 3. Data Toolbar -->
      <app-data-toolbar
        searchPlaceholder="Search by student name, enrollment no, or email..."
        [searchValue]="searchQuery()"
        [filter1Options]="courseFilterOptions()"
        [filter1Value]="courseFilter()"
        [filter2Options]="statusFilterOptions"
        [filter2Value]="statusFilter()"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="courseFilter.set($event)"
        (filter2Change)="statusFilter.set($event)"
        (resetClicked)="resetFilters()"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="columns"
        [data]="filteredStudents()"
        idKey="id"
        [customActions]="customRowActions"
        emptyIcon="school"
        emptyTitle="No students found"
        emptyMessage="Try adjusting your search criteria or course filters."
        emptyActionLabel="Add New Student"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (editClicked)="openEditDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- 5. Add / Edit Form Drawer -->
      <app-form-drawer
        [isOpen]="isFormDrawerOpen()"
        [title]="editingStudentId() ? 'Edit Student Profile' : 'Register New Student'"
        [subtitle]="editingStudentId() ? 'Update academic, contact, or guardian details.' : 'Enter new student personal, academic, and guardian information.'"
        [saveLabel]="editingStudentId() ? 'Update Profile' : 'Enroll Student'"
        widthClass="max-w-[560px]"
        (closed)="closeFormDrawer()"
        (saved)="submitForm()"
      >
        @if (formErrorMessage()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mb-3">
            <span class="material-icons text-base text-red-500">error</span>
            <span>{{ formErrorMessage() }}</span>
          </div>
        }

        <form [formGroup]="studentForm" class="space-y-5 text-xs sm:text-[13px]">
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-1.5 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">person</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Personal Information</h3>
            </div>

            <div>
              <label for="student-name" class="block font-semibold text-slate-700 mb-1">
                Full Name <span class="text-red-500">*</span>
              </label>
              <input
                id="student-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Rahul Verma"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-gender" class="block font-semibold text-slate-700 mb-1">Gender <span class="text-red-500">*</span></label>
                <select id="student-gender" formControlName="gender" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label for="student-dob" class="block font-semibold text-slate-700 mb-1">Date of Birth <span class="text-red-500">*</span></label>
                <input id="student-dob" type="date" formControlName="dob" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-email" class="block font-semibold text-slate-700 mb-1">Email Address <span class="text-red-500">*</span></label>
                <input id="student-email" type="email" formControlName="email" placeholder="e.g. rahul.verma@eduerp.edu" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="student-phone" class="block font-semibold text-slate-700 mb-1">Mobile Number (10 Digits) <span class="text-red-500">*</span></label>
                <input id="student-phone" type="tel" maxLength="10" formControlName="phone" placeholder="e.g. 9876543210" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div>
              <label for="student-address" class="block font-semibold text-slate-700 mb-1">Permanent Residential Address <span class="text-red-500">*</span></label>
              <textarea id="student-address" rows="2" formControlName="address" placeholder="Full residential street, area, city and state address" class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900"></textarea>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1.5 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">school</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Academic Allocation</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-enrollment" class="block font-semibold text-slate-700 mb-1">Enrollment No <span class="text-red-500">*</span></label>
                <input id="student-enrollment" type="text" formControlName="enrollmentNo" class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-mono font-semibold" />
              </div>
              <div>
                <label for="student-status" class="block font-semibold text-slate-700 mb-1">Enrollment Status <span class="text-red-500">*</span></label>
                <select id="student-status" formControlName="status" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Passed Out">Passed Out</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-course" class="block font-semibold text-slate-700 mb-1">Course / Degree Program <span class="text-red-500">*</span></label>
                <select id="student-course" formControlName="course" (change)="onCourseSelected($event)" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="">-- Select Course --</option>
                  @for (c of courses(); track c.id) {
                    <option [value]="c.name">{{ c.name }} ({{ c.code }})</option>
                  }
                </select>
              </div>
              <div>
                <label for="student-batch" class="block font-semibold text-slate-700 mb-1">Batch / Cohort</label>
                <input id="student-batch" type="text" formControlName="batchName" placeholder="e.g. 2025-2027" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label for="student-semester" class="block font-semibold text-slate-700 mb-1">Semester <span class="text-red-500">*</span></label>
                <select id="student-semester" formControlName="semester" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5">Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                </select>
              </div>
              <div>
                <label for="student-section" class="block font-semibold text-slate-700 mb-1">Section <span class="text-red-500">*</span></label>
                <select id="student-section" formControlName="section" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                </select>
              </div>
              <div>
                <label for="student-admdate" class="block font-semibold text-slate-700 mb-1">Admission Date <span class="text-red-500">*</span></label>
                <input id="student-admdate" type="date" formControlName="admissionDate" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
            </div>
          </div>

          <div class="space-y-3 pt-2" formGroupName="guardian">
            <div class="flex items-center gap-2 pb-1.5 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">family_restroom</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">3. Guardian & Emergency Contact</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="guardian-name" class="block font-semibold text-slate-700 mb-1">Guardian Name <span class="text-red-500">*</span></label>
                <input id="guardian-name" type="text" formControlName="name" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
              </div>
              <div>
                <label for="guardian-relation" class="block font-semibold text-slate-700 mb-1">Relation <span class="text-red-500">*</span></label>
                <select id="guardian-relation" formControlName="relation" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>
            <div>
              <label for="guardian-phone" class="block font-semibold text-slate-700 mb-1">Guardian Phone (10 Digits) <span class="text-red-500">*</span></label>
              <input id="guardian-phone" type="tel" maxLength="10" formControlName="phone" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900" />
            </div>
          </div>
        </form>
      </app-form-drawer>

      <!-- 6. View Profile Drawer (Read-Only + Documents + ID Card + Status Toggle) -->
      @if (viewingStudent(); as student) {
        <app-form-drawer
          [isOpen]="true"
          title="Student Profile Dossier"
          subtitle="Academic overview, document verification checklist, status control, and Student ID export."
          widthClass="max-w-[580px]"
          [showSaveButton]="false"
          (closed)="viewingStudent.set(null)"
        >
          <div class="space-y-4">
            <div class="p-4 bg-gradient-to-r from-[#1A1745] to-[#2E286E] text-white rounded-2xl shadow-sm flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D42E8] to-[#D946EF] p-0.5 shrink-0 shadow-md">
                <div class="w-full h-full rounded-full bg-[#1A1745] flex items-center justify-center text-lg font-extrabold text-white uppercase">
                  {{ student.initials }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-base font-bold truncate">{{ student.name }}</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-emerald-300 border border-white/20">
                    {{ student.status }}
                  </span>
                </div>
                <p class="text-xs text-purple-200 font-mono mt-0.5">{{ student.enrollmentNo }}</p>
                <p class="text-xs text-slate-300 mt-1 truncate">{{ student.course }} • {{ student.semester }} ({{ student.section }})</p>
              </div>
            </div>

            <!-- Action Controls Row -->
            <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-[#E2E8F0]">
              <button
                type="button"
                (click)="downloadStudentIdCard(student)"
                class="px-3 py-1.5 rounded-lg bg-[#1A1745] text-white text-xs font-semibold hover:opacity-95 cursor-pointer inline-flex items-center gap-1.5"
              >
                <span class="material-icons text-sm">badge</span>
                <span>Download ID Card (PDF)</span>
              </button>
              <button
                type="button"
                (click)="toggleViewingStudentStatus(student)"
                class="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                [class]="student.status === 'Active' ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'"
              >
                <span class="material-icons text-sm">sync</span>
                <span>{{ student.status === 'Active' ? 'Deactivate Student' : 'Activate Student' }}</span>
              </button>
            </div>

            <!-- Personal Information -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">person</span> Personal Details
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div><span class="text-slate-500 block text-[11px]">Gender</span><span class="font-semibold text-slate-800">{{ student.gender }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Date of Birth</span><span class="font-semibold text-slate-800">{{ student.dob }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Email Address</span><span class="font-semibold text-slate-800 truncate block">{{ student.email }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Phone Number</span><span class="font-semibold text-slate-800">{{ student.phone }}</span></div>
                <div class="col-span-2"><span class="text-slate-500 block text-[11px]">Residential Address</span><span class="font-semibold text-slate-800">{{ student.address }}</span></div>
              </div>
            </div>

            <!-- Academic Details -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">school</span> Academic Details
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div><span class="text-slate-500 block text-[11px]">Department</span><span class="font-semibold text-slate-800">{{ student.department }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Batch / Academic Year</span><span class="font-semibold text-slate-800">{{ student.batchName || 'Regular' }} ({{ student.academicYear || '2025-26' }})</span></div>
                <div><span class="text-slate-500 block text-[11px]">Semester & Section</span><span class="font-semibold text-slate-800">{{ student.semester }} ({{ student.section }})</span></div>
                <div><span class="text-slate-500 block text-[11px]">Admission Date</span><span class="font-semibold text-slate-800">{{ student.admissionDate }}</span></div>
              </div>
            </div>

            <!-- Document Verification Checklist -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">verified</span> Document Verification Checklist
              </div>
              <div class="space-y-2">
                @for (doc of getStudentDocs(student); track doc.key) {
                  <div class="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                      <p class="font-semibold text-slate-800 truncate">{{ doc.label }}</p>
                      <span
                        class="text-[10px] font-bold uppercase"
                        [class]="doc.status === 'Verified' ? 'text-emerald-600' : doc.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'"
                      >
                        {{ doc.status }}{{ doc.updatedAt ? ' · ' + doc.updatedAt : '' }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        (click)="setDocStatus(student.id, doc.key, 'Verified')"
                        class="px-2 py-1 rounded text-[10px] font-bold border cursor-pointer"
                        [class]="doc.status === 'Verified' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        (click)="setDocStatus(student.id, doc.key, 'Pending')"
                        class="px-2 py-1 rounded text-[10px] font-bold border cursor-pointer"
                        [class]="doc.status === 'Pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'"
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        (click)="setDocStatus(student.id, doc.key, 'Rejected')"
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

            <!-- Guardian Information -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">family_restroom</span> Guardian & Emergency Contact
              </div>
              <div class="grid grid-cols-3 gap-3 text-xs">
                <div><span class="text-slate-500 block text-[11px]">Guardian Name</span><span class="font-semibold text-slate-800">{{ student.guardian.name }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Relation</span><span class="font-semibold text-slate-800">{{ student.guardian.relation }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Contact Phone</span><span class="font-semibold text-slate-800">{{ student.guardian.phone }}</span></div>
              </div>
            </div>
          </div>
        </app-form-drawer>
      }

      <!-- 7. Bulk Import Drawer (CSV / XLSX) -->
      <app-form-drawer
        [isOpen]="isBulkImportOpen()"
        title="Bulk Import Students (CSV / XLSX)"
        subtitle="Upload an Excel or CSV sheet to batch-enroll students with duplicate detection."
        saveLabel="Run Import"
        widthClass="max-w-[540px]"
        (closed)="isBulkImportOpen.set(false)"
        (saved)="executeBulkImport()"
      >
        <div class="space-y-4 text-xs">
          <div class="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-3">
            <div>
              <p class="font-bold text-indigo-900">Need the import template?</p>
              <p class="text-[11px] text-indigo-700 mt-0.5">Download a pre-formatted Excel sheet with valid column headers.</p>
            </div>
            <button
              type="button"
              (click)="downloadBulkTemplate()"
              class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 cursor-pointer shrink-0 inline-flex items-center gap-1"
            >
              <span class="material-icons text-sm">download</span>
              <span>Template (.xlsx)</span>
            </button>
          </div>

          <div class="space-y-1.5">
            <label for="bulk-file-input" class="block font-semibold text-slate-800">Select CSV or Excel File</label>
            <input
              id="bulk-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              (change)="onBulkFileSelected($event)"
              class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs text-slate-700 cursor-pointer"
            />
          </div>

          @if (parsedImportRows().length > 0) {
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <p class="font-bold text-slate-900">Parsed {{ parsedImportRows().length }} row(s) ready to import:</p>
              <div class="max-h-36 overflow-y-auto space-y-1">
                @for (row of parsedImportRows().slice(0, 6); track $index) {
                  <p class="text-[11px] text-slate-600 font-mono truncate">
                    {{ $index + 1 }}. {{ row.name }} · {{ row.email }} · {{ row.course }}
                  </p>
                }
              </div>
            </div>
          }

          @if (importResult(); as res) {
            <div class="p-3.5 rounded-xl border space-y-1.5" [class]="res.errors.length ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'">
              <p class="font-bold">Import Summary: {{ res.importedCount }} imported, {{ res.skippedDuplicates }} duplicates skipped.</p>
              @for (err of res.errors; track err) {
                <p class="text-[11px] text-red-700">• {{ err }}</p>
              }
            </div>
          }
        </div>
      </app-form-drawer>

      <!-- 8. Batch Promote / Section Transfer Drawer -->
      <app-form-drawer
        [isOpen]="isPromoteDrawerOpen()"
        title="Batch Promotion & Section Transfer"
        subtitle="Promote selected students to the next semester or transfer sections within capacity limits."
        [saveLabel]="promoteMode() === 'promote' ? 'Promote Selected' : 'Transfer Selected'"
        widthClass="max-w-[560px]"
        (closed)="isPromoteDrawerOpen.set(false)"
        (saved)="executePromoteOrTransfer()"
      >
        <div class="space-y-4 text-xs">
          @if (promoteError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <span class="material-icons text-base">error_outline</span>
              <span>{{ promoteError() }}</span>
            </div>
          }

          <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              (click)="promoteMode.set('promote')"
              class="py-2 rounded-lg font-bold cursor-pointer transition-colors"
              [class]="promoteMode() === 'promote' ? 'bg-[#1A1745] text-white' : 'text-slate-600 hover:text-slate-900'"
            >
              Promote Semester
            </button>
            <button
              type="button"
              (click)="promoteMode.set('transfer')"
              class="py-2 rounded-lg font-bold cursor-pointer transition-colors"
              [class]="promoteMode() === 'transfer' ? 'bg-[#1A1745] text-white' : 'text-slate-600 hover:text-slate-900'"
            >
              Transfer Section
            </button>
          </div>

          <form [formGroup]="promoteForm" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="prom-course" class="block font-semibold text-slate-700 mb-1">Course Filter</label>
              <select
                id="prom-course"
                formControlName="courseFilter"
                (change)="onPromoteCourseFilterChange($event)"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900"
              >
                <option value="">All Courses</option>
                @for (c of courses(); track c.id) {
                  <option [value]="c.name">{{ c.name }}</option>
                }
              </select>
            </div>

            @if (promoteMode() === 'promote') {
              <div>
                <label for="prom-target-sem" class="block font-semibold text-slate-700 mb-1">Target Semester</label>
                <select id="prom-target-sem" formControlName="targetSemester" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5">Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                  <option value="Passed Out">Passed Out (Graduated)</option>
                </select>
              </div>
            }

            <div class="sm:col-span-2">
              <label for="prom-target-sec" class="block font-semibold text-slate-700 mb-1">
                {{ promoteMode() === 'promote' ? 'Target Section (Optional - keep empty to preserve existing)' : 'Destination Section' }}
              </label>
              <select id="prom-target-sec" formControlName="targetSection" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900">
                @if (promoteMode() === 'promote') {
                  <option value="">Keep Current Section</option>
                }
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
              </select>
            </div>
          </form>

          <div class="flex items-center justify-between pt-1">
            <span class="font-semibold text-slate-700">Selected Students: {{ selectedPromoteIds().length }}</span>
            <button type="button" (click)="toggleSelectAllPromote()" class="text-indigo-600 font-semibold hover:underline cursor-pointer">
              {{ selectedPromoteIds().length === promoteCandidates().length && promoteCandidates().length > 0 ? 'Clear Selection' : 'Select All Visible' }}
            </button>
          </div>

          <div class="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-[#E2E8F0] rounded-xl">
            @for (st of promoteCandidates(); track st.id) {
              <label class="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <div class="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    [checked]="selectedPromoteIds().includes(st.id)"
                    (change)="togglePromoteStudent(st.id)"
                    class="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 truncate">{{ st.name }}</p>
                    <p class="text-[11px] text-slate-500 font-mono truncate">{{ st.enrollmentNo }} · {{ st.course }}</p>
                  </div>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 shrink-0">
                  {{ st.semester }} ({{ st.section }})
                </span>
              </label>
            }
          </div>
        </div>
      </app-form-drawer>

      <!-- 9. Confirm Delete Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Student Record"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Student"
        (cancelled)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class StudentsPage {
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal<string>('');
  protected readonly courseFilter = signal<string>('');
  protected readonly statusFilter = signal<string>('');

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly editingStudentId = signal<string | null>(null);
  protected readonly viewingStudent = signal<Student | null>(null);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly studentToDelete = signal<Student | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  // Bulk import state
  protected readonly isBulkImportOpen = signal<boolean>(false);
  protected readonly parsedImportRows = signal<BulkStudentImportRow[]>([]);
  protected readonly importResult = signal<{ importedCount: number; skippedDuplicates: number; errors: string[] } | null>(null);

  // Promote / transfer state
  protected readonly isPromoteDrawerOpen = signal<boolean>(false);
  protected readonly promoteMode = signal<'promote' | 'transfer'>('promote');
  protected readonly promoteCourseFilterSignal = signal<string>('');
  protected readonly selectedPromoteIds = signal<string[]>([]);
  protected readonly promoteError = signal<string>('');
  protected readonly promoteForm = new FormGroup({
    courseFilter: new FormControl('', { nonNullable: true }),
    targetSemester: new FormControl('Semester 3', { nonNullable: true }),
    targetSection: new FormControl('', { nonNullable: true })
  });

  protected readonly toasts = computed(() => this.studentsService.toasts());
  protected readonly courses = computed(() => this.academicService.courses());

  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'Student', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'enrollmentNo', header: 'Enrollment No', isMono: true, isBold: true },
    { key: 'course', header: 'Course' },
    { key: 'semester', header: 'Semester' },
    { key: 'section', header: 'Section' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly customRowActions: TableCustomAction<Student>[] = [
    {
      id: 'toggle_status',
      label: 'Toggle Active / Inactive',
      icon: 'sync',
      showIf: row => row.status !== 'Passed Out'
    },
    {
      id: 'id_card',
      label: 'Download ID Card (PDF)',
      icon: 'badge'
    }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.studentsService.studentStats();
    return [
      {
        label: 'Total Enrolled Students',
        value: s.total,
        subtext: 'Across all departments',
        icon: 'school',
        iconBgClass: 'bg-purple-50 border-purple-100',
        iconColorClass: 'text-[#6D42E8]'
      },
      {
        label: 'Active Students',
        value: s.active,
        subtext: 'Currently attending classes',
        icon: 'check_circle',
        iconBgClass: 'bg-emerald-50 border-emerald-100',
        iconColorClass: 'text-emerald-600'
      },
      {
        label: 'New Admissions',
        value: s.newThisYear,
        subtext: 'Enrolled in recent sessions',
        icon: 'person_add',
        iconBgClass: 'bg-pink-50 border-pink-100',
        iconColorClass: 'text-[#D946EF]'
      }
    ];
  });

  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Courses', value: '' }];
    this.courses().forEach(c => options.push({ label: c.name, value: c.name }));
    return options;
  });

  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Passed Out', value: 'Passed Out' }
  ];

  protected readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.courseFilter() !== '' || this.statusFilter() !== '';
  });

  protected readonly filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const course = this.courseFilter();
    const status = this.statusFilter();

    return this.studentsService.students().filter(s => {
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.enrollmentNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.phone.includes(query);

      const matchesCourse = !course || s.course === course;
      const matchesStatus = !status || s.status === status;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  });

  protected readonly promoteCandidates = computed(() => {
    const cf = this.promoteCourseFilterSignal();
    return this.studentsService.students().filter(s => (!cf || s.course === cf) && s.status !== 'Passed Out');
  });

  protected readonly studentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gender: new FormControl<'Male' | 'Female' | 'Other'>('Male', { nonNullable: true, validators: [Validators.required] }),
    dob: new FormControl('2003-01-01', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),

    enrollmentNo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<'Active' | 'Inactive' | 'Passed Out'>('Active', { nonNullable: true, validators: [Validators.required] }),
    course: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    batchName: new FormControl('2025-2027', { nonNullable: true }),
    semester: new FormControl('Semester 1', { nonNullable: true, validators: [Validators.required] }),
    section: new FormControl('Section A', { nonNullable: true, validators: [Validators.required] }),
    admissionDate: new FormControl(new Date().toISOString().split('T')[0], { nonNullable: true, validators: [Validators.required] }),

    guardian: new FormGroup({
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      relation: new FormControl('Father', { nonNullable: true, validators: [Validators.required] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] })
    })
  });

  protected resetFilters(): void {
    this.searchQuery.set('');
    this.courseFilter.set('');
    this.statusFilter.set('');
  }

  protected onCourseSelected(event: Event): void {
    const courseName = (event.target as HTMLSelectElement).value;
    if (courseName && !this.editingStudentId()) {
      const autoGenNo = this.studentsService.generateEnrollmentNo(courseName);
      this.studentForm.patchValue({ enrollmentNo: autoGenNo });
    }
  }

  protected openAddDrawer(): void {
    this.editingStudentId.set(null);
    this.formErrorMessage.set(null);
    const firstCourse = this.courses()[0]?.name || 'Master of Computer Applications';
    const autoGenNo = this.studentsService.generateEnrollmentNo(firstCourse);

    this.studentForm.reset({
      name: '',
      gender: 'Male',
      dob: '2004-01-01',
      email: '',
      phone: '',
      address: '',
      enrollmentNo: autoGenNo,
      status: 'Active',
      course: firstCourse,
      batchName: '2025-2027',
      semester: 'Semester 1',
      section: 'Section A',
      admissionDate: new Date().toISOString().split('T')[0],
      guardian: { name: '', relation: 'Father', phone: '' }
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openEditDrawer(student: Student): void {
    this.editingStudentId.set(student.id);
    this.formErrorMessage.set(null);

    this.studentForm.reset({
      name: student.name,
      gender: student.gender,
      dob: student.dob,
      email: student.email,
      phone: student.phone,
      address: student.address,
      enrollmentNo: student.enrollmentNo,
      status: student.status,
      course: student.course,
      batchName: student.batchName || '2025-2027',
      semester: student.semester,
      section: student.section,
      admissionDate: student.admissionDate,
      guardian: {
        name: student.guardian.name,
        relation: student.guardian.relation,
        phone: student.guardian.phone
      }
    });

    this.isFormDrawerOpen.set(true);
  }

  protected openViewDrawer(student: Student): void {
    this.viewingStudent.set(student);
  }

  protected closeFormDrawer(): void {
    this.isFormDrawerOpen.set(false);
    this.formErrorMessage.set(null);
  }

  protected submitForm(): void {
    this.studentForm.markAllAsTouched();
    if (this.studentForm.invalid) {
      this.formErrorMessage.set('Please fix all highlighted errors before submitting.');
      return;
    }

    const formVal = this.studentForm.getRawValue();
    const selectedCourseObj = this.courses().find(c => c.name === formVal.course);
    const departmentName = selectedCourseObj ? selectedCourseObj.department : 'Computer Applications';
    const departmentId = selectedCourseObj ? `dept-${selectedCourseObj.code.toLowerCase()}` : 'dept-mca';
    const courseId = selectedCourseObj ? selectedCourseObj.id : 'course-mca';
    const sectionId = formVal.section === 'Section B' ? 'sec-2' : 'sec-1';

    const payload = {
      enrollmentNo: formVal.enrollmentNo,
      name: formVal.name,
      gender: formVal.gender,
      dob: formVal.dob,
      email: formVal.email,
      phone: formVal.phone,
      address: formVal.address,
      courseId,
      course: formVal.course,
      departmentId,
      department: departmentName,
      batchName: formVal.batchName,
      academicYear: this.academicService.academicYearStats().current,
      semester: formVal.semester,
      sectionId,
      section: formVal.section,
      admissionDate: formVal.admissionDate,
      status: formVal.status,
      guardian: formVal.guardian
    };

    const res = this.studentsService.saveStudent(payload, this.editingStudentId() || undefined);
    if (res.success) {
      this.closeFormDrawer();
    } else {
      this.formErrorMessage.set(res.error || 'Failed to save student record.');
    }
  }

  protected handleCustomAction(event: { actionId: string; row: Student }): void {
    if (event.actionId === 'toggle_status') {
      const nextStatus = event.row.status === 'Active' ? 'Inactive' : 'Active';
      this.studentsService.toggleStudentStatus(event.row.id, nextStatus);
    } else if (event.actionId === 'id_card') {
      this.downloadStudentIdCard(event.row);
    }
  }

  protected toggleViewingStudentStatus(student: Student): void {
    const nextStatus = student.status === 'Active' ? 'Inactive' : 'Active';
    this.studentsService.toggleStudentStatus(student.id, nextStatus);
    const updated = this.studentsService.students().find(s => s.id === student.id);
    if (updated) this.viewingStudent.set(updated);
  }

  protected getStudentDocs(student: Student) {
    return this.studentsService.getDocumentsForStudent(student);
  }

  protected setDocStatus(studentId: string, docKey: string, status: DocumentVerificationStatus): void {
    this.studentsService.verifyStudentDocument(studentId, docKey, status);
    const updated = this.studentsService.students().find(s => s.id === studentId);
    if (updated) this.viewingStudent.set(updated);
  }

  protected downloadStudentIdCard(student: Student): void {
    const doc = new jsPDF('l', 'mm', [90, 56]);
    doc.setFillColor(26, 23, 69);
    doc.rect(0, 0, 90, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('APEX INSTITUTE OF TECHNOLOGY', 5, 7);
    doc.setFontSize(6.5);
    doc.text('OFFICIAL STUDENT IDENTITY CARD', 5, 12);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.text(student.name, 5, 24);
    doc.setFontSize(7.5);
    doc.setTextColor(109, 66, 232);
    doc.text(student.enrollmentNo, 5, 29.5);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7);
    doc.text(`Course: ${student.course}`, 5, 35.5);
    doc.text(`Semester: ${student.semester} (${student.section})`, 5, 40);
    doc.text(`Phone: ${student.phone} | Guardian: ${student.guardian.name}`, 5, 44.5);

    doc.setFillColor(241, 245, 249);
    doc.rect(0, 48, 90, 8, 'F');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`Status: ${student.status} • Valid Session ${student.academicYear || '2025-26'}`, 5, 53);

    doc.save(`ID_Card_${student.enrollmentNo}.pdf`);
  }

  // Bulk Import Handlers
  protected openBulkImportDrawer(): void {
    this.parsedImportRows.set([]);
    this.importResult.set(null);
    this.isBulkImportOpen.set(true);
  }

  protected downloadBulkTemplate(): void {
    const sample = [
      {
        name: 'Aryan Deshpande',
        email: 'aryan.d@eduerp.edu',
        phone: '9822334455',
        course: 'Master of Computer Applications',
        semester: 'Semester 1',
        section: 'Section A',
        gender: 'Male',
        dob: '2003-04-12',
        guardianName: 'Nitin Deshpande',
        guardianPhone: '9822000011'
      }
    ];
    const ws = utils.json_to_sheet(sample);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Students');
    writeFile(wb, 'EduERP_Student_Import_Template.xlsx');
  }

  protected async onBulkFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = utils.sheet_to_json<Record<string, unknown>>(firstSheet);

    const mapped: BulkStudentImportRow[] = rawRows.map(r => ({
      enrollmentNo: String(r['enrollmentNo'] ?? r['Enrollment No'] ?? ''),
      name: String(r['name'] ?? r['Name'] ?? r['Full Name'] ?? ''),
      email: String(r['email'] ?? r['Email'] ?? ''),
      phone: String(r['phone'] ?? r['Phone'] ?? ''),
      course: String(r['course'] ?? r['Course'] ?? 'Master of Computer Applications'),
      semester: String(r['semester'] ?? r['Semester'] ?? 'Semester 1'),
      section: String(r['section'] ?? r['Section'] ?? 'Section A'),
      gender: String(r['gender'] ?? r['Gender'] ?? 'Male') as 'Male' | 'Female' | 'Other',
      dob: String(r['dob'] ?? r['DOB'] ?? '2004-01-01'),
      address: String(r['address'] ?? r['Address'] ?? ''),
      guardianName: String(r['guardianName'] ?? r['Guardian Name'] ?? ''),
      guardianRelation: String(r['guardianRelation'] ?? 'Father'),
      guardianPhone: String(r['guardianPhone'] ?? r['Guardian Phone'] ?? '')
    }));

    this.parsedImportRows.set(mapped);
    this.importResult.set(null);
  }

  protected executeBulkImport(): void {
    const rows = this.parsedImportRows();
    if (rows.length === 0) {
      this.importResult.set({
        importedCount: 0,
        skippedDuplicates: 0,
        errors: ['Please select a valid CSV or XLSX file containing at least one student row.']
      });
      return;
    }
    const res = this.studentsService.importStudentsBulk(rows);
    this.importResult.set(res);
  }

  // Promote / Transfer Handlers
  protected openPromoteDrawer(): void {
    this.promoteError.set('');
    this.promoteMode.set('promote');
    const firstCourse = this.courses()[0]?.name || '';
    this.promoteCourseFilterSignal.set(firstCourse);
    this.promoteForm.reset({
      courseFilter: firstCourse,
      targetSemester: 'Semester 3',
      targetSection: ''
    });
    this.selectedPromoteIds.set([]);
    this.isPromoteDrawerOpen.set(true);
  }

  protected onPromoteCourseFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.promoteCourseFilterSignal.set(val);
    this.selectedPromoteIds.set([]);
  }

  protected togglePromoteStudent(id: string): void {
    const curr = this.selectedPromoteIds();
    this.selectedPromoteIds.set(curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  }

  protected toggleSelectAllPromote(): void {
    const visible = this.promoteCandidates().map(s => s.id);
    if (visible.length > 0 && this.selectedPromoteIds().length === visible.length) {
      this.selectedPromoteIds.set([]);
    } else {
      this.selectedPromoteIds.set(visible);
    }
  }

  protected executePromoteOrTransfer(): void {
    this.promoteError.set('');
    const ids = this.selectedPromoteIds();
    const formVal = this.promoteForm.getRawValue();
    if (this.promoteMode() === 'promote') {
      const res = this.studentsService.promoteStudents(
        ids,
        formVal.targetSemester,
        formVal.targetSection || undefined
      );
      if (!res.success) {
        this.promoteError.set(res.error || 'Promotion failed.');
        return;
      }
      this.isPromoteDrawerOpen.set(false);
    } else {
      const sec = formVal.targetSection || 'Section A';
      const res = this.studentsService.transferStudentsSection(ids, sec);
      if (!res.success) {
        this.promoteError.set(res.error || 'Section transfer failed.');
        return;
      }
      this.isPromoteDrawerOpen.set(false);
    }
  }

  protected openDeleteDialog(student: Student): void {
    this.studentToDelete.set(student);
    this.isDeleteDialogOpen.set(true);
  }

  protected readonly deleteDialogMessage = computed(() => {
    const s = this.studentToDelete();
    return s ? `Are you sure you want to delete "${s.name}" (${s.enrollmentNo})? This action cannot be undone.` : '';
  });

  protected confirmDelete(): void {
    const target = this.studentToDelete();
    if (target) {
      this.studentsService.deleteStudent(target.id);
    }
    this.isDeleteDialogOpen.set(false);
    this.studentToDelete.set(null);
  }

  protected dismissToast(id: string): void {
    this.studentsService.removeToast(id);
  }

  protected exportExcel(): void {
    exportToExcel(
      this.filteredStudents().map(s => ({
        'Enrollment No': s.enrollmentNo,
        Name: s.name,
        Email: s.email,
        Phone: s.phone,
        Course: s.course,
        Department: s.department,
        Semester: s.semester,
        Section: s.section,
        Status: s.status,
        'Guardian Name': s.guardian.name,
        'Guardian Phone': s.guardian.phone
      })),
      'EduERP_Students_Directory'
    );
  }

  protected exportPdf(): void {
    exportToPdf(
      'Institutional Students Directory',
      ['Enrollment No', 'Student Name', 'Course', 'Semester', 'Section', 'Phone', 'Status'],
      this.filteredStudents().map(s => [
        s.enrollmentNo,
        s.name,
        s.course,
        s.semester,
        s.section,
        s.phone,
        s.status
      ]),
      'EduERP_Students_Directory'
    );
  }
}
