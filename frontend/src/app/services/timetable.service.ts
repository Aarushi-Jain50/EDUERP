import { Injectable, signal, inject } from '@angular/core';
import { TimetableEntry } from '../models/timetable.model';
import { StudentsService } from './students.service';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private readonly studentsService = inject(StudentsService);

  private _slots = signal<TimetableEntry[]>([
    // Monday
    { id: 'ts-1', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '09:00', subjectId: 'sub-1', subjectName: 'Advanced Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-2', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '10:00', subjectId: 'sub-2', subjectName: 'Enterprise Web Application Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },
    { id: 'ts-3', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '11:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-102' },
    { id: 'ts-4', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '14:00', subjectId: 'sub-1', subjectName: 'Data Structures Lab', subjectType: 'Practical', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'Lab-1' },
    { id: 'ts-5', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '15:00', subjectId: 'sub-1', subjectName: 'Data Structures Lab', subjectType: 'Practical', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'Lab-1' },

    // Tuesday
    { id: 'ts-6', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '09:00', subjectId: 'sub-2', subjectName: 'Web App Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },
    { id: 'ts-7', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '10:00', subjectId: 'sub-1', subjectName: 'Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-8', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '12:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-102' },
    { id: 'ts-9', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '14:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Practical', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'Lab-2' },
    { id: 'ts-10', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '15:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Practical', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'Lab-2' },

    // Wednesday
    { id: 'ts-11', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '09:00', subjectId: 'sub-5', subjectName: 'Artificial Intelligence', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-12', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '11:00', subjectId: 'sub-1', subjectName: 'Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-13', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '12:00', subjectId: 'sub-2', subjectName: 'Web App Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },

    // Thursday
    { id: 'ts-14', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '10:00', subjectId: 'sub-5', subjectName: 'Artificial Intelligence', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-15', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '11:00', subjectId: 'sub-2', subjectName: 'Web App Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },
    { id: 'ts-16', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '14:00', subjectId: 'sub-4', subjectName: 'DevOps Lab', subjectType: 'Practical', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'Lab-3' },

    // Friday
    { id: 'ts-17', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '09:00', subjectId: 'sub-1', subjectName: 'Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-18', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '10:00', subjectId: 'sub-5', subjectName: 'Artificial Intelligence', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-19', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '12:00', subjectId: 'sub-3', subjectName: 'Full Stack Development', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'L-101' },

    // Saturday
    { id: 'ts-20', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Sat', periodId: '10:00', subjectId: 'sub-6', subjectName: 'Cyber Security', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'L-104' },
    
    // Section B (A few slots)
    { id: 'ts-21', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Mon', periodId: '09:00', subjectId: 'sub-2', subjectName: 'Web App Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-102' }
  ]);

  readonly slots = this._slots.asReadonly();

  isClash(entry: Omit<TimetableEntry, 'id'>, excludeId?: string): { clashing: boolean, message?: string } {
    const slots = this._slots();
    
    // 1. Faculty Clash (Same faculty, same day, same time)
    const facultyClash = slots.find(s => s.id !== excludeId && s.day === entry.day && s.periodId === entry.periodId && s.facultyId === entry.facultyId);
    if (facultyClash) return { clashing: true, message: `Faculty ${entry.facultyName} is already assigned to ${facultyClash.subjectName} in ${facultyClash.room} during this period.` };

    // 2. Room Clash (Same room, same day, same time)
    const roomClash = slots.find(s => s.id !== excludeId && s.day === entry.day && s.periodId === entry.periodId && s.room === entry.room);
    if (roomClash) return { clashing: true, message: `Room ${entry.room} is already occupied by ${roomClash.subjectName} (${roomClash.facultyName}) during this period.` };

    // 3. Section Clash (Same section, same day, same time - redundant but safe)
    const sectionClash = slots.find(s => s.id !== excludeId && s.day === entry.day && s.periodId === entry.periodId && s.sectionId === entry.sectionId && s.courseId === entry.courseId);
    if (sectionClash) return { clashing: true, message: `This section already has a scheduled class (${sectionClash.subjectName}) during this period.` };

    return { clashing: false };
  }

  add(entry: Omit<TimetableEntry, 'id'>): { success: boolean; error?: string } {
    const clash = this.isClash(entry);
    if (clash.clashing) return { success: false, error: clash.message };

    const newId = `ts-${Date.now()}`;
    this._slots.update(list => [...list, { ...entry, id: newId }]);
    this.studentsService.showToast('success', `Timetable entry for ${entry.subjectName} added.`);
    return { success: true };
  }

  update(id: string, entry: Omit<TimetableEntry, 'id'>): { success: boolean; error?: string } {
    const clash = this.isClash(entry, id);
    if (clash.clashing) return { success: false, error: clash.message };

    this._slots.update(list => list.map(s => s.id === id ? { ...entry, id } : s));
    this.studentsService.showToast('success', `Timetable entry updated.`);
    return { success: true };
  }

  delete(id: string): void {
    const entry = this._slots().find(s => s.id === id);
    this._slots.update(list => list.filter(s => s.id !== id));
    if (entry) {
      this.studentsService.showToast('info', `Timetable entry for ${entry.subjectName} removed.`);
    }
  }
}
