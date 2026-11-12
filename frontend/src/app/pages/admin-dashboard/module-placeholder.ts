import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { InputComponent } from '../../components/ui/input';
import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-module-placeholder',
  imports: [Card, Button, InputComponent, FormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Breadcrumb & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span class="text-[#6D42E8]">{{ moduleName() }}</span>
          </div>
          <h1 class="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172554]">{{ moduleName() }} Management</h1>
        </div>
        <div class="flex items-center gap-3">
          <app-button variant="outline" size="sm" icon="filter_list">Filter</app-button>
          <app-button variant="primary" size="sm" icon="add" (clicked)="showAddModal.set(true)">Add New Record</app-button>
        </div>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <app-card title="Total Records" subtitle="Active entries">
          <div class="flex items-center justify-between mt-2">
            <span class="text-2xl font-bold text-[#172554] tabular-nums">248</span>
            <span class="material-icons text-[#6D42E8] text-3xl">folder_shared</span>
          </div>
          <p class="text-xs text-emerald-600 font-semibold mt-2">+12% this month</p>
        </app-card>
        <app-card title="Pending Review" subtitle="Requires verification">
          <div class="flex items-center justify-between mt-2">
            <span class="text-2xl font-bold text-amber-600 tabular-nums">14</span>
            <span class="material-icons text-amber-500 text-3xl">pending</span>
          </div>
          <p class="text-xs text-[#64748B] mt-2">Action required within 48h</p>
        </app-card>
        <app-card title="System Status" subtitle="Database sync">
          <div class="flex items-center justify-between mt-2">
            <span class="text-2xl font-bold text-emerald-600 tabular-nums">Synced</span>
            <span class="material-icons text-emerald-500 text-3xl">cloud_done</span>
          </div>
          <p class="text-xs text-[#64748B] mt-2">Last backup: 10 mins ago</p>
        </app-card>
      </div>

      <!-- Main Data Table Card -->
      <app-card [title]="moduleName() + ' Directory'" subtitle="Showing real-time live database entries">
        <div class="space-y-4">
          <!-- Search & Filter Bar -->
          <div class="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div class="w-full sm:w-80">
              <app-input placeholder="Search records..." icon="search" [(value)]="searchQuery" />
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <app-button variant="outline" size="sm" icon="download">Export CSV</app-button>
              <app-button variant="outline" size="sm" icon="print">Print</app-button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-100 text-[#172554] text-xs font-bold uppercase tracking-wider">
                  <th class="p-4">ID / Code</th>
                  <th class="p-4">Name / Title</th>
                  <th class="p-4">Department</th>
                  <th class="p-4">Status</th>
                  <th class="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                @for (item of sampleRows; track item.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-4 font-mono font-semibold text-[#6D42E8]">{{ item.code }}</td>
                    <td class="p-4 font-bold text-[#172554]">{{ item.name }}</td>
                    <td class="p-4 text-slate-600">{{ item.dept }}</td>
                    <td class="p-4">
                      <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {{ item.status }}
                      </span>
                    </td>
                    <td class="p-4 text-right space-x-2">
                      <button class="text-slate-500 hover:text-[#6D42E8] p-1"><span class="material-icons text-base">visibility</span></button>
                      <button class="text-slate-500 hover:text-blue-600 p-1"><span class="material-icons text-base">edit</span></button>
                      <button class="text-slate-500 hover:text-red-600 p-1"><span class="material-icons text-base">delete</span></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </app-card>
    </div>

    @if (showAddModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close modal overlay" class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0 cursor-default" (click)="showAddModal.set(false)"></button>
        <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg z-10 space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 class="text-lg font-bold text-[#172554]">Add New Record - {{ moduleName() }}</h3>
            <button (click)="showAddModal.set(false)" class="text-slate-400 hover:text-slate-600"><span class="material-icons">close</span></button>
          </div>
          <div class="space-y-4">
            <app-input label="Record Code / ID" placeholder="e.g. REC-2026-001" [required]="true" />
            <app-input label="Record Name / Title" placeholder="e.g. Advanced Enterprise Module" [required]="true" />
            <app-input label="Department / Category" placeholder="e.g. Computer Applications" [required]="true" />
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <app-button variant="outline" size="sm" (clicked)="showAddModal.set(false)">Cancel</app-button>
            <app-button variant="primary" size="sm" (clicked)="showAddModal.set(false)">Save Record</app-button>
          </div>
        </div>
      </div>
    }
  `
})
export class ModulePlaceholder implements OnInit {
  private readonly route = inject(ActivatedRoute);

  protected moduleName = signal<string>('Management Module');
  protected searchQuery = signal<string>('');
  protected showAddModal = signal<boolean>(false);

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data['moduleName']) {
        this.moduleName.set(data['moduleName']);
      }
    });
  }

  protected sampleRows = [
    { id: 1, code: 'ERP-001', name: 'MCA Semester IV Core Curriculum', dept: 'Computer Applications', status: 'Active' },
    { id: 2, code: 'ERP-002', name: 'Cloud Computing Infrastructure', dept: 'Information Technology', status: 'Active' },
    { id: 3, code: 'ERP-003', name: 'Artificial Intelligence & Robotics', dept: 'Computer Science', status: 'Active' },
    { id: 4, code: 'ERP-004', name: 'Financial Ledger & Fee Systems', dept: 'Administration', status: 'Active' },
  ];
}
