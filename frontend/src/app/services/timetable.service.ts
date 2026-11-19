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
    { id: 'ts-4', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '12:00', subjectId: 'sub-8', subjectName: 'Artificial Intelligence & ML', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-5', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '14:00', subjectId: 'sub-1', subjectName: 'Data Structures Lab', subjectType: 'Practical', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'Lab-1' },
    { id: 'ts-6', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Mon', periodId: '15:00', subjectId: 'sub-1', subjectName: 'Data Structures Lab', subjectType: 'Practical', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'Lab-1' },

    // Tuesday
    { id: 'ts-7', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '09:00', subjectId: 'sub-2', subjectName: 'Enterprise Web Application Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },
    { id: 'ts-8', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '10:00', subjectId: 'sub-1', subjectName: 'Advanced Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-9', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '11:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'L-102' },
    { id: 'ts-10', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '12:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-102' },
    { id: 'ts-11', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '14:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Practical', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'Lab-2' },
    { id: 'ts-12', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Tue', periodId: '15:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Practical', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'Lab-2' },

    // Wednesday
    { id: 'ts-13', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '09:00', subjectId: 'sub-8', subjectName: 'Artificial Intelligence & ML', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-14', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '10:00', subjectId: 'sub-9', subjectName: 'Cyber Security & Ethics', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'L-104' },
    { id: 'ts-15', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '11:00', subjectId: 'sub-1', subjectName: 'Advanced Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-16', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '12:00', subjectId: 'sub-2', subjectName: 'Enterprise Web Application Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },
    { id: 'ts-17', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '14:00', subjectId: 'sub-8', subjectName: 'AI & Machine Learning Lab', subjectType: 'Practical', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'Lab-3' },
    { id: 'ts-18', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Wed', periodId: '15:00', subjectId: 'sub-8', subjectName: 'AI & Machine Learning Lab', subjectType: 'Practical', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'Lab-3' },

    // Thursday
    { id: 'ts-19', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '09:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'L-101' },
    { id: 'ts-20', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '10:00', subjectId: 'sub-8', subjectName: 'Artificial Intelligence & ML', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-21', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '11:00', subjectId: 'sub-2', subjectName: 'Enterprise Web Application Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-101' },
    { id: 'ts-22', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '12:00', subjectId: 'sub-9', subjectName: 'Cyber Security & Ethics', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'L-104' },
    { id: 'ts-23', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '14:00', subjectId: 'sub-4', subjectName: 'Cloud & DevOps Lab', subjectType: 'Practical', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'Lab-1' },
    { id: 'ts-24', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Thu', periodId: '15:00', subjectId: 'sub-4', subjectName: 'Cloud & DevOps Lab', subjectType: 'Practical', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'Lab-1' },

    // Friday
    { id: 'ts-25', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '09:00', subjectId: 'sub-1', subjectName: 'Advanced Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-101' },
    { id: 'ts-26', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '10:00', subjectId: 'sub-8', subjectName: 'Artificial Intelligence & ML', subjectType: 'Theory', facultyId: 'fac-5', facultyName: 'Dr. Meera Nair', room: 'L-103' },
    { id: 'ts-27', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '11:00', subjectId: 'sub-9', subjectName: 'Cyber Security & Ethics', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'L-104' },
    { id: 'ts-28', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '12:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'L-101' },
    { id: 'ts-29', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '14:00', subjectId: 'sub-9', subjectName: 'Cyber Security Lab', subjectType: 'Practical', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'Lab-4' },
    { id: 'ts-30', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Fri', periodId: '15:00', subjectId: 'sub-9', subjectName: 'Cyber Security Lab', subjectType: 'Practical', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'Lab-4' },

    // Saturday
    { id: 'ts-31', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Sat', periodId: '09:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-102' },
    { id: 'ts-32', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Sat', periodId: '10:00', subjectId: 'sub-9', subjectName: 'Cyber Security & Ethics', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'L-104' },
    { id: 'ts-33', courseId: 'course-mca', semester: 2, sectionId: 'sec-1', day: 'Sat', periodId: '11:00', subjectId: 'sub-3', subjectName: 'Full Stack Development Lab', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'L-101' },

    // MCA Section B (sec-2)
    { id: 'ts-34', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Mon', periodId: '09:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-201' },
    { id: 'ts-35', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Mon', periodId: '10:00', subjectId: 'sub-1', subjectName: 'Advanced Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-201' },
    { id: 'ts-36', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Tue', periodId: '09:00', subjectId: 'sub-2', subjectName: 'Enterprise Web Application Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-201' },
    { id: 'ts-37', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Wed', periodId: '11:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-202' },
    { id: 'ts-38', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Thu', periodId: '10:00', subjectId: 'sub-1', subjectName: 'Advanced Data Structures & Algorithms', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Amit Joshi', room: 'L-201' },
    { id: 'ts-39', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Fri', periodId: '10:00', subjectId: 'sub-4', subjectName: 'Cloud Computing & DevOps', subjectType: 'Elective', facultyId: 'fac-4', facultyName: 'Prof. Sandeep Bansal', room: 'L-202' },
    { id: 'ts-40', courseId: 'course-mca', semester: 2, sectionId: 'sec-2', day: 'Fri', periodId: '14:00', subjectId: 'sub-2', subjectName: 'Enterprise Web Application Architecture', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'L-201' },

    // BCA Semester 2 Section A (sec-3)
    { id: 'ts-41', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Mon', periodId: '09:00', subjectId: 'sub-5', subjectName: 'Discrete Mathematics', subjectType: 'Theory', facultyId: 'fac-4', facultyName: 'Prof. Meena Sharma', room: 'B-101' },
    { id: 'ts-42', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Mon', periodId: '11:00', subjectId: 'sub-10', subjectName: 'Database Management Systems', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'B-102' },
    { id: 'ts-43', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Tue', periodId: '10:00', subjectId: 'sub-6', subjectName: 'Java Programming Lab', subjectType: 'Practical', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'Lab-3' },
    { id: 'ts-44', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Wed', periodId: '09:00', subjectId: 'sub-5', subjectName: 'Discrete Mathematics', subjectType: 'Theory', facultyId: 'fac-4', facultyName: 'Prof. Meena Sharma', room: 'B-101' },
    { id: 'ts-45', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Thu', periodId: '11:00', subjectId: 'sub-10', subjectName: 'Database Management Systems', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'B-102' },
    { id: 'ts-46', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Fri', periodId: '09:00', subjectId: 'sub-5', subjectName: 'Discrete Mathematics', subjectType: 'Theory', facultyId: 'fac-4', facultyName: 'Prof. Meena Sharma', room: 'B-101' },
    { id: 'ts-47', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Fri', periodId: '11:00', subjectId: 'sub-6', subjectName: 'Java Programming Lab', subjectType: 'Practical', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'Lab-3' },
    { id: 'ts-48', courseId: 'course-bca', semester: 2, sectionId: 'sec-3', day: 'Fri', periodId: '14:00', subjectId: 'sub-10', subjectName: 'Database Management Systems', subjectType: 'Theory', facultyId: 'fac-2', facultyName: 'Prof. Ananya Sen', room: 'B-102' },

    // B.Tech CSE Semester 2 Section A (sec-4)
    { id: 'ts-49', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Mon', periodId: '09:00', subjectId: 'sub-7', subjectName: 'Object Oriented Design & C++', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Rajesh Khanna', room: 'C-301' },
    { id: 'ts-50', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Tue', periodId: '10:00', subjectId: 'sub-11', subjectName: 'Operating Systems', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'C-302' },
    { id: 'ts-51', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Wed', periodId: '11:00', subjectId: 'sub-12', subjectName: 'Computer Networks', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'C-303' },
    { id: 'ts-52', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Thu', periodId: '09:00', subjectId: 'sub-7', subjectName: 'Object Oriented Design & C++', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Rajesh Khanna', room: 'C-301' },
    { id: 'ts-53', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Fri', periodId: '10:00', subjectId: 'sub-7', subjectName: 'Object Oriented Design & C++', subjectType: 'Theory', facultyId: 'fac-1', facultyName: 'Dr. Rajesh Khanna', room: 'C-301' },
    { id: 'ts-54', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Fri', periodId: '13:00', subjectId: 'sub-11', subjectName: 'Operating Systems', subjectType: 'Theory', facultyId: 'fac-3', facultyName: 'Dr. S. N. Roy', room: 'C-302' },
    { id: 'ts-55', courseId: 'course-btech-cse', semester: 2, sectionId: 'sec-4', day: 'Fri', periodId: '15:00', subjectId: 'sub-12', subjectName: 'Computer Networks', subjectType: 'Theory', facultyId: 'fac-6', facultyName: 'Dr. R. K. Singh', room: 'C-303' }
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
