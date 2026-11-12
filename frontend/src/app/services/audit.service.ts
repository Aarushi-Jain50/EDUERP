import { Injectable, signal } from '@angular/core';

export type AuditAction = 'Create' | 'Update' | 'Delete' | 'Login' | 'Logout' | 'Failed Login' | 'Export' | 'Permission Change';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  role: string;
  module: string;
  action: AuditAction;
  target: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  status: 'Success' | 'Failure';
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly _entries = signal<AuditEntry[]>(this.generateSeedData());

  readonly entries = this._entries.asReadonly();

  log(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'ipAddress'>): void {
    const newEntry: AuditEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
    };
    this._entries.update(prev => [newEntry, ...prev]);
  }

  getAll(): AuditEntry[] {
    return this._entries();
  }

  getByUser(userId: string): AuditEntry[] {
    return this._entries().filter(e => e.userId === userId);
  }

  private generateSeedData(): AuditEntry[] {
    const data: AuditEntry[] = [];
    const modules = ['Admissions', 'Fees', 'Attendance', 'Exams', 'Settings', 'Students'];
    const users = [
      { id: 'u1', name: 'Administrator', role: 'Super Admin' },
      { id: 'u2', name: 'Suresh Patil', role: 'Accounts Officer' },
      { id: 'u3', name: 'Kavita Nair', role: 'Registrar' }
    ];
    const actions: AuditAction[] = ['Create', 'Update', 'Delete', 'Login', 'Export', 'Permission Change'];

    for (let i = 0; i < 60; i++) {
      const user = users[i % users.length];
      const date = new Date();
      date.setMinutes(date.getMinutes() - (i * 25));
      
      data.push({
        id: `log-seed-${i}`,
        timestamp: date,
        userId: user.id,
        userName: user.name,
        role: user.role,
        module: modules[i % modules.length],
        action: actions[i % actions.length],
        target: `Record #${1000 + i}`,
        oldValue: i % 2 === 0 ? 'Old Data' : undefined,
        newValue: i % 2 === 0 ? 'New Data' : undefined,
        ipAddress: `103.22.11.${Math.floor(Math.random() * 254)}`,
        status: i % 10 === 0 ? 'Failure' : 'Success'
      });
    }
    return data;
  }
}
