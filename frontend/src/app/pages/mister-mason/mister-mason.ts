import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MisterMasonService, ServiceRequest } from '../../services/mister-mason.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-mister-mason',
  imports: [RouterLink, FormsModule],
  template: `
    <div [class]="activeTheme() === 'midnight' ? 'theme-midnight' : 'theme-mason'" class="min-h-screen flex flex-col font-sans bg-[#F4F6F9] text-[#1E293B]">
      
      <!-- Top Project Switcher & MCA Project Indicator Banner -->
      <div class="bg-[#0b1325] text-slate-300 text-xs py-2 px-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 z-40">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 text-[11px]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            MCA Major Project • Project 2
          </span>
          <span class="hidden sm:inline text-slate-400">|</span>
          <span class="text-white font-medium">MisterMason.in — Enterprise Facility & Material Management ERP</span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Theme Switcher -->
          <div class="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg text-[11px]">
            <button
              (click)="activeTheme.set('midnight')"
              [class]="activeTheme() === 'midnight' ? 'bg-[#6D42E8] text-white font-semibold' : 'text-slate-300 hover:text-white'"
              class="px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
            >
              <span class="material-icons text-xs">palette</span> Midnight + Aurora
            </button>
            <button
              (click)="activeTheme.set('mason')"
              [class]="activeTheme() === 'mason' ? 'bg-[#009661] text-white font-semibold' : 'text-slate-300 hover:text-white'"
              class="px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
            >
              <span class="material-icons text-xs">palette</span> Mason Emerald
            </button>
          </div>

          <!-- Link back to Project 1: EduERP -->
          <a
            routerLink="/dashboard"
            class="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#6D42E8] to-[#D946EF] text-white px-3 py-1 rounded-lg font-bold text-xs hover:opacity-95 shadow-sm transition-all cursor-pointer"
          >
            <span class="material-icons text-xs">school</span>
            <span>Switch to EduERP (Project 1)</span>
          </a>
        </div>
      </div>

      <!-- Main Enterprise Top Navbar (MisterMason.in) -->
      <header class="bg-[#0c182b] text-white h-16 px-4 lg:px-6 flex items-center justify-between border-b border-slate-700/60 sticky top-0 z-30 shadow-md">
        <!-- Left: Brand Logo & Tagline -->
        <div class="flex items-center gap-4">
          <button (click)="isMobileNavOpen.set(!isMobileNavOpen())" class="lg:hidden text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
            <span class="material-icons text-xl">menu</span>
          </button>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#009661] to-[#059669] flex items-center justify-center shadow-md">
              <span class="material-icons text-white text-2xl">construction</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-lg tracking-tight text-white">Mister<span class="text-[#34d399]">Mason</span><span class="text-xs text-slate-300 font-normal">.in</span></span>
              </div>
              <p class="text-[10px] text-slate-400 -mt-1 hidden sm:block tracking-wide">Supplies of Men, Material & Machine</p>
            </div>
          </div>

          <!-- Designs Dropdown -->
          <div class="relative hidden md:block">
            <button
              (click)="isDesignsDropdownOpen.set(!isDesignsDropdownOpen())"
              class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 transition-colors cursor-pointer"
            >
              <span class="material-icons text-sm text-emerald-400">check</span>
              <span>Designs</span>
              <span class="material-icons text-xs">arrow_drop_down</span>
            </button>
            @if (isDesignsDropdownOpen()) {
              <div class="absolute left-0 mt-1 w-52 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <a href="#designs" (click)="isDesignsDropdownOpen.set(false)" class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><span class="material-icons text-sm text-slate-500">architecture</span> Architectural Blueprints</a>
                <a href="#structural" (click)="isDesignsDropdownOpen.set(false)" class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><span class="material-icons text-sm text-slate-500">foundation</span> Structural Plans</a>
                <a href="#mep" (click)="isDesignsDropdownOpen.set(false)" class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><span class="material-icons text-sm text-slate-500">electrical_services</span> MEP Schematics</a>
              </div>
            }
          </div>
        </div>

        <!-- Right: Actions & User Info -->
        <div class="flex items-center gap-3">
          <button
            (click)="openMaterialModal()"
            class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <span class="material-icons text-sm text-blue-400">request_quote</span>
            <span>Customer Quote Requests</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#009661] to-[#059669] text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all cursor-pointer"
          >
            <span class="material-icons text-sm">dashboard</span>
            <span>My Dashboard</span>
          </button>

          <!-- User Pill Profile -->
          <div class="flex items-center gap-2.5 pl-3 border-l border-slate-700/80">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 p-0.5 shrink-0 shadow-sm">
              <div class="w-full h-full rounded-full bg-[#0c182b] flex items-center justify-center text-xs font-bold text-white">
                R
              </div>
            </div>
            <div class="hidden xl:block text-left">
              <p class="text-xs font-bold text-white leading-tight">rose&#64;yopmail.com</p>
              <p class="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">CUSTOMER</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Center Container: Sidebar + Content -->
      <div class="flex-1 flex min-h-0">
        
        <!-- Collapsible White Left Sidebar -->
        <aside
          [class]="isSidebarCollapsed() ? 'w-20' : 'w-68'"
          class="bg-white border-r border-slate-200 flex flex-col shadow-xs transition-all duration-300 shrink-0 hidden lg:flex select-none"
        >
          <!-- Sidebar Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span class="material-icons text-base">person</span>
              </div>
              @if (!isSidebarCollapsed()) {
                <div class="truncate">
                  <h3 class="font-extrabold text-xs text-[#0f172a] uppercase tracking-wide truncate">CUSTOMER PANEL</h3>
                  <span class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">ONLINE PANEL</span>
                </div>
              }
            </div>
            <button
              (click)="isSidebarCollapsed.set(!isSidebarCollapsed())"
              title="Toggle Sidebar"
              class="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span class="material-icons text-base">{{ isSidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</span>
            </button>
          </div>

          <!-- Navigation Menu Links -->
          <nav class="flex-1 p-3 space-y-1.5 overflow-y-auto text-xs font-medium text-slate-600">
            @if (!isSidebarCollapsed()) {
              <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                OVERVIEW
              </div>
            }

            <!-- Active Dashboard Link -->
            <a
              href="#dashboard"
              (click)="$event.preventDefault()"
              [class]="activeTheme() === 'midnight' ? 'bg-[#6D42E8] text-white shadow-sm' : 'bg-[#009661] text-white shadow-sm'"
              class="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer"
              [title]="isSidebarCollapsed() ? 'Dashboard' : ''"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg">dashboard</span>
                @if (!isSidebarCollapsed()) {
                  <span>Dashboard</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm opacity-80">chevron_right</span>
              }
            </a>

            <!-- My Profile -->
            <button
              (click)="activeNav.set('profile')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">person_outline</span>
                @if (!isSidebarCollapsed()) {
                  <span>My Profile</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>

            <!-- Material Req Management (Accordion) -->
            <div>
              <button
                (click)="isMaterialMenuOpen.set(!isMaterialMenuOpen())"
                class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <span class="material-icons text-lg text-slate-400">inventory_2</span>
                  @if (!isSidebarCollapsed()) {
                    <span class="font-semibold text-slate-800">Material Req Management</span>
                  }
                </div>
                @if (!isSidebarCollapsed()) {
                  <span class="material-icons text-sm text-slate-400">{{ isMaterialMenuOpen() ? 'expand_less' : 'expand_more' }}</span>
                }
              </button>
              @if (isMaterialMenuOpen() && !isSidebarCollapsed()) {
                <div class="pl-8 pr-2 py-1 space-y-1">
                  <button
                    (click)="activeTab.set('materials'); scrollToSection('requests-table')"
                    class="w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center gap-2 cursor-pointer"
                  >
                    <span class="material-icons text-xs text-slate-400">menu</span>
                    <span>Material Request Report</span>
                  </button>
                  <button
                    (click)="openMaterialModal()"
                    class="w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center gap-2 cursor-pointer"
                  >
                    <span class="material-icons text-xs text-slate-400">post_add</span>
                    <span>Get Quote Request</span>
                  </button>
                </div>
              }
            </div>

            <!-- Submit Service Request -->
            <button
              (click)="openServiceModal()"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">send</span>
                @if (!isSidebarCollapsed()) {
                  <span>Submit Service Request</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>

            <!-- Show Service Request -->
            <button
              (click)="scrollToSection('requests-table')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">folder_open</span>
                @if (!isSidebarCollapsed()) {
                  <span>Show Service Request</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>

            <!-- Quotation Report -->
            <button
              (click)="openSampleQuotation()"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">description</span>
                @if (!isSidebarCollapsed()) {
                  <span>Quotation Report</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>

            <!-- Expected Delivery Date -->
            <button
              (click)="activeNav.set('delivery')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">calendar_today</span>
                @if (!isSidebarCollapsed()) {
                  <span>Expected Delivery Date</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>

            <!-- Work Order Management (Accordion) -->
            <div>
              <button
                (click)="isWorkOrderMenuOpen.set(!isWorkOrderMenuOpen())"
                class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <span class="material-icons text-lg text-slate-400">assignment</span>
                  @if (!isSidebarCollapsed()) {
                    <span class="font-semibold text-slate-800">Work Order Management</span>
                  }
                </div>
                @if (!isSidebarCollapsed()) {
                  <span class="material-icons text-sm text-slate-400">{{ isWorkOrderMenuOpen() ? 'expand_less' : 'expand_more' }}</span>
                }
              </button>
              @if (isWorkOrderMenuOpen() && !isSidebarCollapsed()) {
                <div class="pl-8 pr-2 py-1 space-y-1">
                  <button class="w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center gap-2 cursor-pointer">
                    <span class="material-icons text-xs text-slate-400">assignment_turned_in</span>
                    <span>Active Work Orders</span>
                  </button>
                  <button class="w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center gap-2 cursor-pointer">
                    <span class="material-icons text-xs text-slate-400">groups</span>
                    <span>Worker Allocation</span>
                  </button>
                </div>
              }
            </div>

            <!-- Assets -->
            <button
              (click)="activeNav.set('assets')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">business</span>
                @if (!isSidebarCollapsed()) {
                  <span>Show Assets</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>

            <!-- Update Password -->
            <button
              (click)="activeNav.set('password')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <span class="material-icons text-lg text-slate-400">lock_outline</span>
                @if (!isSidebarCollapsed()) {
                  <span>Update Password</span>
                }
              </div>
              @if (!isSidebarCollapsed()) {
                <span class="material-icons text-sm text-slate-400">chevron_right</span>
              }
            </button>
          </nav>
        </aside>

        <!-- Mobile Drawer Navigation -->
        @if (isMobileNavOpen()) {
          <div class="fixed inset-0 z-50 flex lg:hidden">
            <button type="button" aria-label="Close menu" (click)="isMobileNavOpen.set(false)" class="fixed inset-0 bg-black/60 w-full h-full border-0"></button>
            <div class="relative w-72 bg-white text-slate-800 flex flex-col shadow-2xl z-10 overflow-y-auto">
              <div class="p-4 border-b border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <span class="material-icons text-lg">construction</span>
                  </div>
                  <span class="font-bold text-sm">MisterMason.in</span>
                </div>
                <button (click)="isMobileNavOpen.set(false)" class="text-slate-500 hover:text-slate-800 p-1">
                  <span class="material-icons">close</span>
                </button>
              </div>
              <div class="p-3 space-y-1">
                <button (click)="openServiceModal(); isMobileNavOpen.set(false)" class="w-full text-left p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold flex items-center gap-2.5">
                  <span class="material-icons text-emerald-600">add_task</span> Book a Service
                </button>
                <button (click)="openMaterialModal(); isMobileNavOpen.set(false)" class="w-full text-left p-2.5 rounded-lg bg-blue-50 text-blue-800 font-bold flex items-center gap-2.5">
                  <span class="material-icons text-blue-600">inventory_2</span> Request Materials
                </button>
                <a routerLink="/dashboard" class="w-full block p-2.5 rounded-lg bg-purple-50 text-purple-800 font-bold flex items-center gap-2.5">
                  <span class="material-icons text-purple-600">school</span> Switch to EduERP
                </a>
              </div>
            </div>
          </div>
        }

        <!-- Main Workspace Body -->
        <main class="flex-1 p-4 lg:p-6 overflow-y-auto max-w-[1600px] mx-auto w-full space-y-6">

          <!-- 1. Good Evening User Greeting Banner (Exact Dark Glass Card from Image) -->
          <div [class]="activeTheme() === 'midnight' ? 'gradient-brand text-white border-white/10' : 'bg-[#0f172a] text-white border-slate-700/60'" class="rounded-2xl p-6 border shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <span class="material-icons text-2xl">person</span>
              </div>
              <div>
                <h1 class="text-xl lg:text-2xl font-extrabold tracking-tight">
                  Good evening, <span class="text-emerald-400">{{ customer().email }}</span>
                </h1>
                <p class="text-xs text-slate-300 mt-1">Your requests and customer tools at a glance.</p>
                <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-mono text-slate-200">
                  <span class="text-slate-400">Customer ID:</span>
                  <span class="font-bold text-white tracking-wide">{{ customer().customerId }}</span>
                  <button (click)="copyCustomerId()" title="Copy ID" class="hover:text-emerald-300 cursor-pointer">
                    <span class="material-icons text-xs">content_copy</span>
                  </button>
                  @if (copied()) {
                    <span class="text-emerald-400 text-[10px]">Copied!</span>
                  }
                </div>
              </div>
            </div>

            <!-- Banner Action Buttons -->
            <div class="flex items-center gap-3 shrink-0">
              <button
                (click)="openServiceModal()"
                class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#009661] to-[#059669] hover:opacity-95 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span class="material-icons text-base">add_circle</span>
                <span>Book a Service</span>
              </button>

              <button
                (click)="openMaterialModal()"
                class="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-600/80 shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <span class="material-icons text-base text-blue-400">local_shipping</span>
                <span>Request Materials</span>
              </button>

              <button
                (click)="refreshData()"
                title="Refresh customer data"
                class="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              >
                <span [class.animate-spin]="isRefreshing()" class="material-icons text-lg">sync</span>
              </button>
            </div>
          </div>

          <!-- 2. Four KPI Metric Cards with Colored Top Border Tabs (Exact Match to Image) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            
            <!-- Card 1: SERVICE REQUESTS (Blue Top Tab) -->
            <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between border-t-4 border-t-blue-500">
              <div>
                <div class="flex items-center justify-between">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <span class="material-icons text-lg">folder_shared</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700">
                    ALL TIME
                  </span>
                </div>
                <div class="mt-4">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">SERVICE REQUESTS</p>
                  <h3 class="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{{ serviceRequests().length }}</h3>
                </div>
              </div>
              <a href="#requests-table" (click)="activeTab.set('all')" class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                <span>Bookings logged on your account</span>
                <span class="material-icons text-sm">arrow_forward</span>
              </a>
            </div>

            <!-- Card 2: PENDING REQUESTS (Amber Top Tab) -->
            <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between border-t-4 border-t-amber-500">
              <div>
                <div class="flex items-center justify-between">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <span class="material-icons text-lg">warning_amber</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700">
                    NEEDS ATTENTION
                  </span>
                </div>
                <div class="mt-4">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">PENDING REQUESTS</p>
                  <h3 class="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{{ pendingCount() }}</h3>
                </div>
              </div>
              <a href="#requests-table" (click)="activeTab.set('pending')" class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-amber-600 transition-colors">
                <span>Awaiting review or assignment</span>
                <span class="material-icons text-sm">arrow_forward</span>
              </a>
            </div>

            <!-- Card 3: MATERIAL REQUESTS (Green Top Tab) -->
            <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between border-t-4 border-t-emerald-500">
              <div>
                <div class="flex items-center justify-between">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <span class="material-icons text-lg">category</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700">
                    MATERIALS
                  </span>
                </div>
                <div class="mt-4">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">MATERIAL REQUESTS</p>
                  <h3 class="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{{ materialRequests().length }}</h3>
                </div>
              </div>
              <button (click)="openMaterialModal()" class="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer text-left">
                <span>Material request headers</span>
                <span class="material-icons text-sm">arrow_forward</span>
              </button>
            </div>

            <!-- Card 4: WORK ORDERS (Cyan/Blue Top Tab) -->
            <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between border-t-4 border-t-cyan-500">
              <div>
                <div class="flex items-center justify-between">
                  <div class="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <span class="material-icons text-lg">fact_check</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-50 text-cyan-700">
                    WORK ORDERS
                  </span>
                </div>
                <div class="mt-4">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">WORK ORDERS</p>
                  <h3 class="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">0</h3>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Work order headers returned</span>
                <span class="material-icons text-sm">arrow_forward</span>
              </div>
            </div>
          </div>

          <!-- 3. Service Request Status Card (4 Columns Breakdown) -->
          <div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span class="material-icons text-lg">tune</span>
                </div>
                <div>
                  <h3 class="font-extrabold text-sm text-[#0f172a]">Service Request Status</h3>
                  <p class="text-xs text-slate-500">Status breakdown for the currently loaded page of requests</p>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {{ serviceRequests().length }} requests loaded
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Item 1: New or Pending -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <span class="material-icons text-sm text-amber-500">schedule</span>
                  <span>New or Pending</span>
                </div>
                <h4 class="text-lg font-bold text-slate-900 mt-2">{{ pendingCount() }}</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">requests awaiting action</p>
              </div>

              <!-- Item 2: In Progress -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <span class="material-icons text-sm text-blue-500">handyman</span>
                  <span>In Progress</span>
                </div>
                <h4 class="text-lg font-bold text-slate-900 mt-2">{{ inProgressCount() }}</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">requests being handled</p>
              </div>

              <!-- Item 3: Completed -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <span class="material-icons text-sm text-emerald-500">check_circle_outline</span>
                  <span>Completed</span>
                </div>
                <h4 class="text-lg font-bold text-slate-900 mt-2">{{ completedCount() }}</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">completed or closed</p>
              </div>

              <!-- Item 4: Other or Unknown -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <span class="material-icons text-sm text-slate-400">info_outline</span>
                  <span>Other or Unknown</span>
                </div>
                <h4 class="text-lg font-bold text-slate-900 mt-2">0</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">with other or missing status</p>
              </div>
            </div>
          </div>

          <!-- 4. Recent Service Requests Data Table (Exact Match to Image) -->
          <div id="requests-table" class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <!-- Header Strip -->
            <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span class="material-icons text-lg">format_list_bulleted</span>
                </div>
                <div>
                  <h3 class="font-extrabold text-sm text-[#0f172a]">Recent Service Requests</h3>
                  <p class="text-xs text-slate-500">Search, filter, and review your latest bookings</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  {{ filteredRequests().length }} total
                </span>
                <button (click)="activeTab.set('all'); searchQuery.set('')" class="text-xs font-bold text-[#009661] hover:underline flex items-center gap-1 cursor-pointer">
                  <span>View all</span>
                  <span class="material-icons text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Filter Tabs & Live Search Bar -->
            <div class="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <!-- Filter Segment Tabs -->
              <div class="flex items-center gap-1.5 overflow-x-auto">
                <button
                  (click)="activeTab.set('all')"
                  [class]="activeTab() === 'all' ? 'bg-[#0f172a] text-white font-bold shadow-xs' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'"
                  class="px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>All</span>
                  <span class="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">{{ serviceRequests().length }}</span>
                </button>

                <button
                  (click)="activeTab.set('pending')"
                  [class]="activeTab() === 'pending' ? 'bg-[#0f172a] text-white font-bold' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'"
                  class="px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                >
                  Pending
                </button>

                <button
                  (click)="activeTab.set('inprogress')"
                  [class]="activeTab() === 'inprogress' ? 'bg-[#0f172a] text-white font-bold' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'"
                  class="px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                >
                  In Progress
                </button>

                <button
                  (click)="activeTab.set('completed')"
                  [class]="activeTab() === 'completed' ? 'bg-[#0f172a] text-white font-bold' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'"
                  class="px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                >
                  Completed
                </button>
              </div>

              <!-- Search Input -->
              <div class="relative w-full md:w-80">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span class="material-icons text-sm">search</span>
                </span>
                <input
                  type="text"
                  placeholder="Search by ID, service, or location"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  class="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009661]/30 focus:border-[#009661]"
                />
              </div>
            </div>

            <!-- Table of Requests -->
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-100/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th class="py-3.5 px-5">REQUEST</th>
                    <th class="py-3.5 px-5">SERVICE</th>
                    <th class="py-3.5 px-5">LOCATION</th>
                    <th class="py-3.5 px-5">DATE</th>
                    <th class="py-3.5 px-5">STATUS</th>
                    <th class="py-3.5 px-5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  @for (req of filteredRequests(); track req.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <!-- Request ID in Blue Badge -->
                      <td class="py-4 px-5">
                        <span class="px-2.5 py-1 rounded bg-blue-100/90 text-blue-700 font-mono font-bold text-[11px] border border-blue-200 shadow-2xs">
                          {{ req.id }}
                        </span>
                      </td>

                      <!-- Service Name -->
                      <td class="py-4 px-5">
                        <p class="font-bold text-slate-900">{{ req.service }}</p>
                        <p class="text-[11px] text-slate-500">{{ req.category }}</p>
                      </td>

                      <!-- Location -->
                      <td class="py-4 px-5 text-slate-600">
                        <div class="flex items-center gap-1">
                          <span class="material-icons text-sm text-slate-400">place</span>
                          <span>{{ req.location }}</span>
                        </div>
                      </td>

                      <!-- Date -->
                      <td class="py-4 px-5 text-slate-500 font-medium">
                        {{ req.date }}
                      </td>

                      <!-- Status Chip -->
                      <td class="py-4 px-5">
                        @switch (req.status) {
                          @case ('New') {
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> New
                            </span>
                          }
                          @case ('In Progress') {
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> In Progress
                            </span>
                          }
                          @case ('Completed') {
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
                            </span>
                          }
                          @default {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              {{ req.status }}
                            </span>
                          }
                        }
                      </td>

                      <!-- Action Button -->
                      <td class="py-4 px-5 text-right">
                        <button
                          (click)="openRequestDetails(req)"
                          class="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>View</span>
                          <span class="material-icons text-xs text-slate-400">arrow_drop_down</span>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-8 text-center text-slate-400 text-xs">
                        No service requests match the selected filter.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- 5. Quick Actions 6-Card Grid (Exact Match to Image) -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span class="material-icons text-base">apps</span>
              </div>
              <div>
                <h3 class="font-extrabold text-sm text-[#0f172a]">Quick Actions</h3>
                <p class="text-xs text-slate-500">Open customer tools</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <!-- Action 1: Book a Service -->
              <button
                (click)="openServiceModal()"
                class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-start justify-between group cursor-pointer"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span class="material-icons text-xl">build</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">Book a Service</h4>
                    <p class="text-[11px] text-slate-500 mt-1 leading-snug">Plumbing, electrical, carpentry, painting & more</p>
                  </div>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base mt-2">arrow_forward</span>
              </button>

              <!-- Action 2: Material Requests -->
              <button
                (click)="openMaterialModal()"
                class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-start justify-between group cursor-pointer"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span class="material-icons text-xl">payments</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">Material Requests</h4>
                    <p class="text-[11px] text-slate-500 mt-1 leading-snug">Track quotes and supplier bids for materials</p>
                  </div>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base mt-2">arrow_forward</span>
              </button>

              <!-- Action 3: Quotation Report -->
              <button
                (click)="openSampleQuotation()"
                class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-start justify-between group cursor-pointer"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span class="material-icons text-xl">receipt_long</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">Quotation Report</h4>
                    <p class="text-[11px] text-slate-500 mt-1 leading-snug">Review service provider quotation proposals</p>
                  </div>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base mt-2">arrow_forward</span>
              </button>

              <!-- Action 4: Work Orders -->
              <button
                (click)="activeNav.set('workorders')"
                class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-start justify-between group cursor-pointer"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span class="material-icons text-xl">assignment_turned_in</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">Work Orders</h4>
                    <p class="text-[11px] text-slate-500 mt-1 leading-snug">Monitor approved orders and worker assignments</p>
                  </div>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base mt-2">arrow_forward</span>
              </button>

              <!-- Action 5: Delivery Schedules -->
              <button
                (click)="activeNav.set('delivery')"
                class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-start justify-between group cursor-pointer"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span class="material-icons text-xl">calendar_month</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">Delivery Schedules</h4>
                    <p class="text-[11px] text-slate-500 mt-1 leading-snug">Check expected delivery timelines for materials</p>
                  </div>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base mt-2">arrow_forward</span>
              </button>

              <!-- Action 6: My Assets -->
              <button
                (click)="activeNav.set('assets')"
                class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-start justify-between group cursor-pointer"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span class="material-icons text-xl">apartment</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">My Assets</h4>
                    <p class="text-[11px] text-slate-500 mt-1 leading-snug">Manage registered properties, sites and equipment</p>
                  </div>
                </div>
                <span class="material-icons text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-base mt-2">arrow_forward</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      <!-- 6. Detailed Enterprise Footer (Exact Match to Image from Kocuri Engineers Nellore) -->
      <footer class="bg-[#091124] text-slate-300 pt-10 pb-8 px-6 lg:px-12 border-t border-slate-800 text-xs">
        <div class="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <!-- Col 1: Company Profile & Registered Office -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <span class="material-icons text-base">construction</span>
              </div>
              <span class="font-extrabold text-base text-white tracking-tight">Mister<span class="text-emerald-400">Mason</span>.in</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Supplies of Men, Material & Machine. India's verified contractor, construction materials procurement, and site service network.
            </p>
            <div class="pt-2 text-[11px] text-slate-400 space-y-1.5">
              <p class="flex items-start gap-2">
                <span class="material-icons text-xs text-emerald-400 mt-0.5">location_on</span>
                <span>Kocuri Engineers Pvt Ltd, Vikrutha Pet Road, Kavukaluru, Nellore Dist., Andhra Pradesh, 524105, India</span>
              </p>
              <p class="flex items-center gap-2">
                <span class="material-icons text-xs text-emerald-400">phone</span>
                <span>+91 8919611426</span>
              </p>
              <p class="flex items-center gap-2">
                <span class="material-icons text-xs text-emerald-400">email</span>
                <span>info&#64;mistermason.com</span>
              </p>
            </div>
          </div>

          <!-- Col 2: Information Links -->
          <div>
            <h4 class="font-bold text-white uppercase tracking-wider text-xs border-l-2 border-emerald-500 pl-2 mb-3">
              INFORMATION
            </h4>
            <ul class="space-y-2 text-[11px] text-slate-400">
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-1.5"><span class="text-slate-600">›</span> About Us</a></li>
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-1.5"><span class="text-slate-600">›</span> Online Enquiry</a></li>
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-1.5"><span class="text-slate-600">›</span> Customer Support</a></li>
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-1.5"><span class="text-slate-600">›</span> Terms & Conditions</a></li>
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-1.5"><span class="text-slate-600">›</span> Privacy Policy</a></li>
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-1.5"><span class="text-slate-600">›</span> Become a Partner</a></li>
            </ul>
          </div>

          <!-- Col 3: Ecosystem Links -->
          <div>
            <h4 class="font-bold text-white uppercase tracking-wider text-xs border-l-2 border-emerald-500 pl-2 mb-3">
              OUR ECOSYSTEM
            </h4>
            <ul class="space-y-2 text-[11px] text-slate-400 mb-6">
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-2"><span class="material-icons text-xs text-slate-500">domain</span> Construd.in</a></li>
              <li><a href="#" class="hover:text-white transition-colors flex items-center gap-2"><span class="material-icons text-xs text-slate-500">store</span> Kowala.com</a></li>
            </ul>

            <h4 class="font-bold text-white uppercase tracking-wider text-xs border-l-2 border-emerald-500 pl-2 mb-3">
              CONNECT WITH US
            </h4>
            <div class="flex items-center gap-2">
              <a href="#" class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold hover:opacity-90">f</a>
              <a href="#" class="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold hover:opacity-90">t</a>
              <a href="#" class="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center text-xs font-bold hover:opacity-90">in</a>
              <a href="#" class="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center text-xs font-bold hover:opacity-90">G+</a>
              <a href="#" class="w-7 h-7 rounded-lg bg-red-700 text-white flex items-center justify-center text-xs font-bold hover:opacity-90">yt</a>
            </div>
          </div>

          <!-- Col 4: Project Verification & Viva Credentials -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] space-y-2">
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              MCA Semester IV Major Project
            </span>
            <p class="font-bold text-white text-xs">MisterMason Customer ERP</p>
            <p class="text-slate-400 text-[10px] leading-relaxed">
              Fully interactive frontend client panel with real Indian supplier & contractor data models, dynamic service requests, and material quotation workflows.
            </p>
            <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
              <span>Status: Verified</span>
              <span class="text-emerald-400 font-semibold font-mono">v2.4-Production</span>
            </div>
          </div>
        </div>

        <div class="max-w-[1600px] mx-auto mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© 2026 MisterMason.in & Kocuri Engineers Pvt Ltd. All rights reserved.</p>
          <p>Handcrafted MCA Major Project • Evaluated for viva demonstration</p>
        </div>
      </footer>

      <!-- ================= MODALS & DRAWERS ================= -->

      <!-- 1. "Book a Service" Modal -->
      @if (isServiceModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close modal overlay" (click)="isServiceModalOpen.set(false)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="material-icons text-emerald-600">construction</span>
                <h3 class="text-base font-extrabold text-slate-900">Book New Contractor Service</h3>
              </div>
              <button (click)="isServiceModalOpen.set(false)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form (submit)="submitNewService($event)" class="space-y-3.5">
              <div>
                <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Service Category *</div>
                <select [(ngModel)]="newService.category" name="category" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="General Service">General Service & Site Inspection</option>
                  <option value="Plumbing & Drainage">Plumbing & Sanitary Piping</option>
                  <option value="Electrical Rewiring">Electrical & Substation Panels</option>
                  <option value="Structural Masonry">Masonry & Concrete Works</option>
                  <option value="Painting & Waterproofing">Commercial Painting & Waterproofing</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Service Title *</div>
                  <input type="text" [(ngModel)]="newService.service" name="service" placeholder="e.g. Roof Slab Waterproofing" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Site Location *</div>
                  <input type="text" [(ngModel)]="newService.location" name="location" placeholder="e.g. Delhi, India or Nellore, AP" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>

              <div>
                <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Detailed Description *</div>
                <textarea rows="3" [(ngModel)]="newService.description" name="description" placeholder="Specify site dimensions, machinery access, or urgency..." required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"></textarea>
              </div>

              <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <span class="material-icons text-base">verified</span>
                <span>An accredited site engineer will be allocated within 2 hours of booking.</span>
              </div>

              <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" (click)="isServiceModalOpen.set(false)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" class="px-5 py-2 bg-gradient-to-r from-[#009661] to-[#059669] text-white font-bold rounded-xl shadow-sm hover:opacity-95 cursor-pointer">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- 2. "Request Materials" Modal -->
      @if (isMaterialModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close modal overlay" (click)="isMaterialModalOpen.set(false)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2">
                <span class="material-icons text-blue-600">inventory_2</span>
                <h3 class="text-base font-extrabold text-slate-900">Request Construction Materials Quote</h3>
              </div>
              <button (click)="isMaterialModalOpen.set(false)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form (submit)="submitNewMaterial($event)" class="space-y-3.5">
              <div>
                <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Select Material Item *</div>
                <select [(ngModel)]="newMaterial.materialName" name="materialName" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="UltraTech Super Cement (53 Grade OPC)">UltraTech Super Cement (53 Grade OPC)</option>
                  <option value="Tata Tiscon Fe550D TMT Rebars (16mm & 12mm)">Tata Tiscon Fe550D TMT Rebars (16mm & 12mm)</option>
                  <option value="Triple-Washed River Sand & M-Sand">Triple-Washed River Sand & M-Sand</option>
                  <option value="First-Class Wire Cut Red Bricks">First-Class Wire Cut Red Bricks (9x4x3)</option>
                  <option value="20mm Blue Metal Granite Aggregate">20mm Blue Metal Granite Aggregate</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Quantity *</div>
                  <input type="text" [(ngModel)]="newMaterial.quantity" name="quantity" placeholder="e.g. 500" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Unit of Measurement *</div>
                  <input type="text" [(ngModel)]="newMaterial.unit" name="unit" placeholder="e.g. Bags / Tonnes / Trucks" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>

              <div>
                <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Delivery Destination Site *</div>
                <input type="text" [(ngModel)]="newMaterial.deliverySite" name="deliverySite" placeholder="e.g. Site A - Vikrutha Pet, Nellore" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <div class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Urgency Level</div>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" [(ngModel)]="newMaterial.urgency" name="urgency" value="Standard" />
                    <span>Standard (2-3 Days)</span>
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" [(ngModel)]="newMaterial.urgency" name="urgency" value="Urgent" />
                    <span class="text-red-600 font-bold">Urgent (Express 24h)</span>
                  </label>
                </div>
              </div>

              <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" (click)="isMaterialModalOpen.set(false)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" class="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-sm hover:opacity-95 cursor-pointer">Send Procurement Request</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- 3. "View Service Request Details" Drawer/Modal -->
      @if (selectedRequest()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close modal overlay" (click)="selectedRequest.set(null)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl z-10 space-y-4 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span class="px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono font-bold text-[11px] border border-blue-200">
                  {{ selectedRequest()!.id }}
                </span>
                <h3 class="text-base font-extrabold text-slate-900 mt-1">{{ selectedRequest()!.service }}</h3>
              </div>
              <button (click)="selectedRequest.set(null)" class="text-slate-400 hover:text-slate-700">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">CATEGORY</p>
                  <p class="font-bold text-slate-800">{{ selectedRequest()!.category }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">LOCATION</p>
                  <p class="font-bold text-slate-800">{{ selectedRequest()!.location }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">REQUEST DATE</p>
                  <p class="font-bold text-slate-800">{{ selectedRequest()!.date }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase">ESTIMATED QUOTATION</p>
                  <p class="font-bold text-emerald-600">{{ selectedRequest()!.estimatedCost || '₹12,000' }}</p>
                </div>
              </div>

              <div>
                <h4 class="font-bold text-slate-700 text-xs uppercase mb-1">Site Scope of Work:</h4>
                <p class="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {{ selectedRequest()!.description }}
                </p>
              </div>

              <div class="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-purple-600 text-base">engineering</span>
                  <span class="font-bold text-purple-900">Allocated Site Engineer</span>
                </div>
                <p class="text-purple-800 mt-1 font-medium">{{ selectedRequest()!.assignedEngineer }}</p>
                <p class="text-purple-600 text-[11px]">Direct Hotline: {{ selectedRequest()!.engineerContact }}</p>
              </div>
            </div>

            <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button (click)="selectedRequest.set(null)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Close</button>
              <button (click)="selectedRequest.set(null)" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer">Download Quotation PDF</button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class MisterMasonComponent {
  private readonly misterMasonService = inject(MisterMasonService);

  protected activeTheme = signal<'midnight' | 'mason'>('midnight');
  protected isSidebarCollapsed = signal<boolean>(false);
  protected isMobileNavOpen = signal<boolean>(false);
  protected isDesignsDropdownOpen = signal<boolean>(false);
  protected isMaterialMenuOpen = signal<boolean>(true);
  protected isWorkOrderMenuOpen = signal<boolean>(false);
  protected isRefreshing = signal<boolean>(false);
  protected copied = signal<boolean>(false);

  protected activeTab = signal<'all' | 'pending' | 'inprogress' | 'completed' | 'materials'>('all');
  protected activeNav = signal<string>('dashboard');
  protected searchQuery = signal<string>('');

  protected customer = this.misterMasonService.customerProfile;
  protected serviceRequests = this.misterMasonService.serviceRequests;
  protected materialRequests = this.misterMasonService.materialRequests;

  protected isServiceModalOpen = signal<boolean>(false);
  protected isMaterialModalOpen = signal<boolean>(false);
  protected selectedRequest = signal<ServiceRequest | null>(null);

  protected newService = {
    service: '',
    category: 'General Service',
    location: 'Delhi, India',
    status: 'New' as const,
    description: '',
    estimatedCost: '₹14,500',
    assignedEngineer: 'Er. R. K. Saxena (Lead Site Consultant)',
    engineerContact: '+91 98112 44332'
  };

  protected newMaterial = {
    materialName: 'UltraTech Super Cement (53 Grade OPC)',
    quantity: '200',
    unit: 'Bags (50kg)',
    deliverySite: 'Plot 42, Okhla Phase III, New Delhi',
    status: 'In Review' as const,
    urgency: 'Standard' as const
  };

  protected pendingCount = computed(() => {
    return this.serviceRequests().filter(r => r.status === 'New' || r.status === 'Pending').length;
  });

  protected inProgressCount = computed(() => {
    return this.serviceRequests().filter(r => r.status === 'In Progress').length;
  });

  protected completedCount = computed(() => {
    return this.serviceRequests().filter(r => r.status === 'Completed').length;
  });

  protected filteredRequests = computed(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();

    return this.serviceRequests().filter(r => {
      // Tab filter
      let matchesTab = true;
      if (tab === 'pending') {
        matchesTab = r.status === 'New' || r.status === 'Pending';
      } else if (tab === 'inprogress') {
        matchesTab = r.status === 'In Progress';
      } else if (tab === 'completed') {
        matchesTab = r.status === 'Completed';
      }

      // Query filter
      let matchesQuery = true;
      if (query) {
        matchesQuery = r.id.toLowerCase().includes(query) ||
                       r.service.toLowerCase().includes(query) ||
                       r.location.toLowerCase().includes(query) ||
                       r.category.toLowerCase().includes(query);
      }

      return matchesTab && matchesQuery;
    });
  });

  protected copyCustomerId(): void {
    navigator.clipboard?.writeText(this.customer().customerId);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  protected refreshData(): void {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.isRefreshing.set(false);
    }, 600);
  }

  protected openServiceModal(): void {
    this.isServiceModalOpen.set(true);
  }

  protected openMaterialModal(): void {
    this.isMaterialModalOpen.set(true);
  }

  protected openRequestDetails(req: ServiceRequest): void {
    this.selectedRequest.set(req);
  }

  protected openSampleQuotation(): void {
    const first = this.serviceRequests()[0];
    if (first) {
      this.selectedRequest.set(first);
    }
  }

  protected submitNewService(event: Event): void {
    event.preventDefault();
    if (!this.newService.service || !this.newService.description) return;
    this.misterMasonService.addServiceRequest({ ...this.newService });
    this.isServiceModalOpen.set(false);
    this.newService.service = '';
    this.newService.description = '';
  }

  protected submitNewMaterial(event: Event): void {
    event.preventDefault();
    if (!this.newMaterial.quantity || !this.newMaterial.deliverySite) return;
    this.misterMasonService.addMaterialRequest({ ...this.newMaterial });
    this.isMaterialModalOpen.set(false);
  }

  protected scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
