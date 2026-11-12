import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { DataToolbar, FilterOption } from '../../../components/shared/data-toolbar';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { FinanceService } from '../../../services/finance.service';
import { AcademicService } from '../../../services/academic.service';
import { NotificationService } from '../../../services/notification.service';
import { formatCurrency } from '../../../utils/money.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pending-fees-page',
  imports: [CommonModule, PageHeader, StatStrip, DataToolbar, DataTable],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans">
      <app-page-header title="Pending Fees" subtitle="Monitor outstanding student dues, tracking defaulters and payment aging." primaryActionLabel="Send Reminders" (primaryActionClicked)="sendBulkReminders()" />
      
      <app-stat-strip [items]="stats()" />

      <app-data-toolbar 
        [filter1Value]="selectedCourse()"
        [filter1Options]="courseOptions()"
        (filter1Change)="selectedCourse.set($event)"
        [filter2Value]="agingFilter()"
        [filter2Options]="agingOptions"
        (filter2Change)="agingFilter.set($event)"
        searchPlaceholder="Search student..."
        [searchValue]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
      />

      <app-data-table 
        [columns]="columns" 
        [data]="defaulters()" 
        idKey="studentId" 
        (viewClicked)="collectFees($event)"
        (editClicked)="sendReminder($event)"
      />
    </div>
  `
})
export class PendingFeesPage {
  protected readonly financeService = inject(FinanceService);
  protected readonly academicService = inject(AcademicService);
  protected readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly searchQuery = signal('');
  protected readonly selectedCourse = signal('All');
  protected readonly agingFilter = signal('All');

  protected readonly agingOptions: FilterOption[] = [
    { label: 'Aging: All', value: 'All' },
    { label: '0-30 Days', value: '0-30' },
    { label: '31-60 Days', value: '31-60' },
    { label: '60+ Days', value: '60+' }
  ];

  protected readonly courseOptions = computed<FilterOption[]>(() => [
    { label: 'Course: All', value: 'All' },
    ...this.academicService.courses().map(c => ({ label: c.name, value: c.id }))
  ]);

  protected readonly stats = computed<StatItem[]>(() => {
    const list = this.defaulters();
    const totalDue = list.reduce((acc, d) => acc + d.totalDue, 0);
    const critical = list.filter(d => d.agingDays > 60).length;
    
    return [
      { label: 'Outstanding Dues', value: formatCurrency(totalDue), icon: 'warning', iconColorClass: 'text-rose-600', iconBgClass: 'bg-rose-50 border-rose-100' },
      { label: 'Defaulters', value: list.length, icon: 'people', iconColorClass: 'text-indigo-600', iconBgClass: 'bg-indigo-50 border-indigo-100' },
      { label: 'Overdue 60+ Days', value: critical, icon: 'error_outline', iconColorClass: 'text-amber-600', iconBgClass: 'bg-amber-50 border-amber-100' }
    ];
  });

  protected readonly defaulters = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.selectedCourse();
    const age = this.agingFilter();
    const today = new Date();

    return this.financeService.ledgers().map(l => {
      const unpaidInsts = l.installments.filter(i => i.status !== 'Paid');
      if (unpaidInsts.length === 0) return null;

      const totalDue = unpaidInsts.reduce((acc, i) => acc + (i.totalAmount - i.paidAmount), 0);
      const oldestDueDate = new Date(Math.min(...unpaidInsts.map(i => new Date(i.dueDate).getTime())));
      const agingDays = Math.max(0, Math.floor((today.getTime() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24)));

      let agingPill = 'bg-slate-100 text-slate-600';
      if (agingDays > 60) agingPill = 'bg-rose-100 text-rose-700';
      else if (agingDays > 30) agingPill = 'bg-amber-100 text-amber-700';

      return {
        ...l,
        totalDue,
        totalDueDisplay: formatCurrency(totalDue),
        agingDays,
        overdueSince: oldestDueDate.toISOString().split('T')[0],
        agingPill,
        lastPayment: 'No payment recorded'
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
    { key: 'overdueSince', header: 'Overdue Since' },
    { key: 'agingDays', header: 'Aging (Days)', align: 'center' },
    { key: 'lastPayment', header: 'Last Payment' }
  ];

  collectFees(d: { studentId: string }) {
    // Navigate to fee collection and eventually pre-select this student
    this.router.navigate(['/admin/fee-collection'], { queryParams: { studentId: d.studentId } });
  }

  sendReminder(d: { studentName: string; totalDue: number; overdueSince: string }) {
    this.notificationService.add({
      title: 'Fee Payment Reminder',
      description: `Dear ${d.studentName}, you have outstanding dues of ${formatCurrency(d.totalDue)} overdue since ${d.overdueSince}. Please clear them immediately.`,
      type: 'Fees',
      priority: 'High',
      icon: 'notifications_active'
    });
  }

  sendBulkReminders() {
    this.defaulters().forEach(d => {
      if (d) this.sendReminder(d);
    });
  }
}
