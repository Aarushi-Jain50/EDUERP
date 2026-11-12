import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  ElementRef,
  viewChild,
  afterNextRender,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import {
  AdminDataService,
  StudentRecord
} from '../../services/admin-data.service';
import { ActivityService } from '../../services/activity.service';

Chart.register(...registerables);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-overview',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="space-y-8 lg:space-y-10">

      <!-- 1. Spacious Welcome Hero Banner -->
      <div class="gradient-brand text-white rounded-2xl p-6 lg:p-8 border border-white/15 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <!-- Soft Ambient Aurora Radial Glow -->
        <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full aurora-glow pointer-events-none"></div>

        <div class="flex items-start gap-5 relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-[#D946EF] flex items-center justify-center shrink-0 shadow-inner">
            <span class="material-icons text-3xl">school</span>
          </div>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h1 class="text-2xl lg:text-3xl font-extrabold tracking-tight">
                Good Morning, <span class="text-[#D946EF]">Admin</span>
              </h1>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-pink-200 font-mono font-medium border border-white/15">
                Dean (Academics)
              </span>
            </div>
            <p class="text-xs text-purple-200 font-medium flex items-center gap-2">
              <span class="material-icons text-sm text-[#D946EF]">calendar_today</span>
              <span>{{ currentDate() }}</span>
              <span class="text-white/40">·</span>
              <span>Academic Session 2025–26</span>
              <span class="text-white/40">·</span>
              <span>College Code: 133</span>
            </p>
            <p class="text-xs text-slate-300 max-w-xl leading-relaxed pt-1">
              Apex Institute of Technology & Management. Real-time academic tracking, student attendance monitoring, examination schedules, and fee ledgers.
            </p>
          </div>
        </div>

        <!-- Primary Action CTAs with Generous Padding -->
        <div class="flex items-center gap-3 shrink-0 relative z-10 flex-wrap">
          <button
            (click)="openAddStudentModal()"
            class="px-5 py-2.5 rounded-xl gradient-accent hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span class="material-icons text-base">person_add</span>
            <span>Add New Student</span>
          </button>

          <button
            (click)="exportStudentsToCsv()"
            class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            title="Export student records to CSV file"
          >
            <span class="material-icons text-sm">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- 2. Four Clean, Spacious Key Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Metric 1: Total Enrolled Students -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrolled</span>
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D42E8] flex items-center justify-center">
              <span class="material-icons text-xl">people</span>
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-3xl font-extrabold text-[#172554] tracking-tight tabular-nums">{{ totalStudentsCount() }}</h3>
            <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span class="text-emerald-600 font-bold">+8.2%</span>
              <span class="text-slate-300">·</span>
              <span>Active on university rolls</span>
            </div>
          </div>
        </div>

        <!-- Metric 2: Today's Biometric Attendance -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Attendance</span>
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span class="material-icons text-xl">how_to_reg</span>
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-3xl font-extrabold text-[#172554] tracking-tight tabular-nums">94.2%</h3>
            <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span class="text-emerald-600 font-bold">Optimal</span>
              <span class="text-slate-300">·</span>
              <span>Gate biometric verified</span>
            </div>
          </div>
        </div>

        <!-- Metric 3: Attendance Defaulters -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Attendance Defaulters</span>
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span class="material-icons text-xl">warning_amber</span>
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-3xl font-extrabold text-amber-600 tracking-tight tabular-nums">{{ defaulters().length }}</h3>
            <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span class="text-amber-600 font-bold">&lt; 75% Rule</span>
              <span class="text-slate-300">·</span>
              <span>Parent notices pending</span>
            </div>
          </div>
        </div>

        <!-- Metric 4: Semester Fee Collection -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Semester Fee Collection</span>
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span class="material-icons text-xl">payments</span>
            </div>
          </div>
          <div class="mt-4">
            <h3 class="text-3xl font-extrabold text-[#172554] tracking-tight tabular-nums">₹1.48 Cr</h3>
            <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span class="text-emerald-600 font-bold">89.4%</span>
              <span class="text-slate-300">·</span>
              <span>SBI i-Collect Synced</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Spacious 2-Column Analytics Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Chart 1: Enrollment Growth Trend -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-[#172554]">Student Enrollment Progression</h3>
              <p class="text-xs text-slate-500 mt-0.5">5-year admission growth trajectory across academic disciplines</p>
            </div>
            <span class="text-xs font-medium text-slate-500">Verified AY 2022–26</span>
          </div>
          <div class="h-72 relative w-full pt-2">
            <canvas #enrollmentCanvas></canvas>
          </div>
        </div>

        <!-- Chart 2: Weekly Biometric Attendance -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-[#172554]">Weekly Biometric Attendance Overview</h3>
              <p class="text-xs text-slate-500 mt-0.5">Daily attendance percentage recorded across biometric stations</p>
            </div>
            <span class="text-xs font-medium text-slate-500">Current Week (Mon–Sat)</span>
          </div>
          <div class="h-72 relative w-full pt-2">
            <canvas #attendanceCanvas></canvas>
          </div>
        </div>
      </div>

      <!-- 4. Central Academic Directory & Student Records (Spacious, Uncluttered Table) -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        <!-- Table Header & Filter Strip -->
        <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 class="font-extrabold text-base text-[#172554]">Student Academic Register & Records</h3>
            <p class="text-xs text-slate-500 mt-0.5">Verified university enrollment rolls, attendance records, and examination grades</p>
          </div>

          <!-- Interactive Filters & Search -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <!-- Segmented Filter Buttons -->
            <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                (click)="activeFilter.set('all')"
                [class]="activeFilter() === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                All ({{ students().length }})
              </button>
              <button
                (click)="activeFilter.set('mca')"
                [class]="activeFilter() === 'mca' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                MCA
              </button>
              <button
                (click)="activeFilter.set('btech')"
                [class]="activeFilter() === 'btech' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                B.Tech
              </button>
              <button
                (click)="activeFilter.set('defaulters')"
                [class]="activeFilter() === 'defaulters' ? 'bg-white text-red-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Short Attendance
              </button>
            </div>

            <!-- Search Bar -->
            <div class="relative w-full sm:w-64">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span class="material-icons text-base">search</span>
              </span>
              <input
                type="text"
                placeholder="Search roll, name, program..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D42E8]/20 focus:border-[#6D42E8]"
              />
            </div>
          </div>
        </div>

        <!-- Table Viewport with Generous Padding on Cells -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/75 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th class="py-4 px-6">Roll Number</th>
                <th class="py-4 px-6">Student & Guardian</th>
                <th class="py-4 px-6">Program & Section</th>
                <th class="py-4 px-6">Attendance</th>
                <th class="py-4 px-6">CGPA</th>
                <th class="py-4 px-6">Fee Status</th>
                <th class="py-4 px-6 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
              @for (student of filteredStudents(); track student.rollNo) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Roll No -->
                  <td class="py-4 px-6 font-mono font-bold text-[#6D42E8]">
                    {{ student.rollNo }}
                  </td>

                  <!-- Student Name & Guardian -->
                  <td class="py-4 px-6">
                    <p class="font-bold text-slate-900">{{ student.name }}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Father: {{ student.fatherName }}</p>
                  </td>

                  <!-- Program & Section -->
                  <td class="py-4 px-6">
                    <p class="font-semibold text-slate-800">{{ student.program }}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">{{ student.section }} · {{ student.semester }}</p>
                  </td>

                  <!-- Attendance with Clear Indicator -->
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                      <span [class]="student.attendancePct >= 75 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'">
                        {{ student.attendancePct }}%
                      </span>
                      <span class="text-slate-400 text-[11px]">({{ student.lectureAttended }}/{{ student.lectureTotal }})</span>
                    </div>
                  </td>

                  <!-- CGPA -->
                  <td class="py-4 px-6 font-mono font-bold text-slate-900">
                    {{ student.cgpa.toFixed(2) }}
                  </td>

                  <!-- Fee Status -->
                  <td class="py-4 px-6">
                    <span [class]="student.feeStatus === 'Paid' ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'">
                      {{ student.feeStatus }}
                    </span>
                    <span class="text-[11px] text-slate-400 block font-mono">{{ student.challanNo }}</span>
                  </td>

                  <!-- Action Button -->
                  <td class="py-4 px-6 text-right">
                    <button
                      (click)="viewDossier(student)"
                      class="px-3 py-1.5 bg-white hover:bg-purple-50 text-[#6D42E8] border border-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="py-10 text-center text-slate-400 text-xs">
                    No student records match the selected filter.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- 5. Secondary Operational Grid (Spacious 2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Left: Low Attendance Alerts (< 75%) -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-[#172554] flex items-center gap-2">
                <span class="material-icons text-amber-500 text-base">warning</span>
                <span>Low Attendance Defaulters (&lt; 75%)</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">Students subject to detention unless university condonation is approved</p>
            </div>
            <button
              (click)="notifyAllDefaulters()"
              class="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 cursor-pointer transition-colors"
            >
              Notify All Parents
            </button>
          </div>

          <div class="divide-y divide-slate-100 text-xs">
            @for (def of defaulters(); track def.rollNo) {
              <div class="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-[#6D42E8]">{{ def.rollNo }}</span>
                    <span class="font-bold text-slate-800">{{ def.name }}</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">
                    {{ def.program }} · Short by <span class="font-bold text-slate-700">{{ def.shortfallLectures }} lectures</span>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  @if (def.alertSent) {
                    <span class="text-emerald-600 font-bold text-xs flex items-center gap-1">
                      <span class="material-icons text-xs">check</span> SMS Sent
                    </span>
                  } @else {
                    <button
                      (click)="notifyDefaulter(def.rollNo)"
                      class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-2xs"
                    >
                      Send SMS
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right: Upcoming University Examinations -->
        <div class="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-[#172554] flex items-center gap-2">
                <span class="material-icons text-[#D946EF] text-base">assignment</span>
                <span>Upcoming Examination Schedule</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">End-Term Theory & Practical dates for current session</p>
            </div>
            <span class="text-xs font-semibold text-[#6D42E8]">Even Sem 2026</span>
          </div>

          <div class="space-y-3">
            @for (exam of examSchedules().slice(0, 3); track exam.courseCode) {
              <div class="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-purple-50/20 transition-colors">
                <div class="flex items-center justify-between">
                  <span class="font-mono font-bold text-[#6D42E8] text-xs">{{ exam.courseCode }}</span>
                  <span class="text-xs text-slate-500 font-medium">{{ exam.date }}</span>
                </div>
                <h4 class="font-bold text-slate-800 text-xs mt-1">{{ exam.subject }}</h4>
                <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{{ exam.hall }}</span>
                  <span class="text-slate-300">·</span>
                  <span>Invigilator: {{ exam.invigilator }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Recent System Activity Snapshot -->
      <div class="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold text-sm text-[#172554] flex items-center gap-2">
              <span class="material-icons text-[#6D42E8] text-base">history</span>
              <span>Recent Activity</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Chronological audit trail of administrative actions, fee collections, and notices</p>
          </div>
          <a
            routerLink="/admin/recent-activity"
            class="text-xs font-bold text-[#6D42E8] hover:text-[#582fc4] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View all</span>
            <span class="material-icons text-sm">arrow_forward</span>
          </a>
        </div>
        
        <div class="divide-y divide-slate-100 text-xs">
          @for (item of recentActivityPreview(); track item.id) {
            <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 rounded-lg px-2 transition-colors">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-[#6D42E8] border border-purple-100">
                  <span class="material-icons text-base">{{ item.icon }}</span>
                </div>
                <div class="truncate">
                  <p class="text-[13px] text-slate-800 truncate">
                    <span class="font-semibold text-slate-900">{{ item.user }}</span>
                    <span class="text-slate-600"> {{ item.action }} </span>
                    <span class="font-medium text-slate-900">{{ item.target }}</span>
                  </p>
                  <p class="text-[11px] text-slate-400 mt-0.5">{{ item.role }} · {{ item.module }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                <span class="text-xs text-[#64748B] font-normal whitespace-nowrap">{{ item.relativeTime }}</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- 6. Quick Administrative Actions (3 Spacious Cards) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <button
          (click)="openAddStudentModal()"
          class="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-[#6D42E8] hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div class="w-12 h-12 rounded-xl bg-purple-50 text-[#6D42E8] flex items-center justify-center group-hover:scale-105 transition-transform">
            <span class="material-icons text-2xl">person_add</span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 group-hover:text-[#6D42E8] transition-colors mt-4">Enroll New Student</h4>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">Register new candidates to university roster with SBI Challan verification</p>
        </button>

        <button
          (click)="openPublishNoticeModal()"
          class="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-[#6D42E8] hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div class="w-12 h-12 rounded-xl bg-pink-50 text-[#D946EF] flex items-center justify-center group-hover:scale-105 transition-transform">
            <span class="material-icons text-2xl">campaign</span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 group-hover:text-[#6D42E8] transition-colors mt-4">Publish Circular</h4>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">Broadcast official academic notifications and exam timetables to student portal</p>
        </button>

        <button
          (click)="syncBiometricTerminal()"
          class="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-[#6D42E8] hover:shadow-md transition-all text-left group cursor-pointer"
        >
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span class="material-icons text-2xl">sync</span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 group-hover:text-[#6D42E8] transition-colors mt-4">Sync Biometric Logs</h4>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">Pull live RFID attendance records from Gate 1 and Gate 2 hardware stations</p>
        </button>
      </div>

    </div>

    <!-- Modal 1: Student Official Marksheet & Academic Dossier -->
    @if (selectedStudent()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" (click)="selectedStudent.set(null)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-2xl z-10 space-y-5 text-xs text-slate-800 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between border-b border-slate-200 pb-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-xl gradient-accent text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                {{ selectedStudent()!.name.charAt(0) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded bg-purple-100 text-[#6D42E8] font-mono font-bold text-xs">
                    Roll: {{ selectedStudent()!.rollNo }}
                  </span>
                  <span class="text-[11px] text-slate-500 font-mono">PRN: 2024-MCA-{{ selectedStudent()!.rollNo }}</span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900 mt-0.5">{{ selectedStudent()!.name }}</h3>
              </div>
            </div>
            <button (click)="selectedStudent.set(null)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Academic Bio Details -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">PROGRAM</p>
              <p class="font-bold text-slate-800 text-xs mt-0.5">{{ selectedStudent()!.program }}</p>
              <p class="text-[11px] text-slate-500">{{ selectedStudent()!.section }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">CATEGORY / HOSTEL</p>
              <p class="font-bold text-slate-800 text-xs mt-0.5">{{ selectedStudent()!.category }}</p>
              <p class="text-[11px] text-slate-500">{{ selectedStudent()!.hostelStatus }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">ATTENDANCE</p>
              <p [class]="selectedStudent()!.attendancePct >= 75 ? 'font-bold text-emerald-600 text-xs mt-0.5' : 'font-bold text-red-600 text-xs mt-0.5'">
                {{ selectedStudent()!.attendancePct }}% ({{ selectedStudent()!.lectureAttended }}/{{ selectedStudent()!.lectureTotal }})
              </p>
              <p class="text-[10px] text-slate-500">{{ selectedStudent()!.attendancePct >= 75 ? 'Exam Eligible' : 'Detained Warning' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">CUMULATIVE CGPA</p>
              <p class="font-bold text-[#6D42E8] font-mono text-base mt-0.5">{{ selectedStudent()!.cgpa.toFixed(2) }} / 10.0</p>
            </div>
          </div>

          <!-- Semester IV Subject Marksheet -->
          <div>
            <h4 class="font-bold text-slate-800 text-xs uppercase mb-2 flex items-center gap-1.5">
              <span class="material-icons text-sm text-[#6D42E8]">grade</span>
              <span>Semester IV Theory & Practical Marksheet:</span>
            </h4>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-600 font-bold text-[11px]">
                  <tr>
                    <th class="p-3">Course Code</th>
                    <th class="p-3">Subject Description</th>
                    <th class="p-3">Internal (30)</th>
                    <th class="p-3">External (70)</th>
                    <th class="p-3">Grade</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td class="p-3 font-mono text-[#6D42E8] font-bold">KCA-401</td>
                    <td class="p-3">Cloud Computing Architecture & DevOps</td>
                    <td class="p-3 font-mono">28 / 30</td>
                    <td class="p-3 font-mono">61 / 70</td>
                    <td class="p-3 font-bold text-emerald-600">A+</td>
                  </tr>
                  <tr>
                    <td class="p-3 font-mono text-[#6D42E8] font-bold">KCA-402</td>
                    <td class="p-3">Artificial Intelligence & Deep Learning</td>
                    <td class="p-3 font-mono">27 / 30</td>
                    <td class="p-3 font-mono">59 / 70</td>
                    <td class="p-3 font-bold text-emerald-600">A+</td>
                  </tr>
                  <tr>
                    <td class="p-3 font-mono text-[#6D42E8] font-bold">KCA-452</td>
                    <td class="p-3">Major Project Dissertation & Final Viva</td>
                    <td class="p-3 font-mono">29 / 30</td>
                    <td class="p-3 font-mono">66 / 70</td>
                    <td class="p-3 font-bold text-purple-700">O (Outstanding)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Fee Receipt Verification -->
          <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <p class="font-bold text-emerald-900 text-xs">University Fee Status: {{ selectedStudent()!.feeStatus }}</p>
              <p class="text-[11px] text-emerald-700 mt-0.5">Challan Ref: <span class="font-mono font-bold">{{ selectedStudent()!.challanNo }}</span> (Amount: {{ selectedStudent()!.feePaidAmount }})</p>
            </div>
            <span class="px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded font-bold text-xs">Accounts Verified</span>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button (click)="selectedStudent.set(null)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Close</button>
            <button (click)="printDossier()" class="px-5 py-2 gradient-accent text-white font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-2">
              <span class="material-icons text-sm">print</span> Print Official Marksheet
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal 2: Add New Candidate Admission Modal -->
    @if (isAddStudentOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" (click)="isAddStudentOpen.set(false)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-[#6D42E8]">person_add</span>
              <h3 class="text-base font-extrabold text-[#172554]">Enroll Candidate to University Roster</h3>
            </div>
            <button (click)="isAddStudentOpen.set(false)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form (submit)="submitNewStudent($event)" class="space-y-4">
            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-roll" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">University Roll No *</label>
                <input id="enroll-roll" type="text" [(ngModel)]="newStudentData.rollNo" name="rollNo" placeholder="e.g. 22MCA064" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#6D42E8]/20" />
              </div>
              <div>
                <label for="enroll-name" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Student Full Name *</label>
                <input id="enroll-name" type="text" [(ngModel)]="newStudentData.name" name="name" placeholder="e.g. Ananya Das" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#6D42E8]/20" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-prog" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Program *</label>
                <select id="enroll-prog" [(ngModel)]="newStudentData.program" name="program" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="Master of Computer Applications">MCA (Master of Computer Applications)</option>
                  <option value="B.Tech Computer Science & Engg">B.Tech (Computer Science)</option>
                  <option value="Bachelor of Computer Applications">BCA (Bachelor of Computer Applications)</option>
                </select>
              </div>
              <div>
                <label for="enroll-sec" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Section *</label>
                <select id="enroll-sec" [(ngModel)]="newStudentData.section" name="section" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="MCA-IV A">MCA-IV A</option>
                  <option value="MCA-IV B">MCA-IV B</option>
                  <option value="CSE-VI A">CSE-VI A</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-father" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Guardian Name *</label>
                <input id="enroll-father" type="text" [(ngModel)]="newStudentData.fatherName" name="fatherName" placeholder="e.g. Mr. K. K. Das" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label for="enroll-phone" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Guardian Phone *</label>
                <input id="enroll-phone" type="text" [(ngModel)]="newStudentData.contact" name="contact" placeholder="e.g. +91 98311 22334" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="enroll-email" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Institutional Email *</label>
                <input id="enroll-email" type="email" [(ngModel)]="newStudentData.email" name="email" placeholder="e.g. ananya.das@eduerp.edu" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label for="enroll-challan" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">SBI Challan Reference *</label>
                <input id="enroll-challan" type="text" [(ngModel)]="newStudentData.challanNo" name="challanNo" placeholder="e.g. SBI-DU991203" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" (click)="isAddStudentOpen.set(false)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 gradient-accent text-white font-bold rounded-xl shadow-sm hover:opacity-95 cursor-pointer">Confirm Admission</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal 3: Publish Institutional Circular -->
    @if (isNoticeModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" (click)="isNoticeModalOpen.set(false)" class="fixed inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-0"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg z-10 space-y-4 text-xs text-slate-800">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-[#D946EF]">campaign</span>
              <h3 class="text-base font-extrabold text-[#172554]">Publish Official College Circular</h3>
            </div>
            <button (click)="isNoticeModalOpen.set(false)" class="text-slate-400 hover:text-slate-700 cursor-pointer">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form (submit)="submitNewNotice($event)" class="space-y-4">
            <div>
              <label for="circ-title" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Circular Title *</label>
              <input id="circ-title" type="text" [(ngModel)]="newNoticeData.title" name="title" placeholder="e.g. Schedule of MCA Major Project Final Defense" required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
            </div>

            <div class="grid grid-cols-2 gap-3.5">
              <div>
                <label for="circ-cat" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Category *</label>
                <select id="circ-cat" [(ngModel)]="newNoticeData.category" name="category" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="Academic">Academic</option>
                  <option value="Examination">Examination</option>
                  <option value="Placement">Placement</option>
                </select>
              </div>
              <div>
                <label for="circ-prio" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Priority *</label>
                <select id="circ-prio" [(ngModel)]="newNoticeData.priority" name="priority" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>

            <div>
              <label for="circ-content" class="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Notice Content *</label>
              <textarea id="circ-content" rows="3" [(ngModel)]="newNoticeData.content" name="content" placeholder="Enter circular details, deadlines, and instructions..." required class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" (click)="isNoticeModalOpen.set(false)" class="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 gradient-accent text-white font-bold rounded-xl shadow-sm hover:opacity-95 cursor-pointer">Broadcast Notice</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Toast Notification -->
    @if (toastMessage()) {
      <div class="fixed bottom-6 right-6 z-50 bg-[#1A1745] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 text-xs animate-bounce">
        <span class="material-icons text-emerald-400">check_circle</span>
        <span>{{ toastMessage() }}</span>
      </div>
    }
  `
})
export class DashboardOverview {
  private readonly adminService = inject(AdminDataService);
  private readonly activityService = inject(ActivityService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly recentActivityPreview = computed(() => this.activityService.getActivities().slice(0, 4));

  private readonly enrollmentCanvas = viewChild<ElementRef<HTMLCanvasElement>>('enrollmentCanvas');
  private readonly attendanceCanvas = viewChild<ElementRef<HTMLCanvasElement>>('attendanceCanvas');

  protected readonly activeFilter = signal<'all' | 'mca' | 'btech' | 'defaulters'>('all');
  protected readonly searchQuery = signal<string>('');

  protected readonly isAddStudentOpen = signal<boolean>(false);
  protected readonly isNoticeModalOpen = signal<boolean>(false);
  protected readonly selectedStudent = signal<StudentRecord | null>(null);
  protected readonly toastMessage = signal<string>('');

  protected readonly students = this.adminService.students;
  protected readonly defaulters = this.adminService.defaulters;
  protected readonly examSchedules = this.adminService.examSchedules;

  protected totalStudentsCount = computed(() => {
    return this.students().length + 4844;
  });

  protected currentDate = signal<string>(
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  );

  protected newStudentData = {
    rollNo: '22MCA064',
    name: 'Ananya Das',
    program: 'Master of Computer Applications',
    section: 'MCA-IV A',
    category: 'General' as const,
    hostelStatus: 'Day Scholar' as const,
    fatherName: 'Mr. K. K. Das',
    contact: '+91 98311 22334',
    email: 'ananya.das@eduerp.edu',
    challanNo: 'SBI-DU991203'
  };

  protected newNoticeData = {
    circularRef: 'AKTU/COE/EVEN-2026/1843',
    title: 'Schedule of MCA Major Project Final Defense',
    category: 'Examination' as const,
    priority: 'High' as const,
    content: 'All Semester IV MCA candidates must report to IT Conference Hall on 28 May 2026 with hardbound project reports.'
  };

  protected filteredStudents = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return this.students().filter(s => {
      let matchesFilter = true;
      if (filter === 'mca') {
        matchesFilter = s.program.includes('Master of Computer Applications') || s.department.includes('Computer Applications');
      } else if (filter === 'btech') {
        matchesFilter = s.program.includes('B.Tech');
      } else if (filter === 'defaulters') {
        matchesFilter = s.attendancePct < 75;
      }

      let matchesQuery = true;
      if (query) {
        matchesQuery = s.rollNo.toLowerCase().includes(query) ||
                       s.name.toLowerCase().includes(query) ||
                       s.program.toLowerCase().includes(query) ||
                       s.section.toLowerCase().includes(query);
      }

      return matchesFilter && matchesQuery;
    });
  });

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.initCharts();
      }
    });
  }

  private initCharts(): void {
    const elCanvas = this.enrollmentCanvas()?.nativeElement;
    if (elCanvas) {
      new Chart(elCanvas, {
        type: 'line',
        data: {
          labels: ['2022', '2023', '2024', '2025', '2026 (Current)'],
          datasets: [
            {
              label: 'MCA & IT Applications',
              data: [320, 390, 480, 560, 680],
              borderColor: '#6D42E8',
              backgroundColor: 'rgba(109, 66, 232, 0.1)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5
            },
            {
              label: 'B.Tech Engg Programs',
              data: [1800, 2100, 2450, 2900, 3400],
              borderColor: '#D946EF',
              backgroundColor: 'rgba(217, 70, 239, 0.06)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          },
          scales: {
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    const atCanvas = this.attendanceCanvas()?.nativeElement;
    if (atCanvas) {
      new Chart(atCanvas, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: [
            {
              label: 'Daily Biometric %',
              data: [96.2, 94.8, 95.1, 93.6, 94.2, 91.5],
              backgroundColor: '#6D42E8',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 80, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v + '%', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
          }
        }
      });
    }
  }

  protected openAddStudentModal(): void {
    this.isAddStudentOpen.set(true);
  }

  protected openPublishNoticeModal(): void {
    this.isNoticeModalOpen.set(true);
  }

  protected viewDossier(student: StudentRecord): void {
    this.selectedStudent.set(student);
  }

  protected notifyDefaulter(rollNo: string): void {
    this.adminService.sendDefaulterAlert(rollNo);
    this.showToast(`Parent SMS notice sent for Roll No ${rollNo}`);
  }

  protected notifyAllDefaulters(): void {
    this.showToast('Automated SMS notices sent to parents of all attendance defaulters.');
  }

  protected syncBiometricTerminal(): void {
    this.showToast('Biometric Gate Stations 1 & 2 synced successfully (182 punches reconciled).');
  }

  protected exportStudentsToCsv(): void {
    const list = this.students();
    let csv = 'RollNo,Name,Program,Section,Category,AttendancePct,CGPA,FeeStatus,ChallanNo\n';
    list.forEach(s => {
      csv += `${s.rollNo},"${s.name}","${s.program}","${s.section}","${s.category}",${s.attendancePct},${s.cgpa},"${s.feeStatus}","${s.challanNo}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'University_Student_Roster_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Student roster exported to University_Student_Roster_2026.csv');
  }

  protected printDossier(): void {
    window.print();
  }

  protected showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set('');
      }
    }, 3500);
  }

  protected submitNewStudent(event: Event): void {
    event.preventDefault();
    const student: StudentRecord = {
      rollNo: this.newStudentData.rollNo,
      name: this.newStudentData.name,
      program: this.newStudentData.program,
      semester: 'Semester IV',
      department: 'Computer Applications',
      section: this.newStudentData.section,
      category: this.newStudentData.category,
      cgpa: 8.85,
      attendancePct: 94.0,
      lectureAttended: 158,
      lectureTotal: 168,
      feeStatus: 'Paid',
      feePaidAmount: '₹47,500',
      challanNo: this.newStudentData.challanNo,
      fatherName: this.newStudentData.fatherName,
      contact: this.newStudentData.contact,
      email: this.newStudentData.email,
      admissionDate: 'Today',
      hostelStatus: this.newStudentData.hostelStatus
    };

    this.adminService.addStudent(student);
    this.isAddStudentOpen.set(false);
    this.showToast(`Candidate ${student.name} enrolled with Roll No ${student.rollNo}`);
  }

  protected submitNewNotice(event: Event): void {
    event.preventDefault();
    const notice = {
      id: `NOT-2026-${Math.floor(100 + Math.random() * 900)}`,
      circularRef: this.newNoticeData.circularRef,
      title: this.newNoticeData.title,
      date: 'Today',
      category: this.newNoticeData.category,
      issuedBy: 'Office of Dean (Academics)',
      priority: this.newNoticeData.priority,
      content: this.newNoticeData.content
    };

    this.adminService.addNotice(notice);
    this.isNoticeModalOpen.set(false);
    this.showToast(`Circular "${notice.title}" broadcasted to portal.`);
  }
}
