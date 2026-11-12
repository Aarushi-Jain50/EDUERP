import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CommunicationService } from '../../../services/communication.service';
import { AcademicService } from '../../../services/academic.service';
import { Notice, NoticeAudience, NoticePriority } from '../../../models/communication.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notices-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeader, StatStrip, DataToolbar, DataTable, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Notices & Announcements" subtitle="Broadcast official institutional communications to students, faculty, and parents." primaryActionLabel="Compose Notice" (primaryActionClicked)="openAdd()" />
      
      <app-stat-strip [items]="stats()" />

      <app-data-toolbar 
        [filter1Value]="selectedAudience()"
        [filter1Options]="audienceOptions"
        (filter1Change)="selectedAudience.set($event)"
        [filter2Value]="selectedPriority()"
        [filter2Options]="priorityOptions"
        (filter2Change)="selectedPriority.set($event)"
        searchPlaceholder="Search by title..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table 
        [columns]="columns" 
        [data]="filteredNotices()" 
        idKey="id" 
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)"
      />

      <!-- Form Drawer -->
      <app-form-drawer 
        [isOpen]="isDrawerOpen()" 
        [title]="drawerTitle()" 
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Notice' : 'Publish Notice')"
        (closed)="closeDrawer()" 
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          <div class="space-y-1.5">
            <label for="nt-title" class="text-xs font-semibold text-slate-800">Title <span class="text-red-500">*</span></label>
            <input id="nt-title" formControlName="title" [readonly]="isViewOnly()" placeholder="e.g. Holiday Announcement" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:bg-slate-50" />
          </div>

          <div class="space-y-1.5">
            <label for="nt-body" class="text-xs font-semibold text-slate-800">Body Content <span class="text-red-500">*</span></label>
            <textarea id="nt-body" formControlName="body" [readonly]="isViewOnly()" rows="5" placeholder="Enter detailed announcement..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] disabled:bg-slate-50 resize-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div class="space-y-1.5">
               <label for="nt-aud" class="text-xs font-semibold text-slate-800">Target Audience <span class="text-red-500">*</span></label>
               <select id="nt-aud" formControlName="audience" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                  <option value="All">All Users</option>
                  <option value="Students">Students Only</option>
                  <option value="Faculty">Faculty Only</option>
                  <option value="Parents">Parents Only</option>
                  <option value="Course-wise">Specific Course</option>
               </select>
             </div>
             <div class="space-y-1.5">
               <label for="nt-prio" class="text-xs font-semibold text-slate-800">Priority <span class="text-red-500">*</span></label>
               <select id="nt-prio" formControlName="priority" [attr.disabled]="isViewOnly() ? true : null" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
               </select>
             </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div class="space-y-1.5">
               <label for="nt-pub" class="text-xs font-semibold text-slate-800">Publish Date <span class="text-red-500">*</span></label>
               <input id="nt-pub" formControlName="publishDate" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
             </div>
             <div class="space-y-1.5">
               <label for="nt-exp" class="text-xs font-semibold text-slate-800">Expiry Date <span class="text-red-500">*</span></label>
               <input id="nt-exp" formControlName="expiryDate" [readonly]="isViewOnly()" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
             </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
             <input type="checkbox" formControlName="isPinned" id="pinned-chk" class="w-4 h-4 rounded border-slate-300 text-[#6D42E8] focus:ring-[#6D42E8]" />
             <label for="pinned-chk" class="text-xs font-semibold text-slate-700 cursor-pointer">Pin to top of bulletin board</label>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog 
        [isOpen]="isConfirmOpen()" 
        title="Delete Notice" 
        message="Are you sure you want to remove this notice? It will no longer be visible to the intended audience."
        confirmLabel="Remove Notice"
        (closed)="isConfirmOpen.set(false)" 
        (confirmed)="deleteNotice()" 
      />
    </div>
  `
})
export class NoticesPage {
  protected readonly commsService = inject(CommunicationService);
  protected readonly academicService = inject(AcademicService);

  protected readonly searchQuery = signal('');
  protected readonly selectedAudience = signal('All');
  protected readonly selectedPriority = signal('All');

  protected readonly isDrawerOpen = signal(false);
  protected readonly isViewOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly isConfirmOpen = signal(false);
  protected readonly itemToDelete = signal<string | null>(null);

  protected readonly form = new FormGroup({
    title: new FormControl('', Validators.required),
    body: new FormControl('', Validators.required),
    audience: new FormControl<NoticeAudience>('All', Validators.required),
    priority: new FormControl<NoticePriority>('Medium', Validators.required),
    publishDate: new FormControl('', Validators.required),
    expiryDate: new FormControl('', Validators.required),
    isPinned: new FormControl(false),
    courseId: new FormControl('')
  });

  protected readonly audienceOptions: FilterOption[] = [
    { label: 'Audience: All', value: 'All' },
    { label: 'Students', value: 'Students' },
    { label: 'Faculty', value: 'Faculty' },
    { label: 'Parents', value: 'Parents' }
  ];

  protected readonly priorityOptions: FilterOption[] = [
    { label: 'Priority: All', value: 'All' },
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
    { label: 'Urgent', value: 'Urgent' }
  ];

  protected readonly columns: TableColumn[] = [
    { key: 'title', header: 'Notice Title', isBold: true },
    { key: 'audience', header: 'Audience' },
    { key: 'priority', header: 'Priority', isBadge: true },
    { key: 'publishDate', header: 'Published' },
    { key: 'status', header: 'Status', isBadge: true }
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.commsService.notices();
    const published = list.filter(n => n.status === 'Published').length;
    const urgent = list.filter(n => n.priority === 'Urgent').length;
    return [
      { label: 'Live Notices', value: published, icon: 'campaign', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Drafts', value: list.filter(n => n.status === 'Draft').length, icon: 'edit_note', iconColorClass: 'text-slate-600', iconBgClass: 'bg-slate-50 border-slate-100' },
      { label: 'Urgent Alerts', value: urgent, icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' }
    ];
  });

  protected readonly filteredNotices = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const aud = this.selectedAudience();
    const prio = this.selectedPriority();
    
    return this.commsService.notices().filter(n => {
      if (aud !== 'All' && n.audience !== aud) return false;
      if (prio !== 'All' && n.priority !== prio) return false;
      if (q && !n.title.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  openAdd() {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.form.reset({
      audience: 'All',
      priority: 'Medium',
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 604800000).toISOString().split('T')[0] // +1 week
    });
    this.isDrawerOpen.set(true);
  }

  openEdit(n: Notice) {
    this.isViewOnly.set(false);
    this.editingId.set(n.id);
    this.form.patchValue(n);
    this.isDrawerOpen.set(true);
  }

  openView(n: Notice) {
    this.openEdit(n);
    this.isViewOnly.set(true);
  }

  openDelete(n: Notice) {
    this.itemToDelete.set(n.id);
    this.isConfirmOpen.set(true);
  }

  deleteNotice() {
    if (this.itemToDelete()) {
      this.commsService.deleteNotice(this.itemToDelete()!);
      this.isConfirmOpen.set(false);
    }
  }

  closeDrawer() { this.isDrawerOpen.set(false); }

  handleSave() {
    if (this.isViewOnly()) { this.closeDrawer(); return; }
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    this.commsService.saveNotice({
      title: val.title!,
      body: val.body!,
      audience: val.audience!,
      priority: val.priority!,
      publishDate: val.publishDate!,
      expiryDate: val.expiryDate!,
      isPinned: val.isPinned || false,
      createdBy: 'Administrator',
      courseId: val.courseId || undefined
    }, this.editingId() || undefined);
    
    this.closeDrawer();
  }

  drawerTitle() { return this.isViewOnly() ? 'Notice View' : (this.editingId() ? 'Edit Notice' : 'Compose Notice'); }
  drawerSubtitle() { return 'Official announcements for the institution bulletin.'; }
}
