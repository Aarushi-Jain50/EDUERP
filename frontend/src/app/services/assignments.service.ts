import { Injectable, signal, inject, computed } from '@angular/core';
import { StudentsService } from './students.service';

export type AssignmentStatus = 'Active' | 'Closed' | 'Overdue';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  assignedOn: string;
  dueDate: string;
  maxMarks: number;
  status: AssignmentStatus;
}

@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly studentsService = inject(StudentsService);

  private _assignments = signal<Assignment[]>([
    {
      id: 'as-1',
      title: 'Implementation of AVL Trees',
      description: 'Implement AVL Tree insertion and rotation logic in C++.',
      subjectId: 'sub-1',
      subjectName: 'Advanced Data Structures & Algorithms',
      sectionId: 'sec-1',
      sectionName: 'Section A',
      assignedOn: '2026-11-01',
      dueDate: '2026-11-20',
      maxMarks: 10,
      status: 'Active'
    },
    {
      id: 'as-2',
      title: 'Angular Component Architecture',
      description: 'Create a reusable dashboard layout using Angular Signals.',
      subjectId: 'sub-2',
      subjectName: 'Enterprise Web Application Architecture',
      sectionId: 'sec-1',
      sectionName: 'Section A',
      assignedOn: '2026-11-05',
      dueDate: '2026-11-15',
      maxMarks: 20,
      status: 'Active'
    },
    {
      id: 'as-3',
      title: 'Full Stack Integration',
      description: 'Connect your Angular frontend to a Node.js Express API.',
      subjectId: 'sub-3',
      subjectName: 'Full Stack Development Lab',
      sectionId: 'sec-1',
      sectionName: 'Section A',
      assignedOn: '2025-10-10',
      dueDate: '2025-10-25',
      maxMarks: 50,
      status: 'Closed'
    }
  ]);

  readonly assignments = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return this._assignments().map(a => {
      if (a.status === 'Closed') return a;
      
      const due = new Date(a.dueDate);
      due.setHours(0, 0, 0, 0);
      
      if (now > due) {
        return { ...a, status: 'Overdue' as AssignmentStatus };
      }
      return a;
    });
  });

  add(assignment: Omit<Assignment, 'id'>): void {
    const newId = `as-${Date.now()}`;
    this._assignments.update(list => [{ ...assignment, id: newId }, ...list]);
    this.studentsService.showToast('success', `Assignment "${assignment.title}" created.`);
  }

  update(id: string, assignment: Omit<Assignment, 'id'>): void {
    this._assignments.update(list => list.map(a => a.id === id ? { ...assignment, id } : a));
    this.studentsService.showToast('success', `Assignment "${assignment.title}" updated.`);
  }

  delete(id: string): void {
    const a = this._assignments().find(item => item.id === id);
    this._assignments.update(list => list.filter(item => item.id !== id));
    if (a) {
      this.studentsService.showToast('info', `Assignment "${a.title}" deleted.`);
    }
  }
}
