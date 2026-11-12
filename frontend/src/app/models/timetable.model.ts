export interface TimetableEntry {
  id: string;
  courseId: string;
  semester: number;
  sectionId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  periodId: string; // "09:00", "10:00", etc.
  subjectId: string;
  subjectName: string;
  subjectType: 'Theory' | 'Practical' | 'Elective';
  facultyId: string;
  facultyName: string;
  room: string;
}
