import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { Student } from '../../../models/student.model';

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
    <div class="flex flex-col gap-5 max-w-[1400px] mx-auto w-full font-sans">
      
      <!-- 1. Page Header -->
      <app-page-header
        title="Students Directory"
        subtitle="Manage enrolled student profiles, academic allocations, and guardian records."
        primaryActionLabel="Add Student"
        primaryActionIcon="person_add"
        (primaryActionClicked)="openAddDrawer()"
      />

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
        (searchChange)="searchQuery.set($event)"
        (filter1Change)="courseFilter.set($event)"
        (filter2Change)="statusFilter.set($event)"
      />

      <!-- 4. Data Table Card -->
      <app-data-table
        [columns]="columns"
        [data]="filteredStudents()"
        idKey="id"
        emptyIcon="school"
        emptyTitle="No students found"
        emptyMessage="Try adjusting your search criteria or course filters."
        emptyActionLabel="Add New Student"
        (emptyActionClicked)="openAddDrawer()"
        (viewClicked)="openViewDrawer($event)"
        (editClicked)="openEditDrawer($event)"
        (deleteClicked)="openDeleteDialog($event)"
      />

      <!-- 5. Add / Edit Form Drawer (560px Wide) -->
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
          
          <!-- SECTION 1: PERSONAL INFORMATION -->
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
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
              @if (studentForm.controls.name.touched && studentForm.controls.name.invalid) {
                <p class="text-[11px] text-red-500 mt-1">Full name is required.</p>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-gender" class="block font-semibold text-slate-700 mb-1">
                  Gender <span class="text-red-500">*</span>
                </label>
                <select
                  id="student-gender"
                  formControlName="gender"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label for="student-dob" class="block font-semibold text-slate-700 mb-1">
                  Date of Birth <span class="text-red-500">*</span>
                </label>
                <input
                  id="student-dob"
                  type="date"
                  formControlName="dob"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-email" class="block font-semibold text-slate-700 mb-1">
                  Email Address <span class="text-red-500">*</span>
                </label>
                <input
                  id="student-email"
                  type="email"
                  formControlName="email"
                  placeholder="e.g. rahul.verma@eduerp.edu"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
                @if (studentForm.controls.email.touched && studentForm.controls.email.invalid) {
                  <p class="text-[11px] text-red-500 mt-1">Please enter a valid email address.</p>
                }
              </div>

              <div>
                <label for="student-phone" class="block font-semibold text-slate-700 mb-1">
                  Mobile Number (10 Digits) <span class="text-red-500">*</span>
                </label>
                <input
                  id="student-phone"
                  type="tel"
                  maxLength="10"
                  formControlName="phone"
                  placeholder="e.g. 9876543210"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
                @if (studentForm.controls.phone.touched && studentForm.controls.phone.invalid) {
                  <p class="text-[11px] text-red-500 mt-1">Must be a 10-digit numeric phone number.</p>
                }
              </div>
            </div>

            <div>
              <label for="student-address" class="block font-semibold text-slate-700 mb-1">
                Permanent Residential Address <span class="text-red-500">*</span>
              </label>
              <textarea
                id="student-address"
                rows="2"
                formControlName="address"
                placeholder="Full residential street, area, city and state address"
                class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              ></textarea>
            </div>
          </div>

          <!-- SECTION 2: ACADEMIC DETAILS -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 pb-1.5 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">school</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Academic Allocation</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="student-enrollment" class="block font-semibold text-slate-700 mb-1">
                  Enrollment No <span class="text-red-500">*</span>
                </label>
                <input
                  id="student-enrollment"
                  type="text"
                  formControlName="enrollmentNo"
                  placeholder="e.g. MCA-2025-043"
                  class="w-full h-10 px-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-mono font-semibold focus:outline-none focus:border-[#6D42E8]"
                />
              </div>

              <div>
                <label for="student-status" class="block font-semibold text-slate-700 mb-1">
                  Enrollment Status <span class="text-red-500">*</span>
                </label>
                <select
                  id="student-status"
                  formControlName="status"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Passed Out">Passed Out</option>
                </select>
              </div>
            </div>

            <div>
              <label for="student-course" class="block font-semibold text-slate-700 mb-1">
                Course / Degree Program <span class="text-red-500">*</span>
              </label>
              <select
                id="student-course"
                formControlName="course"
                (change)="onCourseSelected($event)"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              >
                <option value="">-- Select Course --</option>
                @for (c of courses(); track c.id) {
                  <option [value]="c.name">{{ c.name }} ({{ c.code }})</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label for="student-semester" class="block font-semibold text-slate-700 mb-1">
                  Semester <span class="text-red-500">*</span>
                </label>
                <select
                  id="student-semester"
                  formControlName="semester"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
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
                <label for="student-section" class="block font-semibold text-slate-700 mb-1">
                  Section <span class="text-red-500">*</span>
                </label>
                <select
                  id="student-section"
                  formControlName="section"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                </select>
              </div>

              <div>
                <label for="student-admdate" class="block font-semibold text-slate-700 mb-1">
                  Admission Date <span class="text-red-500">*</span>
                </label>
                <input
                  id="student-admdate"
                  type="date"
                  formControlName="admissionDate"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 3: GUARDIAN DETAILS -->
          <div class="space-y-3 pt-2" formGroupName="guardian">
            <div class="flex items-center gap-2 pb-1.5 border-b border-[#E2E8F0]">
              <span class="material-icons text-sm text-[#6D42E8]">family_restroom</span>
              <h3 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">3. Guardian & Emergency Contact</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="guardian-name" class="block font-semibold text-slate-700 mb-1">
                  Guardian Name <span class="text-red-500">*</span>
                </label>
                <input
                  id="guardian-name"
                  type="text"
                  formControlName="name"
                  placeholder="e.g. Sanjay Verma"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                />
              </div>

              <div>
                <label for="guardian-relation" class="block font-semibold text-slate-700 mb-1">
                  Relation <span class="text-red-500">*</span>
                </label>
                <select
                  id="guardian-relation"
                  formControlName="relation"
                  class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>

            <div>
              <label for="guardian-phone" class="block font-semibold text-slate-700 mb-1">
                Guardian Phone (10 Digits) <span class="text-red-500">*</span>
              </label>
              <input
                id="guardian-phone"
                type="tel"
                maxLength="10"
                formControlName="phone"
                placeholder="e.g. 9811223344"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#6D42E8] focus:ring-1 focus:ring-[#6D42E8]"
              />
            </div>
          </div>

        </form>
      </app-form-drawer>

      <!-- 6. View Profile Drawer (Read-Only) -->
      @if (viewingStudent(); as student) {
        <app-form-drawer
          [isOpen]="true"
          title="Student Profile"
          subtitle="Read-only view of enrolled student record."
          widthClass="max-w-[560px]"
          [showSaveButton]="false"
          (closed)="viewingStudent.set(null)"
        >
          <div class="space-y-4">
            
            <!-- Student Profile Hero Card -->
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

            <!-- 1. Personal Information Card -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-slate-900 text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">person</span> Personal Details
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-slate-500 block text-[11px]">Gender</span>
                  <span class="font-semibold text-slate-800">{{ student.gender }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Date of Birth</span>
                  <span class="font-semibold text-slate-800">{{ student.dob }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Email Address</span>
                  <span class="font-semibold text-slate-800 truncate block">{{ student.email }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Phone Number</span>
                  <span class="font-semibold text-slate-800">{{ student.phone }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-500 block text-[11px]">Residential Address</span>
                  <span class="font-semibold text-slate-800">{{ student.address }}</span>
                </div>
              </div>
            </div>

            <!-- 2. Academic Details Card -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-slate-900 text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">school</span> Academic Details
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-slate-500 block text-[11px]">Department</span>
                  <span class="font-semibold text-slate-800">{{ student.department }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Enrollment Number</span>
                  <span class="font-semibold font-mono text-slate-800">{{ student.enrollmentNo }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Semester & Section</span>
                  <span class="font-semibold text-slate-800">{{ student.semester }} ({{ student.section }})</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Admission Date</span>
                  <span class="font-semibold text-slate-800">{{ student.admissionDate }}</span>
                </div>
              </div>
            </div>

            <!-- 3. Guardian Information Card -->
            <div class="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div class="font-bold text-slate-900 text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <span class="material-icons text-sm">family_restroom</span> Guardian & Emergency Contact
              </div>
              <div class="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span class="text-slate-500 block text-[11px]">Guardian Name</span>
                  <span class="font-semibold text-slate-800">{{ student.guardian.name }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Relation</span>
                  <span class="font-semibold text-slate-800">{{ student.guardian.relation }}</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Contact Phone</span>
                  <span class="font-semibold text-slate-800">{{ student.guardian.phone }}</span>
                </div>
              </div>
            </div>

          </div>
        </app-form-drawer>
      }

      <!-- 7. Confirm Delete Dialog -->
      <app-confirm-dialog
        [isOpen]="isDeleteDialogOpen()"
        title="Delete Student Record"
        [message]="deleteDialogMessage()"
        confirmLabel="Delete Student"
        (closed)="isDeleteDialogOpen.set(false)"
        (confirmed)="confirmDelete()"
      />

    </div>
  `
})
export class StudentsPage {
  private readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  // Filters & State Signals
  protected readonly searchQuery = signal<string>('');
  protected readonly courseFilter = signal<string>('');
  protected readonly statusFilter = signal<string>('');

  protected readonly isFormDrawerOpen = signal<boolean>(false);
  protected readonly editingStudentId = signal<string | null>(null);
  protected readonly viewingStudent = signal<Student | null>(null);

  protected readonly isDeleteDialogOpen = signal<boolean>(false);
  protected readonly studentToDelete = signal<Student | null>(null);
  protected readonly formErrorMessage = signal<string | null>(null);

  // Courses list from Academic Service
  protected readonly courses = computed(() => this.academicService.courses());

  // Table Columns
  protected readonly columns: TableColumn[] = [
    { key: 'name', header: 'Student', isAvatarCell: true, avatarInitialsKey: 'initials', subtextKey: 'email' },
    { key: 'enrollmentNo', header: 'Enrollment No', isMono: true, isBold: true },
    { key: 'course', header: 'Course' },
    { key: 'semester', header: 'Semester' },
    { key: 'section', header: 'Section' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  // Stat Strip Computing
  protected readonly stats = computed<StatItem[]>(() => {
    const s = this.studentsService.studentStats();
    return [
      { label: 'Total Enrolled Students', value: s.total, helperText: 'Across all departments', icon: 'school', colorClass: 'text-[#6D42E8] bg-purple-50' },
      { label: 'Active Students', value: s.active, helperText: 'Currently attending classes', icon: 'check_circle', colorClass: 'text-emerald-600 bg-emerald-50' },
      { label: 'New Admissions', value: s.newThisYear, helperText: 'Enrolled in 2025-26 session', icon: 'person_add', colorClass: 'text-[#D946EF] bg-pink-50' }
    ];
  });

  // Dynamic Course Options for Toolbar
  protected readonly courseFilterOptions = computed<FilterOption[]>(() => {
    const options: FilterOption[] = [{ label: 'All Courses', value: '' }];
    this.courses().forEach(c => {
      options.push({ label: c.name, value: c.name });
    });
    return options;
  });

  // Status Filter Options for Toolbar
  protected readonly statusFilterOptions: FilterOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Passed Out', value: 'Passed Out' }
  ];

  // Filtered Students List
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

  // Reactive Form Definition with full validations
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
    semester: new FormControl('Semester 1', { nonNullable: true, validators: [Validators.required] }),
    section: new FormControl('Section A', { nonNullable: true, validators: [Validators.required] }),
    admissionDate: new FormControl(new Date().toISOString().split('T')[0], { nonNullable: true, validators: [Validators.required] }),

    guardian: new FormGroup({
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      relation: new FormControl('Father', { nonNullable: true, validators: [Validators.required] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] })
    })
  });

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
      semester: 'Semester 1',
      section: 'Section A',
      admissionDate: new Date().toISOString().split('T')[0],
      guardian: {
        name: '',
        relation: 'Father',
        phone: ''
      }
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
    // Resolve departmentId and courseId
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
}
