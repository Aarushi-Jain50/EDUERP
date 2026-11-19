import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { StatusBadge } from './status-badge';
import { EmptyState } from './empty-state';

export interface TableCustomAction<T = unknown> {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
  showIf?: (row: T) => boolean;
}

export interface TableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  isBadge?: boolean;
  isAvatarCell?: boolean;
  isTagListCell?: boolean;
  tagsArrayKey?: string;
  avatarInitialsKey?: string;
  subtextKey?: string;
  isMono?: boolean;
  isBold?: boolean;
  customClass?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-data-table',
  imports: [StatusBadge, EmptyState],
  host: {
    class: 'block'
  },
  template: `
    <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden font-sans">
      
      <!-- Mobile Card View (< md) -->
      <div class="md:hidden">
        @if (totalItems() > 0) {
          <div class="divide-y divide-slate-200/80">
            @for (row of pagedData(); track getRowId(row, $index)) {
              <div class="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                <!-- Primary Row + Status + Actions -->
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1 space-y-1">
                    @if (columns().length > 0) {
                      @let primaryCol = columns()[0];
                      @if (primaryCol.isAvatarCell) {
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-[11px] font-bold text-indigo-700 uppercase shrink-0">
                            {{ getCellValue(row, primaryCol.avatarInitialsKey || 'initials') }}
                          </div>
                          <div class="min-w-0">
                            <div class="font-semibold text-slate-900 leading-tight truncate">{{ getCellValue(row, primaryCol.key) }}</div>
                            @if (primaryCol.subtextKey) {
                              <div class="text-[11px] text-slate-500 truncate mt-0.5">{{ getCellValue(row, primaryCol.subtextKey) }}</div>
                            }
                          </div>
                        </div>
                      } @else {
                        <div class="flex items-center gap-2 flex-wrap">
                          <span
                            class="text-[13px] font-semibold text-slate-900 break-all"
                            [class.font-mono]="primaryCol.isMono"
                          >
                            {{ getCellValue(row, primaryCol.key) }}
                          </span>
                          @for (badgeCol of columns(); track badgeCol.key) {
                            @if (badgeCol.isBadge) {
                              <app-status-badge [status]="getCellValue(row, badgeCol.key)" />
                            }
                          }
                        </div>
                      }
                    }
                  </div>

                  <div class="relative shrink-0">
                    @if (hideEdit() && hideDelete() && customActions().length === 0) {
                      <button
                        type="button"
                        (click)="onAction('view', row)"
                        class="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span class="material-icons text-sm">visibility</span>
                        <span>View</span>
                      </button>
                    } @else {
                      <button
                        type="button"
                        aria-label="Row actions"
                        (click)="toggleMenu(getRowId(row, $index), $event)"
                        class="w-9 h-9 rounded-lg text-[#64748B] hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span class="material-icons text-base">more_vert</span>
                      </button>

                      @if (openMenuId() === getRowId(row, $index)) {
                        <button
                          type="button"
                          aria-label="Close action menu overlay"
                          class="fixed inset-0 z-20 cursor-default w-full h-full border-0 bg-transparent p-0 m-0"
                          (click)="closeMenu()"
                        ></button>

                        <div
                          class="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1 z-30 text-xs font-medium text-slate-700 text-left animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            (click)="onAction('view', row)"
                            class="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                          >
                            <span class="material-icons text-sm text-[#64748B]">visibility</span>
                            <span>View Details</span>
                          </button>

                          @if (customActions().length > 0) {
                            @for (act of customActions(); track act.id) {
                              @if (!act.showIf || act.showIf(row)) {
                                <button
                                  type="button"
                                  (click)="onCustomAction(act.id, row)"
                                  class="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 cursor-pointer text-slate-700"
                                  [class.hover:text-indigo-600]="!act.danger"
                                  [class.hover:bg-red-50]="act.danger"
                                  [class.text-red-600]="act.danger"
                                >
                                  <span class="material-icons text-sm" [class.text-red-500]="act.danger" [class.text-[#64748B]]="!act.danger">{{ act.icon }}</span>
                                  <span>{{ act.label }}</span>
                                </button>
                              }
                            }
                          }

                          @if (!hideEdit()) {
                            <button
                              type="button"
                              (click)="onAction('edit', row)"
                              class="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                            >
                              <span class="material-icons text-sm text-[#64748B]">edit</span>
                              <span>Edit</span>
                            </button>
                          }

                          @if (!hideDelete()) {
                            <div class="h-px bg-slate-100 my-1"></div>
                            <button
                              type="button"
                              (click)="onAction('delete', row)"
                              class="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 text-red-600 cursor-pointer"
                            >
                              <span class="material-icons text-sm text-red-500">delete</span>
                              <span>Delete</span>
                            </button>
                          }
                        </div>
                      }
                    }
                  </div>
                </div>

                <!-- Secondary Columns Grid -->
                <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  @for (col of columns().slice(1); track col.key) {
                    @if (!col.isBadge) {
                      <div class="min-w-0">
                        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{{ col.header }}</p>
                        @if (col.isTagListCell) {
                          <div class="flex items-center gap-1 flex-wrap mt-0.5">
                            @for (tag of getCellTagsArray(row, col.tagsArrayKey || col.key).slice(0, 2); track tag) {
                              <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium truncate max-w-[120px]">
                                {{ tag }}
                              </span>
                            }
                          </div>
                        } @else {
                          <p
                            class="mt-0.5 truncate tabular-nums"
                            [class.font-mono]="col.isMono"
                            [class.font-semibold]="col.isBold"
                            [class.text-slate-900]="col.isBold"
                            [class.text-slate-700]="!col.isBold"
                          >
                            {{ getCellValue(row, col.key) }}
                          </p>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <app-empty-state
            [icon]="emptyIcon()"
            [title]="emptyTitle()"
            [message]="emptyMessage()"
            [actionLabel]="emptyActionLabel()"
            (actionClicked)="emptyActionClicked.emit()"
          />
        }
      </div>

      <!-- Table Viewport (Tablet & Desktop >= md) -->
      <div class="hidden md:block overflow-x-auto">
        @if (totalItems() > 0) {
          <table class="w-full text-left border-collapse">
            <!-- Sticky Header (40px / h-10) -->
            <thead class="sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 border-b border-slate-200">
              <tr class="h-10 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                @for (col of columns(); track col.key) {
                  <th
                    scope="col"
                    class="px-4 py-2.5 whitespace-nowrap"
                    [class.text-right]="col.align === 'right'"
                    [class.text-center]="col.align === 'center'"
                  >
                    {{ col.header }}
                  </th>
                }
                <th scope="col" class="px-4 py-2.5 text-right w-16 whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <!-- Table Body with compact rows and crisp hairline dividers -->
            <tbody class="divide-y divide-slate-200/80 text-[13px]">
              @for (row of pagedData(); track getRowId(row, $index)) {
                <tr class="h-11 hover:bg-slate-50/80 transition-colors">
                  @for (col of columns(); track col.key; let first = $first) {
                    <td
                      class="px-4 py-3 truncate max-w-xs tabular-nums whitespace-nowrap"
                      [class.text-right]="col.align === 'right'"
                      [class.text-center]="col.align === 'center'"
                      [class.font-mono]="col.isMono"
                      [class.font-medium]="col.isBold || first"
                      [class.text-slate-900]="col.isBold || first"
                      [class.text-slate-600]="!col.isBold && !first"
                    >
                      @if (col.isBadge) {
                        <app-status-badge [status]="getCellValue(row, col.key)" />
                      } @else if (col.isAvatarCell) {
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-[11px] font-bold text-indigo-700 uppercase shrink-0">
                            {{ getCellValue(row, col.avatarInitialsKey || 'initials') }}
                          </div>
                          <div class="truncate">
                            <div class="font-semibold text-slate-900 leading-tight truncate">{{ getCellValue(row, col.key) }}</div>
                            @if (col.subtextKey) {
                              <div class="text-[11px] text-slate-500 font-normal truncate mt-0.5">{{ getCellValue(row, col.subtextKey) }}</div>
                            }
                          </div>
                        </div>
                      } @else if (col.isTagListCell) {
                        <div class="flex items-center gap-1 flex-wrap">
                          @let tags = getCellTagsArray(row, col.tagsArrayKey || col.key);
                          @for (tag of tags.slice(0, 2); track tag) {
                            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-medium truncate max-w-[130px]">
                              {{ tag }}
                            </span>
                          }
                          @if (tags.length > 2) {
                            <span class="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                              +{{ tags.length - 2 }}
                            </span>
                          }
                        </div>
                      } @else {
                        <span>{{ getCellValue(row, col.key) }}</span>
                      }
                    </td>
                  }

                  <!-- 3-Dot Action Menu -->
                  <td class="px-4 py-2 text-right relative">
                    <button
                      type="button"
                      aria-label="Row actions"
                      (click)="toggleMenu(getRowId(row, $index), $event)"
                      class="w-7 h-7 rounded-lg text-[#64748B] hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer ml-auto"
                    >
                      <span class="material-icons text-base">more_vert</span>
                    </button>

                    <!-- Dropdown Popover -->
                    @if (openMenuId() === getRowId(row, $index)) {
                      <button
                        type="button"
                        aria-label="Close action menu overlay"
                        class="fixed inset-0 z-20 cursor-default w-full h-full border-0 bg-transparent p-0 m-0"
                        (click)="closeMenu()"
                      ></button>

                      <div
                        class="absolute right-4 top-10 w-44 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1 z-30 text-xs font-medium text-slate-700 text-left animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          (click)="onAction('view', row)"
                          class="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                        >
                          <span class="material-icons text-sm text-[#64748B]">visibility</span>
                          <span>View Details</span>
                        </button>

                        @if (customActions().length > 0) {
                          @for (act of customActions(); track act.id) {
                            @if (!act.showIf || act.showIf(row)) {
                              <button
                                type="button"
                                (click)="onCustomAction(act.id, row)"
                                class="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 cursor-pointer text-slate-700"
                                [class.hover:text-indigo-600]="!act.danger"
                                [class.hover:bg-red-50]="act.danger"
                                [class.text-red-600]="act.danger"
                              >
                                <span class="material-icons text-sm" [class.text-red-500]="act.danger" [class.text-[#64748B]]="!act.danger">{{ act.icon }}</span>
                                <span>{{ act.label }}</span>
                              </button>
                            }
                          }
                        }

                        @if (!hideEdit()) {
                          <button
                            type="button"
                            (click)="onAction('edit', row)"
                            class="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
                          >
                            <span class="material-icons text-sm text-[#64748B]">edit</span>
                            <span>Edit</span>
                          </button>
                        }

                        @if (!hideDelete()) {
                          <div class="h-px bg-slate-100 my-1"></div>
                          <button
                            type="button"
                            (click)="onAction('delete', row)"
                            class="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 text-red-600 cursor-pointer"
                          >
                            <span class="material-icons text-sm text-red-500">delete</span>
                            <span>Delete</span>
                          </button>
                        }
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <!-- Empty State -->
          <app-empty-state
            [icon]="emptyIcon()"
            [title]="emptyTitle()"
            [message]="emptyMessage()"
            [actionLabel]="emptyActionLabel()"
            (actionClicked)="emptyActionClicked.emit()"
          />
        }
      </div>

      <!-- Footer with Client-side Pagination (Exactly 8 rows per page) -->
      @if (totalItems() > 0) {
        <div class="px-4 sm:px-6 py-3 border-t border-[#E2E8F0] bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing <span class="font-semibold text-slate-800">{{ rangeStart() }}</span> to
            <span class="font-semibold text-slate-800">{{ rangeEnd() }}</span> of
            <span class="font-semibold text-slate-800">{{ totalItems() }}</span> entries
          </div>

          <div class="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)"
              class="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <span class="material-icons text-sm">chevron_left</span>
              <span>Prev</span>
            </button>

            <span class="px-3 py-1 font-medium text-slate-800">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>

            <button
              type="button"
              [disabled]="currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)"
              class="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <span>Next</span>
              <span class="material-icons text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class DataTable<T extends object> {
  readonly columns = input.required<TableColumn[]>();
  readonly data = input.required<T[]>();
  readonly idKey = input<string>('id');

  readonly hideEdit = input<boolean>(false);
  readonly hideDelete = input<boolean>(false);
  readonly customActions = input<TableCustomAction<T>[]>([]);

  readonly emptyIcon = input<string>('inbox');
  readonly emptyTitle = input<string>('No records found');
  readonly emptyMessage = input<string>('Try adjusting search or filters.');
  readonly emptyActionLabel = input<string>('');

  readonly viewClicked = output<T>();
  readonly editClicked = output<T>();
  readonly deleteClicked = output<T>();
  readonly customActionClicked = output<{ actionId: string; row: T }>();
  readonly emptyActionClicked = output<void>();

  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = 8;
  protected readonly openMenuId = signal<string | null>(null);

  protected readonly totalItems = computed(() => this.data().length);

  protected readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.totalItems() / this.pageSize));
  });

  protected readonly pagedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.data().slice(start, start + this.pageSize);
  });

  protected readonly rangeStart = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  protected readonly rangeEnd = computed(() => {
    return Math.min(this.currentPage() * this.pageSize, this.totalItems());
  });

  protected getRowId(row: T, index: number): string {
    const key = this.idKey();
    if (row) {
      const val = (row as Record<string, unknown>)[key];
      if (val !== undefined && val !== null) {
        return String(val);
      }
    }
    return `row-${index}`;
  }

  protected getCellValue(row: T, key: string): string {
    if (!row) {
      return '';
    }
    const val = (row as Record<string, unknown>)[key];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  }

  protected getCellTagsArray(row: T, key: string): string[] {
    if (!row) return [];
    const val = (row as Record<string, unknown>)[key];
    if (Array.isArray(val)) return val.map(v => String(v));
    if (typeof val === 'string' && val.length > 0) return val.split(',').map(s => s.trim());
    return [];
  }

  protected toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openMenuId() === id) {
      this.openMenuId.set(null);
    } else {
      this.openMenuId.set(id);
    }
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  protected onAction(type: 'view' | 'edit' | 'delete', row: T): void {
    this.closeMenu();
    if (type === 'view') this.viewClicked.emit(row);
    if (type === 'edit') this.editClicked.emit(row);
    if (type === 'delete') this.deleteClicked.emit(row);
  }

  protected onCustomAction(actionId: string, row: T): void {
    this.closeMenu();
    this.customActionClicked.emit({ actionId, row });
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.closeMenu();
    }
  }

  public resetPage(): void {
    this.currentPage.set(1);
    this.closeMenu();
  }
}
