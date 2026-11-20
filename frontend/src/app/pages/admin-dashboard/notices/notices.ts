import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { CommunicationService } from '../../../services/communication.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentsService } from '../../../services/students.service';
import { Notice, NoticeAudience, NoticePriority, NoticeStatus } from '../../../models/communication.model';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notices-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    DataToolbar,
    DataTable,
    FormDrawer,
    ConfirmDialog,
  ],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Notices & Announcements"
        subtitle="Publish official institutional circulars, schedule notices by role or course, and monitor bulletin visibility."
        actionLabel="Compose Notice"
        actionIcon="campaign"
        (actionClicked)="openAdd()"
      />

      <div class="flex justify-end gap-2 -mt-2">
        <button
          type="button"
          (click)="exportExcel()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-emerald-600">table_view</mat-icon>
          Excel
        </button>
        <button
          type="button"
          (click)="exportPdf()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-rose-600">picture_as_pdf</mat-icon>
          PDF
        </button>
      </div>

      <app-stat-strip [items]="stats()" />

      <app-data-toolbar
        [filter1Value]="selectedAudience()"
        [filter1Options]="audienceOptions"
        (filter1Change)="selectedAudience.set($event)"
        [filter2Value]="selectedPriority()"
        [filter2Options]="priorityOptions"
        (filter2Change)="selectedPriority.set($event)"
        searchPlaceholder="Search by notice title or circular code..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table
        [columns]="columns"
        [data]="filteredNotices()"
        idKey="id"
        [customActions]="customActions"
        (viewClicked)="openView($event)"
        (editClicked)="openEdit($event)"
        (deleteClicked)="openDelete($event)"
        (customActionClicked)="handleCustomAction($event)"
      />

      <!-- Form Drawer -->
      <app-form-drawer
        [isOpen]="isDrawerOpen()"
        [title]="drawerTitle()"
        [subtitle]="drawerSubtitle()"
        [saveLabel]="isViewOnly() ? 'Close' : (editingId() ? 'Update Notice' : 'Save Notice')"
        (closed)="closeDrawer()"
        (saved)="handleSave()"
      >
        <form [formGroup]="form" class="space-y-4 pt-2">
          <div class="space-y-1.5">
            <label for="nt-title" class="text-xs font-semibold text-slate-800">Title <span class="text-red-500">*</span></label>
            <input id="nt-title" formControlName="title" placeholder="e.g. End-Term Exam Schedule Circular" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          <div class="space-y-1.5">
            <label for="nt-body" class="text-xs font-semibold text-slate-800">Circular Content <span class="text-red-500">*</span></label>
            <textarea id="nt-body" formControlName="body" rows="5" placeholder="Enter detailed institutional notice..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="nt-aud" class="text-xs font-semibold text-slate-800">Target Audience <span class="text-red-500">*</span></label>
              <select id="nt-aud" formControlName="audience" (change)="audienceSignal.set(form.controls.audience.value || 'All')" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="All">All Users</option>
                <option value="Students">Students Only</option>
                <option value="Faculty">Faculty Only</option>
                <option value="Parents">Parents Only</option>
                <option value="Course-wise">Specific Course</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="nt-prio" class="text-xs font-semibold text-slate-800">Priority <span class="text-red-500">*</span></label>
              <select id="nt-prio" formControlName="priority" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          @if (audienceSignal() === 'Course-wise') {
            <div class="space-y-1.5">
              <label for="nt-course" class="text-xs font-semibold text-slate-800">Target Program / Course</label>
              <select id="nt-course" formControlName="courseId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="">Select Course</option>
                @for (c of academicService.courses(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
          }

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="nt-pub" class="text-xs font-semibold text-slate-800">Publish Date <span class="text-red-500">*</span></label>
              <input id="nt-pub" formControlName="publishDate" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
            <div class="space-y-1.5">
              <label for="nt-exp" class="text-xs font-semibold text-slate-800">Expiry Date <span class="text-red-500">*</span></label>
              <input id="nt-exp" formControlName="expiryDate" type="date" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="nt-status" class="text-xs font-semibold text-slate-800">Publishing Mode</label>
              <select id="nt-status" formControlName="status" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Published">Publish Immediately</option>
                <option value="Draft">Save as Draft</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="nt-ref" class="text-xs font-semibold text-slate-800">Circular / Attachment Ref</label>
              <input id="nt-ref" formControlName="attachmentRef" placeholder="e.g. CIR-2026-11.pdf" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
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
        message="Are you sure you want to remove this notice? It will no longer be visible to students, faculty, or parents."
        confirmLabel="Remove Notice"
        (cancelled)="isConfirmOpen.set(false)"
        (confirmed)="deleteNotice()"
      />
    </div>
  `,
})
export class NoticesPage {
  protected readonly commsService = inject(CommunicationService);
  protected readonly academicService = inject(AcademicService);
  private readonly studentsService = inject(StudentsService);

  protected readonly searchQuery = signal('');
  protected readonly selectedAudience = signal('All');
  protected readonly selectedPriority = signal('All');
  protected readonly audienceSignal = signal<NoticeAudience>('All');

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
    status: new FormControl<NoticeStatus>('Published', Validators.required),
    attachmentRef: new FormControl(''),
    isPinned: new FormControl(false),
    courseId: new FormControl(''),
  });

  protected readonly audienceOptions: FilterOption[] = [
    { label: 'Audience: All', value: 'All' },
    { label: 'Students', value: 'Students' },
    { label: 'Faculty', value: 'Faculty' },
    { label: 'Parents', value: 'Parents' },
    { label: 'Course-wise', value: 'Course-wise' },
  ];

  protected readonly priorityOptions: FilterOption[] = [
    { label: 'Priority: All', value: 'All' },
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
    { label: 'Urgent', value: 'Urgent' },
  ];

  protected readonly customActions: TableCustomAction[] = [
    { id: 'pin', label: 'Toggle Pin', icon: 'push_pin' },
  ];

  protected readonly columns: TableColumn[] = [
    { key: 'titleDisplay', header: 'Notice Title', isBold: true },
    { key: 'audience', header: 'Audience' },
    { key: 'priority', header: 'Priority', isBadge: true },
    { key: 'publishDate', header: 'Publish Date' },
    { key: 'readCount', header: 'Reads', align: 'center' },
    { key: 'status', header: 'Status', isBadge: true },
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.commsService.notices();
    const published = list.filter(n => n.status === 'Published').length;
    const pinned = list.filter(n => n.isPinned).length;
    const urgent = list.filter(n => n.priority === 'Urgent').length;
    return [
      { label: 'Live Notices', value: published, icon: 'campaign', iconColorClass: 'text-[#6D42E8]', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Pinned Bulletins', value: pinned, icon: 'push_pin', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'Drafts / Scheduled', value: list.filter(n => n.status === 'Draft' || n.status === 'Scheduled').length, icon: 'edit_note', iconColorClass: 'text-slate-600', iconBgClass: 'bg-slate-50 border-slate-100' },
      { label: 'Urgent Alerts', value: urgent, icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
    ];
  });

  protected readonly filteredNotices = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const aud = this.selectedAudience();
    const prio = this.selectedPriority();

    return this.commsService
      .notices()
      .filter(n => {
        if (aud !== 'All' && n.audience !== aud) return false;
        if (prio !== 'All' && n.priority !== prio) return false;
        if (q && !n.title.toLowerCase().includes(q) && !(n.attachmentRef || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .map(n => ({
        ...n,
        titleDisplay: n.isPinned ? `📌 ${n.title}` : n.title,
        readCount: n.readCount ?? 0,
      }));
  });

  handleCustomAction(event: { actionId: string; row: unknown }) {
    const item = event.row as Notice;
    if (event.actionId === 'pin') {
      this.commsService.toggleNoticePin(item.id);
      this.studentsService.showToast('info', item.isPinned ? 'Notice unpinned.' : 'Notice pinned to top.');
    }
  }

  openAdd() {
    this.isViewOnly.set(false);
    this.editingId.set(null);
    this.form.enable();
    this.audienceSignal.set('All');
    this.form.reset({
      audience: 'All',
      priority: 'Medium',
      status: 'Published',
      isPinned: false,
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 604800000).toISOString().split('T')[0],
    });
    this.isDrawerOpen.set(true);
  }

  openEdit(n: Notice) {
    this.isViewOnly.set(false);
    this.editingId.set(n.id);
    this.form.enable();
    this.audienceSignal.set(n.audience);
    this.form.patchValue({
      title: n.title,
      body: n.body,
      audience: n.audience,
      priority: n.priority,
      publishDate: n.publishDate,
      expiryDate: n.expiryDate,
      status: n.status === 'Draft' ? 'Draft' : 'Published',
      attachmentRef: n.attachmentRef || '',
      isPinned: n.isPinned,
      courseId: n.courseId || '',
    });
    this.isDrawerOpen.set(true);
  }

  openView(n: Notice) {
    this.openEdit(n);
    this.isViewOnly.set(true);
    this.form.disable();
  }

  openDelete(n: Notice) {
    this.itemToDelete.set(n.id);
    this.isConfirmOpen.set(true);
  }

  deleteNotice() {
    if (this.itemToDelete()) {
      this.commsService.deleteNotice(this.itemToDelete()!);
      this.studentsService.showToast('info', 'Notice removed from bulletin board.');
      this.isConfirmOpen.set(false);
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  handleSave() {
    if (this.isViewOnly()) {
      this.closeDrawer();
      return;
    }
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    this.commsService.saveNotice(
      {
        title: val.title!,
        body: val.body!,
        audience: val.audience!,
        priority: val.priority!,
        publishDate: val.publishDate!,
        expiryDate: val.expiryDate!,
        status: val.status || 'Published',
        attachmentRef: val.attachmentRef || undefined,
        isPinned: Boolean(val.isPinned),
        createdBy: 'Administrator',
        courseId: val.audience === 'Course-wise' ? val.courseId || undefined : undefined,
      },
      this.editingId() || undefined
    );

    this.studentsService.showToast('success', 'Notice saved & synced with Firestore.');
    this.closeDrawer();
  }

  exportExcel() {
    exportToExcel(
      this.filteredNotices().map(n => ({
        Title: n.title,
        Audience: n.audience,
        Priority: n.priority,
        PublishDate: n.publishDate,
        ExpiryDate: n.expiryDate,
        Pinned: n.isPinned ? 'Yes' : 'No',
        Status: n.status,
      })),
      'Institutional_Notices'
    );
  }

  exportPdf() {
    exportToPdf(
      'Official Notices & Circulars Bulletin',
      ['Title', 'Audience', 'Priority', 'Published', 'Expires', 'Status'],
      this.filteredNotices().map(n => [
        n.title,
        n.audience,
        n.priority,
        n.publishDate,
        n.expiryDate,
        n.status,
      ]),
      'Institutional_Notices'
    );
  }

  drawerTitle() {
    return this.isViewOnly() ? 'Notice Details' : this.editingId() ? 'Edit Notice' : 'Compose Notice';
  }

  drawerSubtitle() {
    return 'Official announcements for the institution bulletin.';
  }
}
