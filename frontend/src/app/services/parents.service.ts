import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Parent } from '../models/faculty-parent.model';
import { StudentsService } from './students.service';
import { ActivityService } from './activity.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

const SEED_PARENTS: Parent[] = [
  {
    id: 'par-1',
    name: 'Sanjay Verma',
    initials: 'SV',
    relation: 'Father',
    phone: '9811223344',
    email: 'sanjay.verma@gmail.com',
    occupation: 'Business / IT Consultant',
    address: 'Flat 402, Green Park Apartments, New Delhi',
    studentIds: ['stu-1', 'stu-21'],
    studentNames: ['Rahul Verma', 'Aanya Verma'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-2',
    name: 'Rakesh Sharma',
    initials: 'RS',
    relation: 'Father',
    phone: '9812300000',
    email: 'rakesh.sharma@yahoo.com',
    occupation: 'Senior Civil Engineer',
    address: 'House No 45, Sector 15, Chandigarh',
    studentIds: ['stu-2'],
    studentNames: ['Ananya Sharma'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-3',
    name: 'Subhash Das',
    initials: 'SD',
    relation: 'Father',
    phone: '9765400000',
    email: 'subhash.das@outlook.com',
    occupation: 'Chartered Accountant',
    address: 'B-12, Salt Lake City, Kolkata',
    studentIds: ['stu-3'],
    studentNames: ['Priyanshu Das'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-4',
    name: 'Kirit Patel',
    initials: 'KP',
    relation: 'Father',
    phone: '9898700000',
    email: 'kirit.patel@rediffmail.com',
    occupation: 'Textile Business Owner',
    address: 'Plot 108, CG Road, Ahmedabad',
    studentIds: ['stu-4'],
    studentNames: ['Meera Patel'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-5',
    name: 'Vijay Kulkarni',
    initials: 'VK',
    relation: 'Father',
    phone: '9822000000',
    email: 'vijay.kulkarni@gmail.com',
    occupation: 'Branch Manager SBI',
    address: 'Flat 12, FC Road, Pune',
    studentIds: ['stu-5'],
    studentNames: ['Rohan Kulkarni'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-6',
    name: 'Gopalakrishnan Nair',
    initials: 'GN',
    relation: 'Father',
    phone: '9447000000',
    email: 'gopal.nair@gmail.com',
    occupation: 'Retd. Defence Officer',
    address: 'TC 14/200, Kowdiar, Thiruvananthapuram',
    studentIds: ['stu-6'],
    studentNames: ['Sneha Nair'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-7',
    name: 'Dinesh Joshi',
    initials: 'DJ',
    relation: 'Father',
    phone: '9988700000',
    email: 'dinesh.joshi@gmail.com',
    occupation: 'Advocate High Court',
    address: '14, Civil Lines, Jaipur',
    studentIds: ['stu-7'],
    studentNames: ['Aditya Joshi'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-8',
    name: 'Alok Saxena',
    initials: 'AS',
    relation: 'Father',
    phone: '9839000000',
    email: 'alok.saxena@gmail.com',
    occupation: 'Senior Government Officer',
    address: '22, Hazratganj, Lucknow',
    studentIds: ['stu-8'],
    studentNames: ['Pooja Saxena'],
    status: 'Active',
    verified: true
  },
  {
    id: 'par-9',
    name: 'Debashis Roy',
    initials: 'DR',
    relation: 'Father',
    phone: '9830000000',
    email: 'debashis.roy@gmail.com',
    occupation: 'Senior Physician / Doctor',
    address: 'Southern Avenue, Kolkata',
    studentIds: ['stu-9'],
    studentNames: ['Vikramaditya Roy'],
    status: 'Active',
    verified: false
  },
  {
    id: 'par-10',
    name: 'Pranab Banerjee',
    initials: 'PB',
    relation: 'Father',
    phone: '9831100000',
    email: 'pranab.b@gmail.com',
    occupation: 'Principal Architect',
    address: 'Gariahat Road, Kolkata',
    studentIds: ['stu-12'],
    studentNames: ['Ishita Banerjee'],
    status: 'Active',
    verified: true
  }
];

@Injectable({
  providedIn: 'root'
})
export class ParentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly activityService = inject(ActivityService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _parentsList = signal<Parent[]>([]);
  private readonly parentsSync = new FirestoreCollectionSync<Parent>(
    'parents',
    'eduerp_parents_v2',
    this._parentsList,
    this.isBrowser
  );

  readonly parentsList = this._parentsList.asReadonly();

  constructor() {
    this._parentsList.set(this.parentsSync.loadInitial(SEED_PARENTS));
    this.parentsSync.startSync();
  }

  readonly parentStats = computed(() => {
    const parents = this._parentsList();
    const allStudents = this.studentsService.students();

    const linkedStudentIdSet = new Set<string>();
    parents.forEach(p => p.studentIds.forEach(id => linkedStudentIdSet.add(id)));

    const linkedStudentsCount = linkedStudentIdSet.size;
    const unlinkedStudentsCount = Math.max(0, allStudents.length - linkedStudentsCount);

    return {
      totalParents: parents.length,
      linkedStudents: linkedStudentsCount,
      unlinkedStudents: unlinkedStudentsCount
    };
  });

  private generateInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  saveParent(
    parentData: Omit<Parent, 'id' | 'initials' | 'studentNames'>,
    editId?: string
  ): { success: boolean; error?: string } {
    if (parentData.studentIds.length === 0) {
      return { success: false, error: 'At least one student must be linked to this parent profile.' };
    }

    const cleanEmail = parentData.email.trim().toLowerCase();
    const initials = this.generateInitials(parentData.name);

    const allStudents = this.studentsService.students();
    const studentNames = parentData.studentIds.map(stId => {
      const match = allStudents.find(s => s.id === stId);
      return match ? match.name : 'Unknown Student';
    });

    const record: Parent = editId
      ? { ...parentData, email: cleanEmail, initials, studentNames, id: editId }
      : { ...parentData, email: cleanEmail, initials, studentNames, id: `par-${Date.now()}` };

    if (editId) {
      this._parentsList.update(list => list.map(p => (p.id === editId ? record : p)));
    } else {
      this._parentsList.update(list => [record, ...list]);
    }
    this.parentsSync.syncUpsert(record);

    this.activityService.logActivity({
      user: 'Admin (Dean Office)',
      role: 'System Administrator',
      operationType: editId ? 'Update' : 'Create',
      action: editId ? 'updated guardian profile' : 'registered guardian profile',
      target: `${record.name} (${record.studentNames.join(', ')})`,
      recordId: record.id,
      module: 'Parents Directory',
      category: 'People',
      icon: 'family_restroom'
    });

    return { success: true };
  }

  toggleParentVerification(id: string): void {
    const target = this._parentsList().find(p => p.id === id);
    if (!target) return;
    const updated: Parent = { ...target, verified: !target.verified };
    this._parentsList.update(list => list.map(p => (p.id === id ? updated : p)));
    this.parentsSync.syncUpsert(updated);
  }

  toggleParentStatus(id: string): void {
    const target = this._parentsList().find(p => p.id === id);
    if (!target) return;
    const updated: Parent = { ...target, status: target.status === 'Active' ? 'Inactive' : 'Active' };
    this._parentsList.update(list => list.map(p => (p.id === id ? updated : p)));
    this.parentsSync.syncUpsert(updated);
  }

  deleteParent(id: string): { success: boolean } {
    const target = this._parentsList().find(p => p.id === id);
    this._parentsList.update(list => list.filter(p => p.id !== id));
    this.parentsSync.syncDelete(id);
    if (target) {
      this.activityService.logActivity({
        user: 'Admin (Dean Office)',
        role: 'System Administrator',
        operationType: 'Delete',
        action: 'removed guardian profile',
        target: target.name,
        recordId: target.id,
        module: 'Parents Directory',
        category: 'People',
        icon: 'delete'
      });
    }
    return { success: true };
  }
}
