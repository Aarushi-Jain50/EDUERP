import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { AssignmentsService, Assignment, AssignmentStatus } from '../../../services/assignments.service';
import { AcademicService } from '../../../services/academic.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-assignments-page',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeader, StatStrip, DataToolbar, DataTable, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Assignments" subtitle="Manage student homework, lab tasks, and project submissions." primaryActionLabel="Add Assignment" (primaryActionClicked)="openAdd()" />
      
      <app-stat-strip [items]="stats()" />

      <app-data-toolbar 
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
        [filter1Value]="selectedSubject()"
        [filter1Options]="subjectOptions()"
        (filter1Change)="selectedSubject.set($event)"
        searchPlaceholder="Search by assignment title..."
      />

      <app-data-table 
        [columns]="columns" 
        [data]="filteredAssignments()" 
        idKey="id" 
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)" 
      />
      
      <app-form-drawer 
        [isOpen]="isDrawerOpen()" 
        [title]="drawerTitle()" 
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Assignment' : 'Create Assignment')"
        (closed)="closeDrawer()" 
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          @if (formError()) {
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span class="material-icons text-base text-red-600 shrink-0">error_outline</span>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="as-title" class="text-xs font-semibold text-slate-800">Title <span class="text-red-500">*</span></label>
            <input id="as-title" formControlName="title" [readonly]="isViewOnly()" placeholder="e.g. Lab 1: Binary Search Trees" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:bg-slate-50" />
          </div>

          <div class="space-y-1.5">
            <label for="as-desc" class="text-xs font-semibold text-slate-800">Description</label>
            <textarea id="as-desc" formControlName="description" [readonly]="isViewOnly()" rows="3" placeholder="Provide detailed instructions..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:bg-slate-50 resize-none"></textarea>
          </div>

          <div class="space-y-1.5">
            <label for="as-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
            <select id="as-subject" formControlName="subjectId" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="">Select Subject</option>
              @for (sub of academicService.subjects(); track sub.id) {
                <option [value]="sub.id">{{ sub.name }} ({{ sub.code }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="as-section" class="text-xs font-semibold text-slate-800">Section <span class="text-red-500">*</span></label>
              <select id="as-section" formControlName="sectionId" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Section</option>
                @for (s of academicService.sections(); track s.id) {
                  <option [value]="s.id">{{ s.section }}</option>
                }
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="as-max" class="text-xs font-semibold text-slate-800">Max Marks</label>
              <input id="as-max" formControlName="maxMarks" [readonly]="isViewOnly()" type="number" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="as-due" class="text-xs font-semibold text-slate-800">Due Date <span class="text-red-500">*</span></label>
              <input id="as-due" formControlName="dueDate" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="as-status" class="text-xs font-semibold text-slate-800">Status</label>
              <select id="as-status" formControlName="status" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog 
        [isOpen]="isConfirmOpen()" 
        title="Delete Assignment" 
        [message]="deleteMessage()"
        confirmLabel="Delete Forever"
        (closed)="isConfirmOpen.set(false)" 
        (confirmed)="deleteAssignment()" 
      />
    </div>
  `
})
export class AssignmentsPage {
  protected readonly assignmentService = inject(AssignmentsService);
  protected readonly academicService = inject(AcademicService);

  protected readonly isDrawerOpen = signal(false);
  protected readonly isViewOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal('');
  
  protected readonly isConfirmOpen = signal(false);
  protected readonly itemToDelete = signal<Assignment | null>(null);

  protected readonly searchQuery = signal('');
  protected readonly selectedSubject = signal('All');

  protected readonly form = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
    subjectId: new FormControl('', Validators.required),
    sectionId: new FormControl('', Validators.required),
    dueDate: new FormControl('', Validators.required),
    maxMarks: new FormControl(10, [Validators.required, Validators.min(0)]),
    status: new FormControl<AssignmentStatus>('Active', Validators.required)
  });

  protected readonly filteredAssignments = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const sub = this.selectedSubject();
    
    return this.assignmentService.assignments().filter(a => {
      if (sub !== 'All' && a.subjectId !== sub) return false;
      if (q && !a.title.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.assignmentService.assignments();
    const active = list.filter(a => a.status === 'Active').length;
    const overdue = list.filter(a => a.status === 'Overdue').length;
    return [
      { label: 'Active', value: active, icon: 'assignment', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Overdue', value: overdue, icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
      { label: 'Closed', value: list.length - active - overdue, icon: 'check_circle', iconColorClass: 'text-emerald-600', iconBgClass: 'bg-emerald-50 border-emerald-100' }
    ];
  });

  protected readonly subjectOptions = computed<FilterOption[]>(() => [
    { label: 'Subject: All', value: 'All' },
    ...this.academicService.subjects().map(s => ({ label: s.name, value: s.id }))
  ]);

  protected readonly columns: TableColumn[] = [
    { key: 'title', header: 'Assignment', isBold: true },
    { key: 'subjectName', header: 'Subject' },
    { key: 'sectionName', header: 'Section' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  openAdd() {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      maxMarks: 10,
      status: 'Active'
    });
    this.isDrawerOpen.set(true);
  }

  openView(a: Assignment) {
    this.isViewOnly.set(true);
    this.editingId.set(a.id);
    this.formError.set('');
    this.form.patchValue(a);
    this.isDrawerOpen.set(true);
  }

  openEdit(a: Assignment) {
    this.isViewOnly.set(false);
    this.editingId.set(a.id);
    this.formError.set('');
    this.form.patchValue(a);
    this.isDrawerOpen.set(true);
  }

  openDelete(a: Assignment) {
    this.itemToDelete.set(a);
    this.isConfirmOpen.set(true);
  }

  deleteMessage() {
    return `Are you sure you want to delete the assignment "${this.itemToDelete()?.title}"? All student submissions will also be removed.`;
  }

  deleteAssignment() {
    if (this.itemToDelete()) {
      this.assignmentService.delete(this.itemToDelete()!.id);
      this.isConfirmOpen.set(false);
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formError.set('');
  }

  drawerTitle() {
    if (this.isViewOnly()) return 'Assignment Details';
    return this.editingId() ? 'Edit Assignment' : 'Create New Assignment';
  }

  drawerSubtitle() {
    if (this.isViewOnly()) return 'View assignment instructions and deadlines.';
    return 'Set instructions, due date, and marks for students.';
  }

  handleSave() {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }

    if (this.form.invalid) {
      this.formError.set('Please fill all required fields.');
      return;
    }

    const val = this.form.getRawValue();
    const subject = this.academicService.subjects().find(s => s.id === val.subjectId);
    const section = this.academicService.sections().find(s => s.id === val.sectionId);

    const data: Omit<Assignment, 'id'> = {
      title: val.title!,
      description: val.description || '',
      subjectId: val.subjectId!,
      subjectName: subject?.name || '',
      sectionId: val.sectionId!,
      sectionName: section?.section || '',
      assignedOn: new Date().toISOString().split('T')[0],
      dueDate: val.dueDate!,
      maxMarks: val.maxMarks!,
      status: val.status!
    };

    if (this.editingId()) {
      this.assignmentService.update(this.editingId()!, data);
    } else {
      this.assignmentService.add(data);
    }
    this.closeDrawer();
  }
}
