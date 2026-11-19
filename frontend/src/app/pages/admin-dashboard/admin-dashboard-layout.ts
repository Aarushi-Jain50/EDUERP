import { ChangeDetectionStrategy, Component, signal, inject, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { CurrentUserService } from '../../services/current-user.service';
import { AuthSessionService } from '../../services/auth-session.service';

interface MenuItem {
  title: string;
  icon: string;
  route: string;
}

interface MenuSection {
  sectionTitle: string;
  icon: string;
  isCollapsible?: boolean;
  items: MenuItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-900 overflow-hidden">

      <!-- 1. Top Navigation Bar (Fixed at top, shrink-0) -->
      <header class="bg-[#0F172A] text-white h-16 px-4 lg:px-6 flex items-center justify-between border-b border-white/10 shrink-0 z-30 shadow-md">
        <!-- Left: Brand Logo & Mobile Toggle & Page Title / Breadcrumbs -->
        <div class="flex items-center gap-4">
          <button
            (click)="isMobileNavOpen.set(!isMobileNavOpen())"
            aria-label="Toggle Navigation Drawer"
            class="lg:hidden text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <span class="material-icons text-xl">menu</span>
          </button>

          <!-- Brand Logo -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-indigo-950/30 shrink-0">
              <span class="material-icons text-white text-2xl">school</span>
            </div>
            <div>
              <div class="flex items-center">
                <span class="font-extrabold text-lg tracking-tight text-white">Edu<span class="text-indigo-400">ERP</span></span>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-6 w-px bg-white/15 hidden md:block"></div>

          <!-- Page Title Breadcrumb -->
          <div class="hidden md:flex items-center text-xs">
            <span class="font-bold text-white flex items-center gap-1.5">
              <span class="material-icons text-sm text-indigo-400">space_dashboard</span>
              <span>Admin Dashboard</span>
            </span>
          </div>
        </div>

        <!-- Center: Global Search Bar -->
        <div class="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div class="relative w-full">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <span class="material-icons text-base">search</span>
            </span>
            <input
              type="text"
              placeholder="Search students, faculty, courses, transactions (Press '/' to focus)..."
              [ngModel]="globalSearch()"
              (ngModelChange)="globalSearch.set($event)"
              class="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder-slate-400 focus:placeholder-slate-500 rounded-xl pl-10 pr-10 py-1.5 text-xs transition-all border border-white/10 focus:border-indigo-600 focus:outline-none shadow-inner"
            />
            @if (globalSearch()) {
              <button
                (click)="globalSearch.set('')"
                aria-label="Clear search query"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
              >
                <span class="material-icons text-xs">close</span>
              </button>
            }
          </div>
        </div>

        <!-- Right: Notifications & Admin Profile Menu -->
        <div class="flex items-center gap-3">
          
          <!-- Notifications Bell Popover -->
          <div class="relative">
            <button
              (click)="isNotificationsOpen.set(!isNotificationsOpen())"
              aria-label="View system notifications"
              title="Notifications"
              class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-white/10 relative"
            >
              <span class="material-icons text-lg">notifications</span>
              @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {{ unreadNotificationsCount() }}
                </span>
              }
            </button>

            @if (isNotificationsOpen()) {
              <div class="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span class="font-extrabold text-xs text-slate-900">System Notifications</span>
                  <button (click)="markAllAsRead()" class="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer">Mark all read</button>
                </div>
                <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-1">
                  @for (n of notifications(); track n.id) {
                    <div class="py-2.5 px-2 hover:bg-indigo-50/50 rounded-lg transition-colors">
                      <div class="flex items-start gap-2.5">
                        <span class="material-icons text-base text-indigo-600 mt-0.5">{{ n.icon }}</span>
                        <div>
                          <p class="font-bold text-slate-900 text-xs">{{ n.title }}</p>
                          <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">{{ n.description }}</p>
                          <span class="text-[10px] text-slate-400 mt-1 block">{{ n.time }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
                <div class="pt-2 border-t border-slate-100 text-center">
                  <a routerLink="/admin/notifications" (click)="isNotificationsOpen.set(false)" class="text-xs font-bold text-indigo-600 hover:underline">
                    View all notifications →
                  </a>
                </div>
              </div>
            }
          </div>

          <!-- Academic Session Switcher -->
          <div class="relative hidden sm:block">
            <button
              (click)="isSessionDropdownOpen.set(!isSessionDropdownOpen())"
              class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 border border-white/10 transition-colors cursor-pointer"
            >
              <span class="material-icons text-sm text-indigo-400">calendar_today</span>
              <span>AY 2025-26</span>
              <span class="material-icons text-xs text-slate-400">arrow_drop_down</span>
            </button>
            @if (isSessionDropdownOpen()) {
              <div class="absolute right-0 mt-1.5 w-52 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
                <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Sessions</div>
                <button (click)="isSessionDropdownOpen.set(false)" class="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-slate-800 cursor-pointer">
                  <span class="material-icons text-sm text-indigo-600">check_circle</span> AY 2025-26 (Active)
                </button>
                <button (click)="isSessionDropdownOpen.set(false)" class="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-600 cursor-pointer">
                  <span class="material-icons text-sm text-slate-400">history</span> AY 2024-25 (Archived)
                </button>
              </div>
            }
          </div>

          <!-- Admin Profile Menu -->
          <div class="relative">
            <button
              (click)="isProfileDropdownOpen.set(!isProfileDropdownOpen())"
              aria-label="Open user profile menu"
              class="flex items-center gap-2.5 pl-2 py-1 pr-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 p-0.5 shrink-0 shadow-sm">
                <div class="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center text-xs font-bold text-white">
                  AD
                </div>
              </div>
              <div class="hidden xl:block text-left">
                <p class="text-xs font-bold text-white leading-tight">Administrator</p>
                <p class="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">SUPER ADMIN</p>
              </div>
              <span class="material-icons text-xs text-slate-400 hidden xl:block">expand_more</span>
            </button>

            @if (isProfileDropdownOpen()) {
              <div class="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
                <div class="px-4 py-2 border-b border-slate-100">
                  <p class="font-bold text-slate-900">{{ adminEmail() }}</p>
                  <p class="text-[10px] text-slate-500 font-medium">Logged in as ERP Administrator</p>
                </div>
                <a routerLink="/admin/profile" (click)="isProfileDropdownOpen.set(false)" class="flex items-center gap-2.5 px-4 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 cursor-pointer">
                  <span class="material-icons text-sm">person</span> My Profile
                </a>
                <a routerLink="/admin/settings" (click)="isProfileDropdownOpen.set(false)" class="flex items-center gap-2.5 px-4 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 cursor-pointer">
                  <span class="material-icons text-sm">settings</span> System Settings
                </a>
                <a routerLink="/admin/audit-logs" (click)="isProfileDropdownOpen.set(false)" class="flex items-center gap-2.5 px-4 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 cursor-pointer">
                  <span class="material-icons text-sm">security</span> Security & Audit Logs
                </a>
                <div class="border-t border-slate-100 my-1"></div>
                <button (click)="logout()" class="w-full text-left flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 cursor-pointer">
                  <span class="material-icons text-sm">logout</span> Sign Out
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Center Container: Deep Navy-to-Indigo Gradient Sidebar + Main Content -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        
        <!-- Fixed Collapsible Left Sidebar (Independent Scroll) -->
        <aside
          [class]="isSidebarCollapsed() ? 'w-20' : 'w-72'"
          class="gradient-brand text-slate-200 border-r border-white/10 flex flex-col shadow-xl transition-all duration-300 shrink-0 hidden lg:flex select-none relative h-full overflow-hidden"
        >
          <!-- Subtle Aurora Glow inside sidebar -->
          <div class="absolute top-0 right-0 w-32 h-32 rounded-full aurora-glow pointer-events-none"></div>

          <!-- Sidebar Header / Collapse Toggle -->
          <div class="p-4 border-b border-white/10 flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-white/10 text-indigo-400 flex items-center justify-center shrink-0 border border-white/15">
                <span class="material-icons text-base">dashboard_customize</span>
              </div>
              @if (!isSidebarCollapsed()) {
                <div class="truncate">
                  <h3 class="font-extrabold text-xs text-white uppercase tracking-wide truncate">ERP NAVIGATION</h3>
                  <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">ALL MODULES ACTIVE</span>
                </div>
              }
            </div>
            <button
              (click)="isSidebarCollapsed.set(!isSidebarCollapsed())"
              [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
              class="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span class="material-icons text-base">{{ isSidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</span>
            </button>
          </div>

          <!-- Navigation Menu Groups (All 8 Groups Requested in Phase 2) -->
          <nav class="flex-1 p-3 space-y-4 overflow-y-auto text-xs font-medium text-slate-300 relative z-10">
            @for (group of menuGroups; track group.sectionTitle) {
              <div class="space-y-1">
                @if (!isSidebarCollapsed()) {
                  <button
                    (click)="toggleSection(group.sectionTitle)"
                    class="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <span class="flex items-center gap-1.5">
                      <span class="material-icons text-xs text-indigo-400">{{ group.icon }}</span>
                      <span>{{ group.sectionTitle }}</span>
                    </span>
                    <span class="material-icons text-xs text-slate-400">{{ collapsedSections()[group.sectionTitle] ? 'add' : 'remove' }}</span>
                  </button>
                }

                @if (!collapsedSections()[group.sectionTitle]) {
                  @for (item of group.items; track item.title) {
                    <a
                      [routerLink]="item.route"
                      routerLinkActive="bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/30"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard/overview' }"
                      class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer group"
                      [title]="isSidebarCollapsed() ? item.title : ''"
                    >
                      <div class="flex items-center gap-3">
                        <span class="material-icons text-base group-hover:scale-105 transition-transform text-slate-300 group-hover:text-white">{{ item.icon }}</span>
                        @if (!isSidebarCollapsed()) {
                          <span class="truncate">{{ item.title }}</span>
                        }
                      </div>
                      @if (!isSidebarCollapsed()) {
                        <span class="material-icons text-xs opacity-40 group-hover:opacity-100">chevron_right</span>
                      }
                    </a>
                  }
                }
              </div>
            }
          </nav>
        </aside>

        <!-- Mobile Drawer Navigation -->
        @if (isMobileNavOpen()) {
          <div class="fixed inset-0 z-50 flex lg:hidden">
            <button type="button" aria-label="Close menu drawer" (click)="isMobileNavOpen.set(false)" class="fixed inset-0 bg-black/60 w-full h-full border-0"></button>
            <div class="relative w-72 gradient-brand text-slate-200 flex flex-col shadow-2xl z-10 overflow-y-auto">
              <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl gradient-accent text-white flex items-center justify-center">
                    <span class="material-icons text-base">school</span>
                  </div>
                  <span class="font-bold text-sm text-white">EduERP Navigation</span>
                </div>
                <button (click)="isMobileNavOpen.set(false)" class="text-slate-400 hover:text-white p-1">
                  <span class="material-icons">close</span>
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
                        [routerLinkActiveOptions]="{ exact: item.route === '/dashboard/overview' }"
                        class="w-full block py-2 px-3 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-2.5"
                      >
                        <span class="material-icons text-sm">{{ item.icon }}</span>
                        <span>{{ item.title }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Right-hand Scrollable Viewport (Independent Scroll with mt-auto Footer) -->
        <div class="flex-1 flex flex-col h-full overflow-y-auto min-h-0">
          <main class="flex-1 p-6 max-w-[1400px] mx-auto w-full">
            <router-outlet />
          </main>

        </div>
      </div>
    </div>
  `
})
export class AdminDashboardLayout implements OnInit {
  private readonly router = inject(Router);
  private readonly userService = inject(CurrentUserService);
  private readonly authSession = inject(AuthSessionService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly adminEmail = this.userService.userEmail;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const activeRole = this.userService.syncFromStorage();
      if (activeRole !== 'admin' && activeRole !== 'superadmin') {
        this.router.navigateByUrl(this.userService.getHomeRoute(activeRole));
      }
    }
  }

  protected readonly isSidebarCollapsed = signal<boolean>(false);
  protected readonly isMobileNavOpen = signal<boolean>(false);
  protected readonly isSessionDropdownOpen = signal<boolean>(false);
  protected readonly isProfileDropdownOpen = signal<boolean>(false);
  protected readonly isNotificationsOpen = signal<boolean>(false);
  protected readonly globalSearch = signal<string>('');

  protected readonly collapsedSections = signal<Record<string, boolean>>({
    'COMMUNICATION': true,
    'SYSTEM & SECURITY': true
  });

  protected readonly notificationService = inject(NotificationService);
  protected readonly unreadNotificationsCount = this.notificationService.unreadCount;
  protected readonly notifications = computed(() => {
    return this.notificationService.notifications().map(n => ({
      ...n,
      time: this.getRelativeTime(n.timestamp)
    }));
  });

  private getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  // All 8 Menu Groups from Section 3 of User Prompt
  protected readonly menuGroups: MenuSection[] = [
    {
      sectionTitle: 'OVERVIEW',
      icon: 'dashboard',
      items: [
        { title: 'Dashboard', icon: 'dashboard', route: '/admin/overview' },
        { title: 'Recent Activity', icon: 'history', route: '/admin/recent-activity' }
      ]
    },
    {
      sectionTitle: 'ACADEMIC MANAGEMENT',
      icon: 'school',
      items: [
        { title: 'Academic Years', icon: 'calendar_today', route: '/admin/academic-years' },
        { title: 'Departments', icon: 'account_balance', route: '/admin/departments' },
        { title: 'Courses & Programs', icon: 'menu_book', route: '/admin/courses' },
        { title: 'Semesters', icon: 'layers', route: '/admin/semesters' },
        { title: 'Sections & Batches', icon: 'group_work', route: '/admin/batches' },
        { title: 'Subjects', icon: 'library_books', route: '/admin/subjects' },
        { title: 'Subject Allocation', icon: 'assignment_turned_in', route: '/admin/subject-allocation' }
      ]
    },
    {
      sectionTitle: 'PEOPLE MANAGEMENT',
      icon: 'people',
      items: [
        { title: 'Students', icon: 'school', route: '/admin/students' },
        { title: 'Student Admissions', icon: 'person_add', route: '/admin/student-admissions' },
        { title: 'Faculty', icon: 'badge', route: '/admin/faculty' },
        { title: 'Parents', icon: 'family_restroom', route: '/admin/parents' },
        { title: 'User Accounts', icon: 'manage_accounts', route: '/admin/user-accounts' },
        { title: 'Roles & Permissions', icon: 'security', route: '/admin/roles-permissions' }
      ]
    },
    {
      sectionTitle: 'ACADEMIC OPERATIONS',
      icon: 'assignment',
      items: [
        { title: 'Attendance', icon: 'how_to_reg', route: '/admin/attendance' },
        { title: 'Examinations', icon: 'assignment', route: '/admin/examinations' },
        { title: 'Results & Grades', icon: 'grade', route: '/admin/results' },
        { title: 'Assignments', icon: 'assignment_late', route: '/admin/assignments' },
        { title: 'Timetable', icon: 'calendar_month', route: '/admin/timetable' }
      ]
    },
    {
      sectionTitle: 'FEES & FINANCE',
      icon: 'payments',
      items: [
        { title: 'Fee Structure', icon: 'account_balance_wallet', route: '/admin/fee-structure' },
        { title: 'Fee Collection', icon: 'payments', route: '/admin/fee-collection' },
        { title: 'Pending Fees', icon: 'pending_actions', route: '/admin/pending-fees' },
        { title: 'Payment History', icon: 'history_edu', route: '/admin/payment-history' },
        { title: 'Receipts', icon: 'receipt', route: '/admin/receipts' }
      ]
    },
    {
      sectionTitle: 'COMMUNICATION',
      icon: 'chat',
      items: [
        { title: 'Notices & Announcements', icon: 'campaign', route: '/admin/notices' },
        { title: 'Notifications', icon: 'notifications_active', route: '/admin/notifications' },
        { title: 'Message Center', icon: 'mail', route: '/admin/messages' }
      ]
    },
    {
      sectionTitle: 'ANALYTICS & REPORTS',
      icon: 'analytics',
      items: [
        { title: 'Analytics Overview', icon: 'analytics', route: '/admin/analytics-overview' },
        { title: 'Student Performance', icon: 'insights', route: '/admin/student-performance' },
        { title: 'Attendance Analytics', icon: 'bar_chart', route: '/admin/attendance-analytics' },
        { title: 'Examination Reports', icon: 'assessment', route: '/admin/exam-reports' },
        { title: 'Fee Reports', icon: 'request_quote', route: '/admin/fee-reports' },
        { title: 'Faculty Reports', icon: 'contact_page', route: '/admin/faculty-reports' }
      ]
    },
    {
      sectionTitle: 'SYSTEM & SECURITY',
      icon: 'settings',
      items: [
        { title: 'System Settings', icon: 'settings', route: '/admin/settings' },
        { title: 'Security Overview', icon: 'shield', route: '/admin/security' },
        { title: 'Audit Logs', icon: 'receipt_long', route: '/admin/audit-logs' },
        { title: 'Activity History', icon: 'manage_history', route: '/admin/activity-history' },
        { title: 'My Profile', icon: 'lock_outline', route: '/admin/profile' }
      ]
    }
  ];

  protected toggleSection(sectionTitle: string): void {
    this.collapsedSections.update(curr => ({
      ...curr,
      [sectionTitle]: !curr[sectionTitle]
    }));
  }

  protected markAllAsRead(): void {
    this.notificationService.markAllRead();
  }

  protected logout(): void {
    this.authSession.logoutBackend().subscribe(() => {
      this.userService.logout();
      this.router.navigate(['/admin/secure-login']);
    });
  }
}
