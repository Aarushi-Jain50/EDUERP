import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../services/notification.service';
import { CurrentUserService } from '../../services/current-user.service';
import { StudentsService } from '../../services/students.service';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-dvh flex flex-col font-sans bg-[#F8FAFC] text-slate-900 overflow-hidden text-[13px]">

      <!-- 1. Top Navigation Bar -->
      <header class="bg-[#0F172A] text-white h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 border-b border-white/10 shrink-0 z-30 shadow-sm">
        <!-- Left: Mobile Toggle, Sidebar Collapse & Brand Logo -->
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            (click)="isMobileNavOpen.set(!isMobileNavOpen())"
            aria-label="Toggle Navigation Drawer"
            class="lg:hidden text-slate-300 hover:text-white w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <mat-icon class="text-xl">menu</mat-icon>
          </button>

          <button
            type="button"
            (click)="isSidebarCollapsed.set(!isSidebarCollapsed())"
            aria-label="Toggle sidebar"
            [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            class="hidden lg:flex text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <mat-icon class="text-xl">menu</mat-icon>
          </button>

          <a routerLink="/faculty/dashboard" class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6D42E8] to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
              <mat-icon class="text-white text-lg">school</mat-icon>
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-bold text-base tracking-tight text-white whitespace-nowrap">
                Edu<span class="text-purple-400">ERP</span>
              </span>
              <span class="hidden sm:inline-block px-2 py-0.5 rounded-xl bg-white/10 text-purple-300 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border border-purple-400/20">
                Faculty
              </span>
            </div>
          </a>

          <div class="h-5 w-px bg-white/15 hidden md:block"></div>

          <div class="hidden md:flex items-center text-xs text-slate-300 font-medium whitespace-nowrap truncate max-w-[210px]">
            <span>{{ currentFaculty().department }}</span>
          </div>
        </div>

        <!-- Center: Functional Global Search Bar -->
        <div class="hidden lg:flex items-center flex-1 max-w-md mx-6 relative">
          <div class="relative w-full">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-base">search</mat-icon>
            </span>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              (focus)="isSearchOpen.set(true)"
              placeholder="Jump to classes, question papers, answer sheets, marks, attendance..."
              aria-label="Search faculty modules"
              class="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder-slate-400 focus:placeholder-slate-500 rounded-xl pl-9 pr-8 py-1.5 text-[13px] transition-colors border border-white/10 focus:border-[#6D42E8] focus:outline-none"
            />
            @if (searchQuery()) {
              <button
                type="button"
                (click)="searchQuery.set(''); isSearchOpen.set(false)"
                aria-label="Clear search"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            }
          </div>

          @if (isSearchOpen() && searchQuery().trim().length > 0) {
            <button
              type="button"
              aria-label="Close search results"
              (click)="isSearchOpen.set(false)"
              class="fixed inset-0 z-40 w-full h-full bg-transparent border-0 cursor-default"
            ></button>
            <div class="absolute top-full left-0 right-0 mt-2 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-50">
              @for (match of searchResults(); track match.route) {
                <button
                  type="button"
                  (click)="navigateFromSearch(match.route)"
                  class="w-full text-left px-3 py-2 hover:bg-purple-50/70 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <span class="flex items-center gap-2 text-[13px] font-medium text-slate-900">
                    <mat-icon class="text-base text-[#6D42E8]">{{ match.icon }}</mat-icon>
                    <span>{{ match.title }}</span>
                  </span>
                  <span class="text-[11px] text-slate-500">{{ match.section }}</span>
                </button>
              } @empty {
                <p class="px-3 py-2 text-xs text-slate-500">No matching module found.</p>
              }
            </div>
          }
        </div>

        <!-- Right: Notifications & Profile Menu -->
        <div class="flex items-center gap-2.5 shrink-0">

          <!-- Notifications Bell -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleNotifications()"
              aria-label="View notifications"
              title="Notifications"
              class="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-white/10 relative"
            >
              <mat-icon class="text-lg">notifications</mat-icon>
              @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6D42E8] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {{ unreadNotificationsCount() }}
                </span>
              }
            </button>

            @if (isNotificationsOpen()) {
              <button
                type="button"
                aria-label="Close notifications"
                (click)="isNotificationsOpen.set(false)"
                class="fixed inset-0 z-40 w-full h-full bg-transparent border-0 cursor-default"
              ></button>
              <div class="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-80 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 p-3 z-50 text-xs">
                <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span class="font-bold text-[13px] text-slate-900">Faculty Notifications</span>
                  <button type="button" (click)="markAllAsRead()" class="text-xs text-[#6D42E8] font-semibold hover:underline cursor-pointer">
                    Mark all read
                  </button>
                </div>
                <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-1">
                  @for (n of notifications(); track n.id) {
                    <button
                      type="button"
                      (click)="openNotification(n.id, n.link)"
                      class="w-full text-left py-2.5 px-2 hover:bg-purple-50/50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div class="flex items-start gap-2.5">
                        <mat-icon class="text-base text-[#6D42E8] mt-0.5 shrink-0">{{ n.icon || 'notifications' }}</mat-icon>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-2">
                            <p class="font-semibold text-slate-900 text-xs truncate">{{ n.title }}</p>
                            @if (!n.isRead) {
                              <span class="w-1.5 h-1.5 rounded-full bg-[#6D42E8] shrink-0"></span>
                            }
                          </div>
                          <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">{{ n.description }}</p>
                        </div>
                      </div>
                    </button>
                  } @empty {
                    <p class="py-6 text-center text-xs text-slate-500">No notifications.</p>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Faculty Profile Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleProfile()"
              aria-label="Open faculty profile menu"
              class="flex items-center gap-2 pl-1.5 py-1 pr-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6D42E8] to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {{ currentFaculty().initials }}
              </div>
              <div class="hidden xl:block text-left">
                <p class="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">{{ currentFaculty().name }}</p>
                <p class="text-[10px] text-purple-300 font-medium uppercase tracking-wider">{{ currentFaculty().designation }}</p>
              </div>
              <mat-icon class="text-sm text-slate-300 hidden xl:block">expand_more</mat-icon>
            </button>

            @if (isProfileDropdownOpen()) {
              <button
                type="button"
                aria-label="Close profile menu"
                (click)="isProfileDropdownOpen.set(false)"
                class="fixed inset-0 z-40 w-full h-full bg-transparent border-0 cursor-default"
              ></button>
              <div class="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-64 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-xs">
                <div class="px-4 py-3 border-b border-slate-100 space-y-0.5">
                  <p class="font-bold text-[13px] text-slate-900 truncate">{{ currentFaculty().name }}</p>
                  <p class="text-[11px] text-slate-500 truncate">{{ currentFaculty().email }}</p>
                  <p class="text-[11px] text-[#6D42E8] font-medium">{{ currentFaculty().department }}</p>
                </div>

                <a
                  routerLink="/faculty/my-profile"
                  (click)="isProfileDropdownOpen.set(false)"
                  class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-purple-50 text-slate-900 hover:text-[#6D42E8] font-medium cursor-pointer"
                >
                  <mat-icon class="text-base text-[#6D42E8]">person</mat-icon>
                  <span>My Profile</span>
                </a>
                <a
                  routerLink="/faculty/my-profile"
                  [queryParams]="{ tab: 'sessions' }"
                  (click)="isProfileDropdownOpen.set(false)"
                  class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-purple-50 text-slate-900 hover:text-[#6D42E8] font-medium cursor-pointer"
                >
                  <mat-icon class="text-base text-[#6D42E8]">security</mat-icon>
                  <span>Security & Sessions</span>
                </a>
                <a
                  routerLink="/faculty/helpdesk"
                  (click)="isProfileDropdownOpen.set(false)"
                  class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-purple-50 text-slate-900 hover:text-[#6D42E8] font-medium cursor-pointer"
                >
                  <mat-icon class="text-base text-[#6D42E8]">support_agent</mat-icon>
                  <span>Helpdesk & Support</span>
                </a>
                <div class="border-t border-slate-100 my-1"></div>
                <button
                  type="button"
                  (click)="logout()"
                  class="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-rose-600 hover:bg-rose-50 font-medium cursor-pointer"
                >
                  <mat-icon class="text-base">logout</mat-icon>
                  <span>Sign Out</span>
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Center Workspace -->
      <div class="flex-1 flex overflow-hidden min-h-0">

        <!-- Desktop Collapsible Sidebar -->
        <aside
          [class]="isSidebarCollapsed() ? 'w-20' : 'w-64'"
          class="gradient-brand text-slate-200 border-r border-white/10 flex-col transition-all duration-200 shrink-0 hidden lg:flex select-none relative h-full overflow-hidden"
        >
          <div class="p-4 border-b border-white/10 flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-xl bg-white/10 text-purple-400 flex items-center justify-center shrink-0 border border-white/15">
                <mat-icon class="text-base">assignment_ind</mat-icon>
              </div>
              @if (!isSidebarCollapsed()) {
                <div class="truncate">
                  <p class="font-bold text-xs text-white uppercase tracking-wide truncate">Faculty Portal</p>
                  <p class="text-[11px] text-emerald-400 font-semibold truncate">{{ currentFaculty().employeeId }}</p>
                </div>
              }
            </div>
            <button
              type="button"
              (click)="isSidebarCollapsed.set(!isSidebarCollapsed())"
              [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
              aria-label="Collapse or expand sidebar"
              class="text-slate-300 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <mat-icon class="text-base">{{ isSidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
            </button>
          </div>

          <nav class="flex-1 p-3 space-y-4 overflow-y-auto text-[13px] font-medium text-slate-300 relative z-10">
            @for (group of menuGroups; track group.sectionTitle) {
              <div class="space-y-1">
                @if (!isSidebarCollapsed()) {
                  <div class="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <mat-icon class="text-xs text-purple-400">{{ group.icon }}</mat-icon>
                    <span>{{ group.sectionTitle }}</span>
                  </div>
                }

                @for (item of group.items; track item.route) {
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="bg-[#6D42E8] text-white font-semibold shadow-sm"
                    class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer group"
                    [title]="isSidebarCollapsed() ? item.title : ''"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <mat-icon class="text-base text-slate-300 group-hover:text-white shrink-0">{{ item.icon }}</mat-icon>
                      @if (!isSidebarCollapsed()) {
                        <span class="truncate">{{ item.title }}</span>
                      }
                    </div>
                  </a>
                }
              </div>
            }
          </nav>
        </aside>

        <!-- Mobile Drawer -->
        @if (isMobileNavOpen()) {
          <div class="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Close navigation drawer"
              (click)="isMobileNavOpen.set(false)"
              class="fixed inset-0 bg-black/50 w-full h-full border-0"
            ></button>
            <div class="relative w-72 max-w-[85vw] gradient-brand text-slate-200 flex flex-col z-10 overflow-y-auto">
              <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6D42E8] to-indigo-600 text-white flex items-center justify-center">
                    <mat-icon class="text-base">school</mat-icon>
                  </div>
                  <span class="font-bold text-sm text-white">Faculty Portal</span>
                </div>
                <button
                  type="button"
                  (click)="isMobileNavOpen.set(false)"
                  aria-label="Close drawer"
                  class="text-slate-300 hover:text-white p-1 cursor-pointer"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <nav class="p-3 space-y-4 text-[13px]">
                @for (group of menuGroups; track group.sectionTitle) {
                  <div class="space-y-1">
                    <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {{ group.sectionTitle }}
                    </div>
                    @for (item of group.items; track item.route) {
                      <a
                        [routerLink]="item.route"
                        (click)="isMobileNavOpen.set(false)"
                        routerLinkActive="bg-[#6D42E8] text-white font-semibold"
                        class="w-full min-h-[44px] py-2.5 px-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-3"
                      >
                        <mat-icon class="text-base shrink-0">{{ item.icon }}</mat-icon>
                        <span>{{ item.title }}</span>
                      </a>
                    }
                  </div>
                }
              </nav>
            </div>
          </div>
        }

        <!-- Scrollable Main Viewport -->
        <div class="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
          <main class="flex-1 p-3.5 sm:p-6 max-w-[1400px] mx-auto w-full min-w-0">
            <router-outlet />
          </main>
        </div>
      </div>

      <!-- Global Toast Feedback -->
      @if (studentsService.toasts().length > 0) {
        <div class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 space-y-2 sm:max-w-xs sm:w-full pointer-events-none">
          @for (toast of studentsService.toasts(); track toast.id) {
            <div class="pointer-events-auto bg-white border border-slate-200/90 rounded-xl shadow-md p-3 flex items-start justify-between gap-2 text-xs text-slate-900">
              <div class="flex items-start gap-2">
                <mat-icon
                  class="text-base shrink-0"
                  [class]="toast.type === 'error' ? 'text-rose-600' : toast.type === 'warning' ? 'text-amber-600' : 'text-[#6D42E8]'"
                >
                  {{ toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'check_circle' }}
                </mat-icon>
                <span class="leading-snug font-medium">{{ toast.text }}</span>
              </div>
              <button
                type="button"
                (click)="studentsService.removeToast(toast.id)"
                aria-label="Dismiss notification"
                class="text-slate-400 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class FacultyLayout implements OnInit {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly userService = inject(CurrentUserService);
  protected readonly studentsService = inject(StudentsService);
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
  protected readonly isSearchOpen = signal<boolean>(false);
  protected readonly searchQuery = signal<string>('');

  protected readonly currentFaculty = this.userService.currentFaculty;

  protected readonly notifications = computed(() => {
    const facId = this.currentFaculty().id;
    return this.notificationService
      .notifications()
      .filter(
        n => !n.targetRole || (n.targetRole === 'faculty' && (!n.targetFacultyId || n.targetFacultyId === facId))
      );
  });
  protected readonly unreadNotificationsCount = computed(
    () => this.notifications().filter(n => !n.isRead).length
  );

  protected readonly menuGroups: MenuSection[] = [
    {
      sectionTitle: 'Overview',
      icon: 'dashboard',
      items: [
        { title: 'Dashboard', icon: 'dashboard', route: '/faculty/dashboard' }
      ]
    },
    {
      sectionTitle: 'Teaching',
      icon: 'school',
      items: [
        { title: 'My Classes', icon: 'class', route: '/faculty/my-classes' },
        { title: 'Timetable & Calendar', icon: 'calendar_month', route: '/faculty/timetable' },
        { title: 'Attendance', icon: 'how_to_reg', route: '/faculty/attendance' }
      ]
    },
    {
      sectionTitle: 'Assessment',
      icon: 'assignment',
      items: [
        { title: 'Assignments & Homework', icon: 'assignment_late', route: '/faculty/assignments' },
        { title: 'Question Papers & Bank', icon: 'quiz', route: '/faculty/question-papers' },
        { title: 'Answer Sheet Evaluation', icon: 'fact_check', route: '/faculty/answer-sheets' },
        { title: 'Marks & Result Approval', icon: 'grade', route: '/faculty/results-marks' },
        { title: 'Reports & Analytics', icon: 'analytics', route: '/faculty/reports' }
      ]
    },
    {
      sectionTitle: 'People',
      icon: 'people',
      items: [
        { title: 'My Students', icon: 'groups', route: '/faculty/my-students' }
      ]
    },
    {
      sectionTitle: 'Communication',
      icon: 'chat',
      items: [
        { title: 'Notices', icon: 'campaign', route: '/faculty/notices' },
        { title: 'Message Center', icon: 'mail', route: '/faculty/message-center' },
        { title: 'Helpdesk', icon: 'support_agent', route: '/faculty/helpdesk' }
      ]
    },
    {
      sectionTitle: 'Account',
      icon: 'settings',
      items: [
        { title: 'My Profile & Security', icon: 'person', route: '/faculty/my-profile' }
      ]
    }
  ];

  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    const items: (MenuItem & { section: string })[] = [];
    for (const group of this.menuGroups) {
      for (const item of group.items) {
        if (
          item.title.toLowerCase().includes(q) ||
          group.sectionTitle.toLowerCase().includes(q)
        ) {
          items.push({ ...item, section: group.sectionTitle });
        }
      }
    }
    return items.slice(0, 6);
  });

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.isSearchOpen.set(true);
  }

  protected navigateFromSearch(route: string): void {
    this.searchQuery.set('');
    this.isSearchOpen.set(false);
    this.router.navigateByUrl(route);
  }

  protected toggleNotifications(): void {
    this.isProfileDropdownOpen.set(false);
    this.isNotificationsOpen.update(v => !v);
  }

  protected toggleProfile(): void {
    this.isNotificationsOpen.set(false);
    this.isProfileDropdownOpen.update(v => !v);
  }

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
    this.isProfileDropdownOpen.set(false);
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
