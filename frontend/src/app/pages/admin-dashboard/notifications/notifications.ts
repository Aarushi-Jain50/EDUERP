import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PageHeader } from '../../../components/shared/page-header';
import { NotificationService } from '../../../services/notification.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notifications-page',
  imports: [CommonModule, PageHeader],
  template: `
    <div class="flex flex-col gap-6 max-w-[1000px] mx-auto w-full font-sans">
      <app-page-header title="Notifications" subtitle="View and manage all real-time institutional alerts and system updates." primaryActionLabel="Mark all read" (primaryActionClicked)="notificationService.markAllRead()" />
      
      <!-- Filter Tabs -->
      <div class="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar whitespace-nowrap">
         @for (tab of tabs; track tab.id) {
           <button 
             (click)="activeTab.set(tab.id)"
             [class]="activeTab() === tab.id ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-bold' : 'text-slate-500 hover:text-slate-800'"
             class="px-4 py-3 text-xs transition-colors cursor-pointer flex items-center gap-2"
           >
             {{ tab.label }}
             @if (getCount(tab.id); as count) {
               <span class="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{{ count }}</span>
             }
           </button>
         }
      </div>

      <!-- Notifications List -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden divide-y divide-slate-100">
         @for (n of filteredNotifications(); track n.id) {
           <div 
             (click)="markAndRoute(n)"
             (keydown.enter)="markAndRoute(n)"
             tabindex="0"
             class="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
             [class.bg-purple-50/30]="!n.isRead"
           >
              <div [class]="getIconBg(n.type)" class="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0">
                 <span class="material-icons text-xl" [class]="getIconColor(n.type)">{{ n.icon || 'notifications' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                 <div class="flex justify-between items-start gap-4">
                    <h4 class="text-sm font-bold text-slate-900 group-hover:text-[#6D42E8] transition-colors truncate">{{ n.title }}</h4>
                    <span class="text-[10px] font-bold text-slate-400 uppercase shrink-0">{{ getRelativeTime(n.timestamp) }}</span>
                 </div>
                 <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ n.description }}</p>
                 <div class="flex items-center gap-2 mt-2">
                    <span [class]="getPriorityClass(n.priority)" class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">{{ n.priority }}</span>
                    <span class="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{{ n.type }}</span>
                 </div>
              </div>
              @if (!n.isRead) {
                <div class="w-2 h-2 rounded-full bg-[#D946EF] mt-2 shrink-0"></div>
              }
           </div>
         } @empty {
            <div class="p-20 text-center text-slate-400">
               <span class="material-icons text-5xl block mb-2 opacity-20">notifications_off</span>
               <h3 class="text-lg font-bold text-slate-800">No Notifications</h3>
               <p class="text-sm mt-1">You're all caught up! Institutional alerts will appear here.</p>
            </div>
         }
      </div>
    </div>
  `
})
export class NotificationsPage {
  protected readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<string>('All');

  protected readonly tabs = [
    { id: 'All', label: 'All Notifications' },
    { id: 'Unread', label: 'Unread' },
    { id: 'Fees', label: 'Fees & Finance' },
    { id: 'Academic', label: 'Academic Operations' },
    { id: 'Notices', label: 'Institutional Notices' },
    { id: 'System', label: 'System Alerts' }
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
    if (tabId === 'All') return 0;
    if (tabId === 'Unread') return list.filter(n => !n.isRead).length;
    return list.filter(n => n.type === tabId && !n.isRead).length;
  }

  markAndRoute(n: { id: string; link?: string }) {
    this.notificationService.markRead(n.id);
    if (n.link) this.router.navigate([n.link]);
  }

  getIconBg(type: string) {
    switch (type) {
      case 'Fees': return 'bg-emerald-50 border-emerald-100';
      case 'Academic': return 'bg-indigo-50 border-indigo-100';
      case 'Notices': return 'bg-amber-50 border-amber-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  }

  getIconColor(type: string) {
    switch (type) {
      case 'Fees': return 'text-emerald-600';
      case 'Academic': return 'text-indigo-600';
      case 'Notices': return 'text-amber-600';
      default: return 'text-slate-500';
    }
  }

  getPriorityClass(prio: string) {
    switch (prio) {
      case 'Urgent': return 'bg-rose-600 text-white';
      case 'High': return 'bg-rose-100 text-rose-700';
      case 'Medium': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-500';
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
