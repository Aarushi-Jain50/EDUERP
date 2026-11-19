import { Injectable, signal, computed, inject } from '@angular/core';
import { Parent } from '../models/faculty-parent.model';
import { StudentsService } from './students.service';

@Injectable({
  providedIn: 'root'
})
export class ParentsService {
  private readonly studentsService = inject(StudentsService);

  // Initial Parents Mock Data
  private readonly _parentsList = signal<Parent[]>([
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
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
      status: 'Active'
    }
  ]);

  readonly parentsList = this._parentsList.asReadonly();

  // Computed Stats for Parents Page
  readonly parentStats = computed(() => {
    const parents = this._parentsList();
    const allStudents = this.studentsService.students();

    // Set of all student IDs linked to at least one parent
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

  saveParent(parentData: Omit<Parent, 'id' | 'initials' | 'studentNames'>, editId?: string): { success: boolean; error?: string } {
    if (parentData.studentIds.length === 0) {
      return { success: false, error: 'At least one student must be linked to this parent profile.' };
    }

    const cleanEmail = parentData.email.trim().toLowerCase();
    const initials = this.generateInitials(parentData.name);

    // Map studentIds to studentNames from StudentsService
    const allStudents = this.studentsService.students();
    const studentNames = parentData.studentIds.map(stId => {
      const match = allStudents.find(s => s.id === stId);
      return match ? match.name : 'Unknown Student';
    });

    if (editId) {
      this._parentsList.update(list =>
        list.map(p => (p.id === editId ? { ...parentData, email: cleanEmail, initials, studentNames, id: editId } : p))
      );
    } else {
      const newParent: Parent = {
        ...parentData,
        email: cleanEmail,
        initials,
        studentNames,
        id: `par-${Date.now()}`
      };
      this._parentsList.update(list => [newParent, ...list]);
    }

    return { success: true };
  }

  deleteParent(id: string): { success: boolean } {
    this._parentsList.update(list => list.filter(p => p.id !== id));
    return { success: true };
  }
}
