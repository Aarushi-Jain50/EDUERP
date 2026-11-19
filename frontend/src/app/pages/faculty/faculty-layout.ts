import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../services/notification.service';
import { CurrentUserService } from '../../services/current-user.service';

interface MenuItem {
  title: string;
  icon: string;
  route: string;
}

interface MenuSection {
  sectionTitle: string;
  icon: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-faculty-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-900 overflow-hidden">

      <!-- 1. Top Navigation Bar -->
      <header class="bg-[#0F172A] text-white h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 border-b border-white/10 shrink-0 z-30 shadow-md">
        <!-- Left: Brand Logo & Mobile Toggle -->
        <div class="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            (click)="isMobileNavOpen.set(!isMobileNavOpen())"
            aria-label="Toggle Navigation Drawer"
            class="lg:hidden text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <mat-icon class="text-xl">menu</mat-icon>
          </button>

          <!-- Brand Logo -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-indigo-950/30 shrink-0">
              <mat-icon class="text-white text-lg sm:text-xl">school</mat-icon>
            </div>
            <div class="min-w-0">
              <div class="flex items-center">
                <span class="font-extrabold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">Edu<span class="text-indigo-400">ERP</span></span>
                <span class="hidden sm:inline-block ml-2 px-2 py-0.5 rounded bg-white/10 text-indigo-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Faculty Portal</span>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-6 w-px bg-white/15 hidden md:block"></div>

          <!-- Page Title Breadcrumb -->
          <div class="hidden md:flex items-center text-xs">
            <span class="font-bold text-white flex items-center gap-1.5">
              <mat-icon class="text-sm text-indigo-400">space_dashboard</mat-icon>
              <span>Faculty Workspace</span>
            </span>
          </div>
        </div>

        <!-- Center: Global Search Bar -->
        <div class="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div class="relative w-full">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-base">search</mat-icon>
            </span>
            <input
              type="text"
              placeholder="Search students, courses, assignments..."
              class="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder-slate-400 focus:placeholder-slate-500 rounded-xl pl-10 pr-4 py-1.5 text-xs transition-all border border-white/10 focus:border-indigo-600 focus:outline-none shadow-inner"
            />
          </div>
        </div>

        <!-- Right: Notifications & Profile Menu -->
        <div class="flex items-center gap-3 sm:gap-4 shrink-0">
          
          <!-- Notifications Bell -->
          <div class="relative">
            <button
              (click)="isNotificationsOpen.set(!isNotificationsOpen())"
              aria-label="View notifications"
              title="Notifications"
              class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-white/10 relative"
            >
              <mat-icon class="text-lg">notifications</mat-icon>
              @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {{ unreadNotificationsCount() }}
                </span>
              }
            </button>

            @if (isNotificationsOpen()) {
              <div class="absolute right-0 mt-2.5 w-[calc(100vw-1.5rem)] max-w-80 sm:w-80 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 text-xs">
                <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span class="font-extrabold text-xs text-slate-900">Faculty Notifications</span>
                  <button (click)="markAllAsRead()" class="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer">Mark all read</button>
                </div>
                <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-1.5">
                  @for (n of notifications(); track n.id) {
                    <button
                      type="button"
                      (click)="openNotification(n.id, n.link)"
                      class="w-full text-left py-3 px-2.5 hover:bg-indigo-50/50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div class="flex items-start gap-3">
                        <mat-icon class="text-base text-indigo-600 mt-0.5 shrink-0">{{ n.icon || 'notifications' }}</mat-icon>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-2">
                            <p class="font-bold text-slate-900 text-xs truncate">{{ n.title }}</p>
                            @if (!n.isRead) {
                              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                            }
                          </div>
                          <p class="text-[11px] text-slate-500 mt-1 leading-snug">{{ n.description }}</p>
                          <span class="text-[10px] text-slate-400 mt-1.5 block">{{ n.time }}</span>
                        </div>
                      </div>
                    </button>
                  } @empty {
                    <p class="py-6 text-center text-xs text-slate-400">No notifications.</p>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Faculty Profile Dropdown -->
          <div class="relative">
            <button
              (click)="isProfileDropdownOpen.set(!isProfileDropdownOpen())"
              aria-label="Open profile menu"
              class="flex items-center gap-3 pl-2 py-1 pr-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 p-0.5 shrink-0 shadow-sm">
                <div class="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center text-xs font-bold text-white">
                  {{ currentFaculty().initials }}
                </div>
              </div>
              <div class="hidden xl:block text-left">
                <p class="text-xs font-bold text-white leading-tight">{{ currentFaculty().name }}</p>
                <p class="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">{{ currentFaculty().designation }}</p>
              </div>
              <mat-icon class="text-xs text-slate-400 hidden xl:block">expand_more</mat-icon>
            </button>

            @if (isProfileDropdownOpen()) {
              <div class="absolute right-0 mt-2.5 w-[calc(100vw-1.5rem)] max-w-64 sm:w-64 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 text-xs">
                <div class="px-4 py-3 border-b border-slate-100 space-y-1">
                  <p class="font-bold text-slate-900 truncate">{{ currentFaculty().name }}</p>
                  <p class="text-[11px] font-medium text-slate-600 truncate">{{ currentFaculty().email }}</p>
                  <p class="text-[10px] text-slate-500 font-medium">Department: {{ currentFaculty().department }}</p>
                </div>

                <a routerLink="/faculty/my-profile" (click)="isProfileDropdownOpen.set(false)" class="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 cursor-pointer">
                  <mat-icon class="text-sm">person</mat-icon> My Profile
                </a>
                <div class="border-t border-slate-100 my-1.5"></div>
                <button (click)="logout()" class="w-full text-left flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 cursor-pointer">
                  <mat-icon class="text-sm">logout</mat-icon> Sign Out
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Center Container -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        
        <!-- Sidebar -->
        <aside
          [class]="isSidebarCollapsed() ? 'w-20' : 'w-72'"
          class="gradient-brand text-slate-200 border-r border-white/10 flex flex-col shadow-xl transition-all duration-300 shrink-0 hidden lg:flex select-none relative h-full overflow-hidden"
        >
          <div class="absolute top-0 right-0 w-32 h-32 rounded-full aurora-glow pointer-events-none"></div>

          <!-- Sidebar Header -->
          <div class="p-4 border-b border-white/10 flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-white/10 text-indigo-400 flex items-center justify-center shrink-0 border border-white/15">
                <mat-icon class="text-base">assignment_ind</mat-icon>
              </div>
              @if (!isSidebarCollapsed()) {
                <div class="truncate">
                  <h3 class="font-extrabold text-xs text-white uppercase tracking-wide truncate">FACULTY PORTAL</h3>
                  <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">SESSION ACTIVE</span>
                </div>
              }
            </div>
            <button
              (click)="isSidebarCollapsed.set(!isSidebarCollapsed())"
              [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
              class="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <mat-icon class="text-base">{{ isSidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
            </button>
          </div>

          <!-- Navigation Groups -->
          <nav class="flex-1 p-3 space-y-4 overflow-y-auto text-xs font-medium text-slate-300 relative z-10">
            @for (group of menuGroups; track group.sectionTitle) {
              <div class="space-y-1">
                @if (!isSidebarCollapsed()) {
                  <div class="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 flex items-center gap-1.5">
                    <mat-icon class="text-xs text-indigo-400">{{ group.icon }}</mat-icon>
                    <span>{{ group.sectionTitle }}</span>
                  </div>
                }

                @for (item of group.items; track item.title) {
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/30"
                    class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer group"
                    [title]="isSidebarCollapsed() ? item.title : ''"
                  >
                    <div class="flex items-center gap-3">
                      <mat-icon class="text-base group-hover:scale-105 transition-transform text-slate-300 group-hover:text-white">{{ item.icon }}</mat-icon>
                      @if (!isSidebarCollapsed()) {
                        <span class="truncate">{{ item.title }}</span>
                      }
                    </div>
                    @if (!isSidebarCollapsed()) {
                      <mat-icon class="text-xs opacity-40 group-hover:opacity-100">chevron_right</mat-icon>
                    }
                  </a>
                }
              </div>
            }
          </nav>
        </aside>

        <!-- Mobile Drawer -->
        @if (isMobileNavOpen()) {
          <div class="fixed inset-0 z-50 flex lg:hidden">
            <button type="button" aria-label="Close menu drawer" (click)="isMobileNavOpen.set(false)" class="fixed inset-0 bg-black/60 w-full h-full border-0"></button>
            <div class="relative w-72 gradient-brand text-slate-200 flex flex-col shadow-2xl z-10 overflow-y-auto">
              <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl gradient-accent text-white flex items-center justify-center">
                    <mat-icon class="text-base">school</mat-icon>
                  </div>
                  <span class="font-bold text-sm text-white">Faculty Navigation</span>
                </div>
                <button (click)="isMobileNavOpen.set(false)" class="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <div class="p-3 space-y-3 text-xs">
                @for (group of menuGroups; track group.sectionTitle) {
                  <div>
                    <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ group.sectionTitle }}</div>
                    @for (item of group.items; track item.title) {
                      <a
                        [routerLink]="item.route"
                        (click)="isMobileNavOpen.set(false)"
                        routerLinkActive="bg-indigo-600 text-white font-bold"
                        class="w-full block py-2 px-3 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-2.5 mt-1"
                      >
                        <mat-icon class="text-sm">{{ item.icon }}</mat-icon>
                        <span>{{ item.title }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Scrollable Main Viewport -->
        <div class="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden min-h-0">
          <main class="flex-1 p-3 sm:p-6 max-w-[1400px] mx-auto w-full min-w-0">
            <router-outlet />
          </main>
        </div>

      </div>
    </div>
  `
})
export class FacultyLayout implements OnInit {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly userService = inject(CurrentUserService);
  protected readonly notificationService = inject(NotificationService);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const activeRole = this.userService.syncFromStorage();
      if (activeRole !== 'faculty') {
        this.router.navigateByUrl(this.userService.getHomeRoute(activeRole));
      }
    }
  }

  protected readonly isSidebarCollapsed = signal<boolean>(false);
  protected readonly isMobileNavOpen = signal<boolean>(false);
  protected readonly isProfileDropdownOpen = signal<boolean>(false);
  protected readonly isNotificationsOpen = signal<boolean>(false);

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly notifications = computed(() => {
    const facId = this.currentFaculty().id;
    return this.notificationService
      .notifications()
      .filter(
        n => !n.targetRole || (n.targetRole === 'faculty' && (!n.targetFacultyId || n.targetFacultyId === facId))
      )
      .map(n => ({
        ...n,
        time: 'Just now'
      }));
  });
  protected readonly unreadNotificationsCount = computed(
    () => this.notifications().filter(n => !n.isRead).length
  );

  protected readonly menuGroups: MenuSection[] = [
    {
      sectionTitle: 'OVERVIEW',
      icon: 'dashboard',
      items: [
        { title: 'Dashboard', icon: 'dashboard', route: '/faculty/dashboard' }
      ]
    },
    {
      sectionTitle: 'TEACHING',
      icon: 'school',
      items: [
        { title: 'My Classes', icon: 'class', route: '/faculty/my-classes' },
        { title: 'Timetable', icon: 'calendar_month', route: '/faculty/timetable' },
        { title: 'Attendance', icon: 'how_to_reg', route: '/faculty/attendance' }
      ]
    },
    {
      sectionTitle: 'ASSESSMENT',
      icon: 'assignment',
      items: [
        { title: 'Assignments', icon: 'assignment_late', route: '/faculty/assignments' },
        { title: 'Results & Marks', icon: 'grade', route: '/faculty/results-marks' }
      ]
    },
    {
      sectionTitle: 'PEOPLE',
      icon: 'people',
      items: [
        { title: 'My Students', icon: 'groups', route: '/faculty/my-students' }
      ]
    },
    {
      sectionTitle: 'COMMUNICATION',
      icon: 'chat',
      items: [
        { title: 'Notices', icon: 'campaign', route: '/faculty/notices' },
        { title: 'Message Center', icon: 'mail', route: '/faculty/message-center' }
      ]
    },
    {
      sectionTitle: 'ACCOUNT',
      icon: 'settings',
      items: [
        { title: 'My Profile', icon: 'person', route: '/faculty/my-profile' }
      ]
    }
  ];

  protected openNotification(id: string, link?: string): void {
    this.notificationService.markRead(id);
    this.isNotificationsOpen.set(false);
    if (link) {
      this.router.navigateByUrl(link);
    }
  }

  protected markAllAsRead(): void {
    for (const n of this.notifications()) {
      this.notificationService.markRead(n.id);
    }
  }

  protected logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
