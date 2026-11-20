import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../services/notification.service';
import { CurrentUserService } from '../../services/current-user.service';
import { ChildContextService } from '../../services/child-context.service';
import { StudentsService } from '../../services/students.service';

interface NavCategory {
  category: string;
  items: {
    title: string;
    icon: string;
    route: string;
    badge?: string;
  }[];
}

@Component({
  selector: 'app-parent-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-900 overflow-hidden text-[13px]">

      <!-- Top Executive Navigation Bar -->
      <header class="bg-[#0F172A] text-white h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4 border-b border-white/10 shrink-0 z-30 shadow-md">
        
        <!-- Left: Brand & Mobile Toggle -->
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            (click)="isMobileNavOpen.set(!isMobileNavOpen())"
            aria-label="Toggle mobile navigation"
            class="lg:hidden text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <mat-icon class="text-xl">menu</mat-icon>
          </button>

          <a routerLink="/parent/dashboard" class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shrink-0 shadow-inner">
              <mat-icon class="text-white text-xl">family_restroom</mat-icon>
            </div>
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-bold text-lg tracking-tight text-white whitespace-nowrap">
                Edu<span class="text-indigo-400">ERP</span>
              </span>
              <span class="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border border-indigo-400/30">
                Parent Portal
              </span>
            </div>
          </a>
        </div>

        <!-- Center: Prominent Child Selector Card in Header (Desktop) -->
        <div class="relative hidden md:block">
          <button
            type="button"
            (click)="toggleChildSwitcher()"
            [disabled]="!canSwitchChild()"
            [attr.aria-label]="canSwitchChild() ? 'Switch selected child' : 'Linked child'"
            [title]="canSwitchChild() ? 'Click to switch child' : 'Linked child'"
            class="flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-left transition-all cursor-pointer shadow-sm group"
          >
            <div class="w-8 h-8 rounded-lg gradient-accent text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
              {{ selectedChild()?.initials || '--' }}
            </div>
            <div class="min-w-0 max-w-[220px]">
              <div class="flex items-center gap-1.5">
                <p class="text-xs font-bold text-white leading-tight truncate">
                  {{ selectedChild()?.name || 'No Child Selected' }}
                </p>
                @if (canSwitchChild()) {
                  <mat-icon class="text-xs text-indigo-300 group-hover:translate-y-0.5 transition-transform">expand_more</mat-icon>
                }
              </div>
              <p class="text-[11px] text-slate-300 leading-tight truncate">
                {{ selectedChild()?.course || 'Unlinked' }} · {{ selectedChild()?.section || '' }}
              </p>
            </div>
          </button>

          @if (isChildSwitcherOpen() && canSwitchChild()) {
            <button
              type="button"
              aria-label="Close child switcher"
              (click)="isChildSwitcherOpen.set(false)"
              class="fixed inset-0 z-40 w-full h-full bg-transparent border-0 cursor-default"
            ></button>
            <div class="absolute left-0 mt-2 w-72 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div class="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Select Child Student</span>
                <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full">{{ linkedChildren().length }} Linked</span>
              </div>
              <div class="py-1">
                @for (child of linkedChildren(); track child.id) {
                  @let isActive = selectedChild()?.id === child.id;
                  <button
                    type="button"
                    (click)="selectChild(child.id)"
                    class="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    [class]="isActive ? 'bg-indigo-50/90 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 rounded-lg gradient-brand text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                        {{ child.initials }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-bold truncate">{{ child.name }}</p>
                        <p class="text-[11px] text-slate-500 truncate">{{ child.course }} · {{ child.section }}</p>
                      </div>
                    </div>
                    @if (isActive) {
                      <mat-icon class="text-base text-indigo-600 shrink-0">check_circle</mat-icon>
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Right: Notifications & Profile -->
        <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">

          <!-- Notification Bell -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleNotifications()"
              aria-label="View notifications"
              title="Notifications"
              class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-white/10 relative shadow-sm"
            >
              <mat-icon class="text-lg">notifications</mat-icon>
              @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
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
              <div class="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-80 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 p-3.5 z-50">
                <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span class="font-bold text-[13px] text-slate-900">Parent Notifications</span>
                  <button
                    type="button"
                    (click)="markAllAsRead()"
                    class="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>
                <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-1">
                  @for (n of notifications(); track n.id) {
                    <button
                      type="button"
                      (click)="openNotification(n.id, n.link)"
                      class="w-full text-left py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div class="flex items-start gap-2.5">
                        <mat-icon class="text-base text-indigo-600 mt-0.5 shrink-0">{{ n.icon || 'notifications' }}</mat-icon>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-2">
                            <p class="font-semibold text-slate-900 text-xs truncate">{{ n.title }}</p>
                            @if (!n.isRead) {
                              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
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

          <!-- Parent Profile Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleProfile()"
              aria-label="Open parent profile menu"
              class="flex items-center gap-2 pl-1.5 py-1 pr-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer shadow-sm"
            >
              <div class="w-8 h-8 rounded-lg gradient-accent text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {{ currentParent().initials || 'PR' }}
              </div>
              <div class="hidden xl:block text-left">
                <p class="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">{{ currentParent().name || 'Parent' }}</p>
                <p class="text-[10px] text-indigo-300 font-medium">{{ currentParent().relation || 'Guardian' }}</p>
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
              <div class="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-64 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50">
                <div class="px-4 py-3 border-b border-slate-100 space-y-0.5">
                  <p class="font-bold text-[13px] text-slate-900 truncate">{{ currentParent().name || 'Parent' }}</p>
                  <p class="text-[11px] text-slate-500 truncate">{{ currentParent().email || userService.userEmail() }}</p>
                  <p class="text-[11px] text-indigo-600 font-medium">
                    {{ linkedChildren().length }} {{ linkedChildren().length === 1 ? 'Linked Child' : 'Linked Children' }}
                  </p>
                </div>

                <a
                  routerLink="/parent/my-profile"
                  (click)="isProfileDropdownOpen.set(false)"
                  class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 text-slate-900 hover:text-indigo-600 text-xs font-medium cursor-pointer"
                >
                  <mat-icon class="text-base text-indigo-600">person</mat-icon>
                  <span>My Profile</span>
                </a>
                <a
                  routerLink="/parent/security"
                  (click)="isProfileDropdownOpen.set(false)"
                  class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 text-slate-900 hover:text-indigo-600 text-xs font-medium cursor-pointer"
                >
                  <mat-icon class="text-base text-indigo-600">security</mat-icon>
                  <span>Security & Sessions</span>
                </a>
                <a
                  routerLink="/parent/helpdesk"
                  (click)="isProfileDropdownOpen.set(false)"
                  class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 text-slate-900 hover:text-indigo-600 text-xs font-medium cursor-pointer"
                >
                  <mat-icon class="text-base text-indigo-600">support_agent</mat-icon>
                  <span>Helpdesk & Support</span>
                </a>
                <div class="border-t border-slate-100 my-1"></div>
                <button
                  type="button"
                  (click)="logout()"
                  class="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer"
                >
                  <mat-icon class="text-base">logout</mat-icon>
                  <span>Sign Out</span>
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Desktop Executive Navigation Bar (Horizontal Tabbed Suite) -->
      <nav class="bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-2 hidden lg:flex items-center justify-between gap-4 shrink-0 shadow-xs z-20 overflow-x-auto">
        <div class="flex items-center gap-1 min-w-max">
          @for (item of allNavItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-indigo-600 text-white font-semibold shadow-sm"
              [routerLinkActiveOptions]="{ exact: item.route === '/parent/dashboard' }"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer text-xs font-medium"
            >
              <mat-icon class="text-base">{{ item.icon }}</mat-icon>
              <span>{{ item.title }}</span>
            </a>
          }
        </div>

        <!-- Quick Jump Search -->
        <div class="relative w-56 xl:w-64">
          <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-xs">search</mat-icon>
          </span>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            (focus)="isSearchOpen.set(true)"
            placeholder="Quick jump..."
            aria-label="Search parent sections"
            class="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-slate-900 placeholder-slate-400 rounded-lg pl-8 pr-6 py-1 text-xs transition-all border border-transparent focus:border-indigo-600 focus:outline-none"
          />
          @if (searchQuery()) {
            <button
              type="button"
              (click)="searchQuery.set(''); isSearchOpen.set(false)"
              aria-label="Clear search"
              class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <mat-icon class="text-xs">close</mat-icon>
            </button>
          }

          @if (isSearchOpen() && searchQuery().trim().length > 0) {
            <div class="absolute top-full right-0 mt-1.5 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200/90 py-1 z-50">
              @for (match of searchResults(); track match.route) {
                <button
                  type="button"
                  (click)="navigateFromSearch(match.route)"
                  class="w-full text-left px-3 py-2 hover:bg-indigo-50/70 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <mat-icon class="text-sm text-indigo-600">{{ match.icon }}</mat-icon>
                  <span class="text-xs font-medium text-slate-900">{{ match.title }}</span>
                </button>
              } @empty {
                <p class="px-3 py-2 text-xs text-slate-500">No matching section.</p>
              }
            </div>
          }
        </div>
      </nav>

      <!-- Beautiful Executive Mobile Drawer (Full Redesign) -->
      @if (isMobileNavOpen()) {
        <div class="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation drawer"
            (click)="isMobileNavOpen.set(false)"
            class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs w-full h-full border-0 transition-opacity"
          ></button>
          
          <div class="relative w-80 max-w-[85vw] gradient-brand text-slate-200 flex flex-col z-10 overflow-y-auto shadow-2xl h-full border-r border-white/10">
            
            <!-- Drawer Executive Top Header -->
            <div class="p-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg gradient-accent text-white flex items-center justify-center shadow-inner">
                  <mat-icon class="text-sm">family_restroom</mat-icon>
                </div>
                <div>
                  <p class="font-bold text-sm leading-tight">Edu<span class="text-indigo-400">ERP</span></p>
                  <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Parent Hub</p>
                </div>
              </div>
              <button
                type="button"
                (click)="isMobileNavOpen.set(false)"
                aria-label="Close drawer"
                class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <!-- Sleek Child Selector Card in Mobile Drawer -->
            <div class="p-3.5 bg-white/5 border-b border-white/10 shrink-0 space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Child</span>
                <span class="text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  {{ selectedChild()?.enrollmentNo }}
                </span>
              </div>

              <!-- Active Child Profile Card -->
              <div class="p-3 bg-white/10 rounded-xl border border-white/15 shadow-xs flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl gradient-accent text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                  {{ selectedChild()?.initials || '--' }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-white truncate">{{ selectedChild()?.name || 'No Student Selected' }}</p>
                  <p class="text-[11px] text-slate-300 truncate">{{ selectedChild()?.course }} · {{ selectedChild()?.semester }}</p>
                  <p class="text-[10px] text-indigo-300">Section {{ selectedChild()?.section }}</p>
                </div>
              </div>

              <!-- Multi-child segmented switcher -->
              @if (canSwitchChild()) {
                <div class="space-y-1 pt-1">
                  <p class="text-[10px] font-semibold text-slate-400">Switch Linked Child:</p>
                  <div class="grid grid-cols-2 gap-1.5">
                    @for (child of linkedChildren(); track child.id) {
                      @let isActive = selectedChild()?.id === child.id;
                      <button
                        type="button"
                        (click)="selectChild(child.id)"
                        class="p-2 rounded-lg text-left transition-all border text-xs cursor-pointer flex items-center gap-2 min-w-0"
                        [class]="isActive
                          ? 'bg-[#6D42E8] text-white border-[#6D42E8] font-bold shadow-xs'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'"
                      >
                        <span class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                              [class]="isActive ? 'bg-white text-[#6D42E8]' : 'bg-white/10 text-slate-300'">
                          {{ child.initials }}
                        </span>
                        <span class="truncate text-[11px]">{{ child.name.split(' ')[0] }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Grouped Drawer Navigation -->
            <nav class="flex-1 p-3.5 space-y-4 overflow-y-auto">
              @for (category of navCategories; track category.category) {
                <div class="space-y-1">
                  <p class="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ category.category }}</p>
                  @for (item of category.items; track item.route) {
                    <a
                      [routerLink]="item.route"
                      (click)="isMobileNavOpen.set(false)"
                      routerLinkActive="bg-indigo-600 text-white font-semibold shadow-xs"
                      [routerLinkActiveOptions]="{ exact: item.route === '/parent/dashboard' }"
                      class="w-full py-2.5 px-3 rounded-xl hover:bg-white/10 text-slate-300 flex items-center justify-between transition-colors group cursor-pointer"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        <mat-icon class="text-base text-slate-400 group-hover:text-white group-[.font-semibold]:text-white">{{ item.icon }}</mat-icon>
                        <span class="text-xs">{{ item.title }}</span>
                      </div>
                      @if (item.badge) {
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-200 font-bold group-[.font-semibold]:bg-white/20 group-[.font-semibold]:text-white">
                          {{ item.badge }}
                        </span>
                      }
                    </a>
                  }
                </div>
              }
            </nav>

            <!-- Drawer Footer Profile -->
            <div class="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-lg gradient-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {{ currentParent().initials || 'PR' }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-white truncate">{{ currentParent().name }}</p>
                  <p class="text-[10px] text-slate-400 truncate">{{ currentParent().email }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="logout()"
                aria-label="Logout"
                class="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <mat-icon class="text-base">logout</mat-icon>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Main Workspace Outlet -->
      <div class="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden min-h-0 min-w-0 bg-[#F8FAFC]">
        <main class="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-[1500px] mx-auto w-full min-w-0">
          <router-outlet />
        </main>
      </div>

      <!-- Toast Feedback -->
      @if (studentsService.toasts().length > 0) {
        <div class="fixed bottom-4 left-4 right-4 sm:left-auto z-50 space-y-2 sm:max-w-xs sm:w-full pointer-events-none">
          @for (toast of studentsService.toasts(); track toast.id) {
            <div class="pointer-events-auto bg-white border border-slate-200/90 rounded-2xl shadow-lg p-3.5 flex items-start justify-between gap-2 text-xs text-slate-900">
              <div class="flex items-start gap-2.5">
                <mat-icon class="text-base text-indigo-600 shrink-0">check_circle</mat-icon>
                <span class="leading-snug font-medium">{{ toast.text }}</span>
              </div>
              <button
                type="button"
                (click)="studentsService.removeToast(toast.id)"
                aria-label="Dismiss notification"
                class="text-slate-400 hover:text-slate-700 cursor-pointer"
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
export class ParentLayout implements OnInit {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly userService = inject(CurrentUserService);
  protected readonly childContext = inject(ChildContextService);
  protected readonly studentsService = inject(StudentsService);
  protected readonly notificationService = inject(NotificationService);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const activeRole = this.userService.syncFromStorage();
      if (activeRole !== 'parent') {
        this.router.navigateByUrl(this.userService.getHomeRoute(activeRole));
      }
    }
  }

  protected readonly isMobileNavOpen = signal<boolean>(false);
  protected readonly isProfileDropdownOpen = signal<boolean>(false);
  protected readonly isNotificationsOpen = signal<boolean>(false);
  protected readonly isChildSwitcherOpen = signal<boolean>(false);
  protected readonly isSearchOpen = signal<boolean>(false);
  protected readonly searchQuery = signal<string>('');

  protected readonly currentParent = this.childContext.currentParent;
  protected readonly linkedChildren = this.childContext.linkedChildren;
  protected readonly selectedChild = this.childContext.selectedChild;
  protected readonly canSwitchChild = computed(() => this.linkedChildren().length > 1);

  protected readonly notifications = computed(() => {
    const childId = this.selectedChild()?.id;
    return this.notificationService.notifications().filter(n => {
      if (!n.targetRole) return true;
      if (n.targetRole === 'student') {
        return !n.targetStudentId || (!!childId && n.targetStudentId === childId);
      }
      return false;
    });
  });

  protected readonly unreadNotificationsCount = computed(
    () => this.notifications().filter(n => !n.isRead).length
  );

  protected readonly navCategories: NavCategory[] = [
    {
      category: 'Overview',
      items: [
        { title: 'Dashboard', icon: 'dashboard', route: '/parent/dashboard' },
        { title: 'My Children', icon: 'family_restroom', route: '/parent/my-children' }
      ]
    },
    {
      category: 'Academics & Schedule',
      items: [
        { title: 'Attendance', icon: 'how_to_reg', route: '/parent/attendance' },
        { title: 'Timetable', icon: 'calendar_month', route: '/parent/timetable' },
        { title: 'Assignments', icon: 'assignment_late', route: '/parent/assignments' }
      ]
    },
    {
      category: 'Assessment & Grades',
      items: [
        { title: 'Exams', icon: 'event_note', route: '/parent/exams' },
        { title: 'Results', icon: 'grade', route: '/parent/results' },
        { title: 'Reports', icon: 'analytics', route: '/parent/reports' }
      ]
    },
    {
      category: 'Finance & Connect',
      items: [
        { title: 'Fees & Receipts', icon: 'account_balance_wallet', route: '/parent/fees' },
        { title: 'Notices', icon: 'campaign', route: '/parent/notices' },
        { title: 'Messages', icon: 'mail', route: '/parent/message-center' }
      ]
    },
    {
      category: 'Support & Account',
      items: [
        { title: 'Helpdesk', icon: 'support_agent', route: '/parent/helpdesk' },
        { title: 'My Profile', icon: 'person', route: '/parent/my-profile' },
        { title: 'Security & Sessions', icon: 'security', route: '/parent/security' }
      ]
    }
  ];

  protected readonly allNavItems = computed(() => {
    return this.navCategories.flatMap(c => c.items);
  });

  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.allNavItems().filter(item => item.title.toLowerCase().includes(q)).slice(0, 6);
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

  protected toggleChildSwitcher(): void {
    if (!this.canSwitchChild()) return;
    this.isNotificationsOpen.set(false);
    this.isProfileDropdownOpen.set(false);
    this.isChildSwitcherOpen.update(v => !v);
  }

  protected selectChild(studentId: string): void {
    this.childContext.selectChild(studentId);
    this.isChildSwitcherOpen.set(false);
  }

  protected toggleNotifications(): void {
    this.isChildSwitcherOpen.set(false);
    this.isProfileDropdownOpen.set(false);
    this.isNotificationsOpen.update(v => !v);
  }

  protected toggleProfile(): void {
    this.isChildSwitcherOpen.set(false);
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
