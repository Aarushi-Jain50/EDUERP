import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn, TableCustomAction } from '../../../components/shared/data-table';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { NotificationService } from '../../../services/notification.service';
import { StudentsService } from '../../../services/students.service';
import { formatCurrency } from '../../../utils/money.helper';
import { exportToExcel, exportToPdf } from '../../../utils/export.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pending-fees-page',
  imports: [CommonModule, MatIconModule, PageHeader, StatStrip, DataToolbar, DataTable],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header
        title="Pending Fees & Defaulters"
        subtitle="Monitor overdue installments, payment aging buckets, and dispatch automated dues reminders."
        actionLabel="Send Bulk Reminders"
        actionIcon="notifications_active"
        (actionClicked)="sendBulkReminders()"
      />

      <div class="flex flex-wrap justify-end gap-2 -mt-2">
        <button
          type="button"
          (click)="exportExcel()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-emerald-600">table_view</mat-icon>
          Export Excel
        </button>
        <button
          type="button"
          (click)="exportPdf()"
          class="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <mat-icon class="!text-sm !w-4 !h-4 text-rose-600">picture_as_pdf</mat-icon>
          Defaulters PDF
        </button>
      </div>

      <app-stat-strip [items]="stats()" />

      <app-data-toolbar
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseOptions()"
        (filter1Change)="selectedCourse.set($event)"
        [filter2Value]="agingFilter()"
        [filter2Options]="agingOptions"
        (filter2Change)="agingFilter.set($event)"
        searchPlaceholder="Search student name or roll no..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table
        [columns]="columns"
        [data]="defaulters()"
        idKey="studentId"
        [customActions]="customActions"
        [hideEdit]="true"
        [hideDelete]="true"
        (viewClicked)="collectFees($event)"
        (customActionClicked)="handleAction($event)"
      />
    </div>
  `,
})
export class PendingFeesPage {
  protected readonly financeService = inject(FinanceService);
  protected readonly academicService = inject(AcademicService);
  protected readonly notificationService = inject(NotificationService);
  private readonly studentsService = inject(StudentsService);
  private readonly router = inject(Router);

  protected readonly searchQuery = signal('');
  protected readonly selectedCourse = signal('All');
  protected readonly agingFilter = signal('All');

  protected readonly agingOptions: FilterOption[] = [
    { label: 'Aging: All', value: 'All' },
    { label: '0-30 Days', value: '0-30' },
    { label: '31-60 Days', value: '31-60' },
    { label: '60+ Days', value: '60+' },
  ];

  protected readonly courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id })),
  ]);

  protected readonly customActions: TableCustomAction[] = [
    { id: 'collect', label: 'Collect Fee', icon: 'payments' },
    { id: 'remind', label: 'Send Reminder', icon: 'notifications_active' },
  ];

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.defaulters();
    const totalDue = list.reduce((acc, d) => acc + d.totalDue, 0);
    const critical = list.filter(d => d.agingDays > 60).length;
    const thirtyToSixty = list.filter(d => d.agingDays >= 31 && d.agingDays <= 60).length;

    return [
      { label: 'Outstanding Dues', value: formatCurrency(totalDue), icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
      { label: 'Students with Dues', value: list.length, icon: 'people', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: '31-60 Days Aging', value: thirtyToSixty, icon: 'schedule', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' },
      { label: 'Overdue 60+ Days', value: critical, icon: 'error_outline', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
    ];
  });

  protected readonly defaulters = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.selectedCourse();
    const age = this.agingFilter();
    const today = new Date();

    return this.financeService
      .ledgers()
      .map(l => {
        const unpaidInsts = l.installments.filter(
          i => Math.max(0, i.totalAmount - i.paidAmount - i.concessionAmount) > 0
        );
        if (unpaidInsts.length === 0) return null;

        const totalDue = unpaidInsts.reduce(
          (acc, i) => acc + Math.max(0, i.totalAmount - i.paidAmount - i.concessionAmount),
          0
        );
        const oldestDueDate = new Date(Math.min(...unpaidInsts.map(i => new Date(i.dueDate).getTime())));
        const agingDays = Math.max(0, Math.floor((today.getTime() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24)));
        const lastPay = this.financeService.getLastPaymentByStudent(l.studentId);

        return {
          ...l,
          totalDue,
          totalDueDisplay: formatCurrency(totalDue),
          agingDays,
          agingBucket: agingDays > 60 ? 'Overdue' : agingDays > 30 ? 'Pending' : 'Active',
          overdueSince: oldestDueDate.toISOString().split('T')[0],
          lastPayment: lastPay ? `${lastPay.date} (${formatCurrency(lastPay.total)})` : 'No payment yet',
        };
      })
      .filter((d): d is Exclude<typeof d, null> => {
        if (!d) return false;
        if (c !== 'All' && d.courseId !== c) return false;
        if (q && !d.studentName.toLowerCase().includes(q) && !d.enrollmentNo.toLowerCase().includes(q)) return false;
        if (age !== 'All') {
          if (age === '0-30' && (d.agingDays < 0 || d.agingDays > 30)) return false;
          if (age === '31-60' && (d.agingDays < 31 || d.agingDays > 60)) return false;
          if (age === '60+' && d.agingDays < 61) return false;
        }
        return true;
      });
  });

  protected readonly columns: TableColumn[] = [
    { key: 'studentName', header: 'Student', isBold: true },
    { key: 'enrollmentNo', header: 'Roll No', isMono: true },
    { key: 'totalDueDisplay', header: 'Total Due', align: 'right' },
    { key: 'overdueSince', header: 'Due Since' },
    { key: 'agingDays', header: 'Aging (Days)', align: 'center' },
    { key: 'lastPayment', header: 'Last Payment' },
    { key: 'agingBucket', header: 'Priority', isBadge: true },
  ];

  handleAction(event: { actionId: string; row: unknown }) {
    const item = event.row as { studentId: string; studentName: string; totalDue: number; overdueSince: string };
    if (event.actionId === 'collect') {
      this.collectFees(item);
    } else if (event.actionId === 'remind') {
      this.sendReminder(item);
      this.studentsService.showToast('success', `Fee reminder dispatched to ${item.studentName}.`);
    }
  }

  collectFees(d: { studentId: string }) {
    this.router.navigate(['/admin/fee-collection'], { queryParams: { studentId: d.studentId } });
  }

  sendReminder(d: { studentId: string; studentName: string; totalDue: number; overdueSince: string }) {
    this.notificationService.add({
      title: 'Fee Payment Reminder',
      description: `Dear ${d.studentName}, outstanding fee dues of ${formatCurrency(d.totalDue)} are due since ${d.overdueSince}. Please clear at the earliest.`,
      type: 'Fees',
      priority: 'High',
      icon: 'notifications_active',
      targetRole: 'student',
      targetStudentId: d.studentId,
      link: '/student/fees',
    });
  }

  sendBulkReminders() {
    const list = this.defaulters();
    if (list.length === 0) {
      this.studentsService.showToast('info', 'No pending fee defaulters to notify.');
      return;
    }
    list.forEach(d => this.sendReminder(d));
    this.studentsService.showToast('success', `Dispatched ${list.length} fee reminders to student portals.`);
  }

  exportExcel() {
    exportToExcel(
      this.defaulters().map(d => ({
        RollNo: d.enrollmentNo,
        Student: d.studentName,
        TotalDue: d.totalDue,
        DueSince: d.overdueSince,
        AgingDays: d.agingDays,
        LastPayment: d.lastPayment,
      })),
      'Pending_Fees_Defaulters'
    );
  }

  exportPdf() {
    exportToPdf(
      'Pending Fees & Aging Defaulters Report',
      ['Roll No', 'Student', 'Total Due', 'Due Since', 'Aging (Days)', 'Last Payment'],
      this.defaulters().map(d => [
        d.enrollmentNo,
        d.studentName,
        d.totalDueDisplay,
        d.overdueSince,
        d.agingDays,
        d.lastPayment,
      ]),
      'Pending_Fees_Defaulters'
    );
  }
}
