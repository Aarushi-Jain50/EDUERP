import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import {
  NotificationPriority,
  NotificationService,
  NotificationType,
} from '../../../services/notification.service';
import { StudentsService } from '../../../services/students.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notifications-page',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PageHeader, FormDrawer, ConfirmDialog],
  template: `
    <div class="flex flex-col gap-6 max-w-[1100px] mx-auto w-full font-sans">
      <app-page-header
        title="Notifications & Alert Broadcasts"
        subtitle="Review institutional alerts across fees, academics, and operations, or push real-time broadcasts."
        actionLabel="Broadcast Alert"
        actionIcon="notifications_active"
        (actionClicked)="openBroadcast()"
      />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Filter Tabs -->
        <div class="flex gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar whitespace-nowrap flex-1">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="activeTab.set(tab.id)"
              [class]="activeTab() === tab.id ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-800'"
              class="px-4 py-3 text-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {{ tab.label }}
              @if (getCount(tab.id); as count) {
                <span class="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{{ count }}</span>
              }
            </button>
          }
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="markAllRead()"
            class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <mat-icon class="!text-sm !w-4 !h-4 text-emerald-600">done_all</mat-icon>
            Mark All Read
          </button>
          @if (notificationService.notifications().length > 0) {
            <button
              type="button"
              (click)="isClearConfirmOpen.set(true)"
              class="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="!text-sm !w-4 !h-4">delete_sweep</mat-icon>
              Clear All
            </button>
          }
        </div>
      </div>

      <!-- Notifications List -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden divide-y divide-slate-100">
        @for (n of filteredNotifications(); track n.id) {
          <div
            class="p-4 flex items-start gap-4 hover:bg-slate-50/70 transition-colors group"
            [class.bg-purple-50/30]="!n.isRead"
          >
            <div [class]="getIconBg(n.type)" class="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0">
              <mat-icon class="!text-xl !w-5 !h-5" [class]="getIconColor(n.type)">{{ n.icon || 'notifications' }}</mat-icon>
            </div>
            <button
              type="button"
              (click)="markAndRoute(n)"
              class="flex-1 min-w-0 text-left cursor-pointer"
            >
              <div class="flex justify-between items-start gap-4">
                <h4 class="text-sm font-bold text-slate-900 group-hover:text-[#6D42E8] transition-colors truncate">{{ n.title }}</h4>
                <span class="text-[10px] font-bold text-slate-400 uppercase shrink-0">{{ getRelativeTime(n.timestamp) }}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ n.description }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span [class]="getPriorityClass(n.priority)" class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">{{ n.priority }}</span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ n.type }}</span>
                @if (n.targetRole) {
                  <span class="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Audience: {{ n.targetRole }}</span>
                }
              </div>
            </button>
            <div class="flex items-center gap-2 shrink-0">
              @if (!n.isRead) {
                <div class="w-2 h-2 rounded-full bg-[#D946EF]"></div>
              }
              <button
                type="button"
                (click)="deleteSingle(n.id)"
                title="Remove notification"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <mat-icon class="!text-base !w-4 !h-4">close</mat-icon>
              </button>
            </div>
          </div>
        } @empty {
          <div class="p-20 text-center text-slate-400">
            <mat-icon class="!text-5xl !w-12 !h-12 block mx-auto mb-2 opacity-20">notifications_off</mat-icon>
            <h3 class="text-lg font-bold text-slate-800">No Notifications</h3>
            <p class="text-sm mt-1">You're all caught up! Institutional alerts will appear here.</p>
          </div>
        }
      </div>

      <!-- Broadcast Alert Drawer -->
      <app-form-drawer
        [isOpen]="isBroadcastOpen()"
        title="Broadcast Real-Time Alert"
        subtitle="Dispatch immediate notifications across institutional portals."
        saveLabel="Send Broadcast"
        (closed)="isBroadcastOpen.set(false)"
        (saved)="sendBroadcast()"
      >
        <form [formGroup]="broadcastForm" class="space-y-4 pt-2">
          <div class="space-y-1.5">
            <label for="nf-title" class="text-xs font-semibold text-slate-800">Alert Headline <span class="text-red-500">*</span></label>
            <input id="nf-title" formControlName="title" placeholder="e.g. Semester Fee Deadline Extension" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
          </div>

          <div class="space-y-1.5">
            <label for="nf-desc" class="text-xs font-semibold text-slate-800">Alert Message <span class="text-red-500">*</span></label>
            <textarea id="nf-desc" formControlName="description" rows="4" placeholder="Enter actionable details..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="nf-type" class="text-xs font-semibold text-slate-800">Category</label>
              <select id="nf-type" formControlName="type" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Academic">Academic</option>
                <option value="Fees">Fees & Finance</option>
                <option value="Notices">Notices</option>
                <option value="System">System</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="nf-prio" class="text-xs font-semibold text-slate-800">Priority</label>
              <select id="nf-prio" formControlName="priority" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="nf-role" class="text-xs font-semibold text-slate-800">Target Portal</label>
            <select id="nf-role" formControlName="targetRole" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
              <option value="all">All Portals</option>
              <option value="student">Student Portal</option>
              <option value="faculty">Faculty Portal</option>
              <option value="parent">Parent Portal</option>
              <option value="admin">Admin Office</option>
            </select>
          </div>
        </form>
      </app-form-drawer>

      <app-confirm-dialog
        [isOpen]="isClearConfirmOpen()"
        title="Clear All Notifications"
        message="This will remove all notification items from the institutional feed. Do you want to continue?"
        confirmLabel="Clear All"
        (cancelled)="isClearConfirmOpen.set(false)"
        (confirmed)="clearAll()"
      />
    </div>
  `,
})
export class NotificationsPage {
  protected readonly notificationService = inject(NotificationService);
  private readonly studentsService = inject(StudentsService);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<string>('All');
  protected readonly isBroadcastOpen = signal(false);
  protected readonly isClearConfirmOpen = signal(false);

  protected readonly broadcastForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    type: new FormControl<NotificationType>('Academic', { nonNullable: true }),
    priority: new FormControl<NotificationPriority>('High', { nonNullable: true }),
    targetRole: new FormControl<'student' | 'faculty' | 'admin' | 'parent' | 'all'>('all', { nonNullable: true }),
  });

  protected readonly tabs = [
    { id: 'All', label: 'All Notifications' },
    { id: 'Unread', label: 'Unread' },
    { id: 'Fees', label: 'Fees & Finance' },
    { id: 'Academic', label: 'Academic Operations' },
    { id: 'Notices', label: 'Institutional Notices' },
    { id: 'System', label: 'System Alerts' },
  ];

  protected readonly filteredNotifications = computed(() => {
    const list = this.notificationService.notifications();
    const tab = this.activeTab();

    if (tab === 'All') return list;
    if (tab === 'Unread') return list.filter(n => !n.isRead);
    return list.filter(n => n.type === tab);
  });

  getCount(tabId: string) {
    const list = this.notificationService.notifications();
    if (tabId === 'All') return list.length;
    if (tabId === 'Unread') return list.filter(n => !n.isRead).length;
    return list.filter(n => n.type === tabId && !n.isRead).length;
  }

  openBroadcast() {
    this.broadcastForm.reset({
      title: '',
      description: '',
      type: 'Academic',
      priority: 'High',
      targetRole: 'all',
    });
    this.isBroadcastOpen.set(true);
  }

  sendBroadcast() {
    if (this.broadcastForm.invalid) return;
    const val = this.broadcastForm.getRawValue();
    this.notificationService.broadcastAlert({
      title: val.title!,
      description: val.description!,
      type: val.type,
      priority: val.priority,
      targetRole: val.targetRole,
    });
    this.studentsService.showToast('success', 'Real-time alert broadcast persisted to Firestore.');
    this.isBroadcastOpen.set(false);
  }

  markAllRead() {
    this.notificationService.markAllRead();
    this.studentsService.showToast('info', 'All notifications marked as read.');
  }

  deleteSingle(id: string) {
    this.notificationService.deleteNotification(id);
  }

  clearAll() {
    this.notificationService.clearAll();
    this.isClearConfirmOpen.set(false);
    this.studentsService.showToast('info', 'Notification center cleared.');
  }

  markAndRoute(n: { id: string; link?: string }) {
    this.notificationService.markRead(n.id);
    if (n.link) this.router.navigate([n.link]);
  }

  getIconBg(type: string) {
    switch (type) {
      case 'Fees':
        return 'bg-emerald-50 border-emerald-100';
      case 'Academic':
        return 'bg-indigo-50 border-indigo-100';
      case 'Notices':
        return 'bg-amber-50 border-amber-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  }

  getIconColor(type: string) {
    switch (type) {
      case 'Fees':
        return 'text-emerald-600';
      case 'Academic':
        return 'text-indigo-600';
      case 'Notices':
        return 'text-amber-600';
      default:
        return 'text-slate-500';
    }
  }

  getPriorityClass(prio: string) {
    switch (prio) {
      case 'Urgent':
        return 'bg-rose-600 text-white';
      case 'High':
        return 'bg-rose-100 text-rose-700';
      case 'Medium':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

  getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  }
}
