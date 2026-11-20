import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TimetableEntry } from '../models/timetable.model';
import { StudentsService } from './students.service';
import { ActivityService } from './activity.service';
import { AuditService } from './audit.service';
import { FirestoreCollectionSync } from '../lib/firestore-collection-sync';

const SEED_SLOTS: TimetableEntry[] = [
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
];

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly activityService = inject(ActivityService);
  private readonly auditService = inject(AuditService);

  private readonly _slots = signal<TimetableEntry[]>([]);
  private readonly slotsSync = new FirestoreCollectionSync<TimetableEntry>(
    'timetableSlots',
    'eduerp_timetable_slots_v1',
    this._slots,
    isPlatformBrowser(this.platformId)
  );

  readonly slots = this._slots.asReadonly();

  readonly roomUtilization = computed(() => {
    const map = new Map<string, number>();
    for (const s of this._slots()) {
      map.set(s.room, (map.get(s.room) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([room, periods]) => ({ room, periods, utilizationPct: Math.min(100, Math.round((periods / 36) * 100)) }))
      .sort((a, b) => b.periods - a.periods);
  });

  constructor() {
    this._slots.set(this.slotsSync.loadInitial(SEED_SLOTS));
    this.slotsSync.startSync();
  }

  getFacultyWeeklySchedule(facultyId: string): TimetableEntry[] {
    return this._slots().filter(s => s.facultyId === facultyId);
  }

  isClash(entry: Omit<TimetableEntry, 'id'>, excludeId?: string): { clashing: boolean; message?: string } {
    const slots = this._slots();
    const cleanRoom = entry.room.trim().toLowerCase();

    const facultyClash = slots.find(
      s => s.id !== excludeId && s.day === entry.day && s.periodId === entry.periodId && s.facultyId === entry.facultyId
    );
    if (facultyClash) {
      return {
        clashing: true,
        message: `Faculty clash: ${entry.facultyName} is already teaching "${facultyClash.subjectName}" in ${facultyClash.room} (${entry.day} ${entry.periodId}).`
      };
    }

    const roomClash = slots.find(
      s =>
        s.id !== excludeId &&
        s.day === entry.day &&
        s.periodId === entry.periodId &&
        s.room.trim().toLowerCase() === cleanRoom
    );
    if (roomClash) {
      return {
        clashing: true,
        message: `Room clash: "${entry.room}" is already occupied by ${roomClash.subjectName} (${roomClash.facultyName}) at ${entry.day} ${entry.periodId}.`
      };
    }

    const sectionClash = slots.find(
      s =>
        s.id !== excludeId &&
        s.day === entry.day &&
        s.periodId === entry.periodId &&
        s.sectionId === entry.sectionId &&
        s.courseId === entry.courseId &&
        s.semester === entry.semester
    );
    if (sectionClash) {
      return {
        clashing: true,
        message: `Section clash: This section already has "${sectionClash.subjectName}" scheduled at ${entry.day} ${entry.periodId}.`
      };
    }

    return { clashing: false };
  }

  add(entry: Omit<TimetableEntry, 'id'>): { success: boolean; error?: string } {
    const clash = this.isClash(entry);
    if (clash.clashing) return { success: false, error: clash.message };

    const newId = `ts-${Date.now()}`;
    const created: TimetableEntry = { ...entry, id: newId };
    this._slots.update(list => [...list, created]);
    this.slotsSync.syncUpsert(created);

    this.activityService.logActivity({
      user: 'Academic Coordinator',
      role: 'Academic Operations',
      module: 'Timetable',
      category: 'Academic',
      operationType: 'Create',
      action: 'Added Timetable Period',
      target: `${entry.subjectName} (${entry.day} ${entry.periodId})`,
      recordId: newId,
      details: `${entry.facultyName} · Room ${entry.room}`,
      icon: 'calendar_month'
    });
    this.studentsService.showToast('success', `Timetable entry for ${entry.subjectName} added.`);
    return { success: true };
  }

  update(id: string, entry: Omit<TimetableEntry, 'id'>): { success: boolean; error?: string } {
    const clash = this.isClash(entry, id);
    if (clash.clashing) return { success: false, error: clash.message };

    const updated: TimetableEntry = { ...entry, id };
    this._slots.update(list => list.map(s => (s.id === id ? updated : s)));
    this.slotsSync.syncUpsert(updated);

    this.auditService.log({
      userId: 'admin',
      userName: 'Academic Coordinator',
      role: 'Academic Operations',
      module: 'Timetable',
      action: 'Update',
      target: `Updated ${entry.day} ${entry.periodId} (${entry.subjectName})`,
      status: 'Success'
    });
    this.studentsService.showToast('success', 'Timetable entry updated.');
    return { success: true };
  }

  delete(id: string): void {
    const entry = this._slots().find(s => s.id === id);
    this._slots.update(list => list.filter(s => s.id !== id));
    this.slotsSync.syncDelete(id);
    if (entry) {
      this.auditService.log({
        userId: 'admin',
        userName: 'Academic Coordinator',
        role: 'Academic Operations',
        module: 'Timetable',
        action: 'Delete',
        target: `Removed ${entry.day} ${entry.periodId} (${entry.subjectName})`,
        status: 'Success'
      });
      this.studentsService.showToast('info', `Timetable entry for ${entry.subjectName} removed.`);
    }
  }
}
