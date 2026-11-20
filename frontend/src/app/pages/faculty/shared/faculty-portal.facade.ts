import { Injectable, inject, computed } from '@angular/core';
import { CurrentUserService } from '../../../services/current-user.service';
import { AcademicService, SubjectAllocationRecord } from '../../../services/academic.service';
import { TimetableService } from '../../../services/timetable.service';
import { StudentsService } from '../../../services/students.service';
import { AttendanceService, AttendanceSession } from '../../../services/attendance.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { ExaminationsService, Examination } from '../../../services/examinations.service';
import { ResultsService } from '../../../services/results.service';
import { CommunicationService } from '../../../services/communication.service';
import { ParentsService } from '../../../services/parents.service';
import { SettingsService } from '../../../services/settings.service';
import { Student } from '../../../models/student.model';
import { TimetableEntry } from '../../../models/timetable.model';
import { getGrade } from '../../../utils/grade-scale.helper';

export interface FacultyEnrichedClass {
  allocation: SubjectAllocationRecord;
  id: string;
  subject: string;
  subjectId: string;
  subjectCode: string;
  subjectType: string;
  course: string;
  courseId: string;
  semester: string;
  section: string;
  sectionId: string;
  weeklyHours: number;
  room: string;
  nextSession: string;
  students: Student[];
  studentsCount: number;
  sessionsCount: number;
  avgAttendance: number;
  avgMarksPct: number | null;
}

export interface FacultyStudentSummary {
  student: Student;
  subjectsTaught: string[];
  attendedSessions: number;
  totalSessions: number;
  attendancePct: number;
  avgMarksPct: number | null;
  isLowAttendance: boolean;
  isAtRisk: boolean;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  subjectResults: {
    subjectName: string;
    examTitle: string;
    marksObtained: number;
    maxMarks: number;
    percentage: number;
    grade: string;
  }[];
}

export interface FacultyAttendanceTrendPoint {
  date: string;
  label: string;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class FacultyPortalFacade {
  private readonly userService = inject(CurrentUserService);
  private readonly academicService = inject(AcademicService);
  private readonly timetableService = inject(TimetableService);
  private readonly studentsService = inject(StudentsService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly examinationsService = inject(ExaminationsService);
  private readonly resultsService = inject(ResultsService);
  private readonly communicationService = inject(CommunicationService);
  private readonly parentsService = inject(ParentsService);
  private readonly settingsService = inject(SettingsService);

  readonly currentFaculty = this.userService.currentFaculty;

  readonly attendanceThreshold = computed(
    () => this.settingsService.academic().attendanceThreshold || 75
  );

  readonly myAllocations = computed<SubjectAllocationRecord[]>(() => {
    const fac = this.currentFaculty();
    const targetName = fac.name.toLowerCase().trim();
    return this.academicService
      .subjectAllocations()
      .filter(a => a.faculty.toLowerCase().trim() === targetName);
  });

  readonly mySlots = computed<TimetableEntry[]>(() => {
    const fac = this.currentFaculty();
    const targetName = fac.name.toLowerCase().trim();
    const all = this.timetableService.slots();
    const byName = all.filter(s => s.facultyName.toLowerCase().trim() === targetName);
    if (byName.length > 0) return byName;
    return all.filter(s => s.facultyId === fac.id);
  });

  readonly myClasses = computed<FacultyEnrichedClass[]>(() => {
    const allocs = this.myAllocations();
    const courses = this.academicService.courses();
    const subjects = this.academicService.subjects();
    const sections = this.academicService.sections();
    const students = this.studentsService.students();
    const slots = this.mySlots();
    const allSlots = this.timetableService.slots();
    const sessions = this.attendanceService.sessions();
    const exams = this.examinationsService.exams();
    const results = this.resultsService.results();

    return allocs.map(alloc => {
      const courseRec = courses.find(c => c.name.toLowerCase() === alloc.course.toLowerCase());
      const subjectRec = subjects.find(
        s => s.name.toLowerCase() === alloc.subject.toLowerCase() && s.course.toLowerCase() === alloc.course.toLowerCase()
      ) || subjects.find(s => s.name.toLowerCase() === alloc.subject.toLowerCase());

      const sectionRec = sections.find(
        sec =>
          sec.course.toLowerCase() === alloc.course.toLowerCase() &&
          sec.semester.toLowerCase() === alloc.semester.toLowerCase() &&
          sec.section.toLowerCase() === alloc.section.toLowerCase()
      );

      const courseId = courseRec?.id || '';
      const subjectId = subjectRec?.id || '';
      const sectionId = sectionRec?.id || (alloc.section === 'Section B' ? 'sec-2' : 'sec-1');

      const matchedStudents = students.filter(
        s =>
          s.status === 'Active' &&
          s.course.toLowerCase() === alloc.course.toLowerCase() &&
          s.semester.toLowerCase() === alloc.semester.toLowerCase() &&
          (s.sectionId === sectionId || s.section.toLowerCase() === alloc.section.toLowerCase())
      );

      const classSlots = slots.filter(
        s =>
          (subjectId && s.subjectId === subjectId) ||
          s.subjectName.toLowerCase() === alloc.subject.toLowerCase()
      );
      const fallbackSlots = allSlots.filter(
        s =>
          ((subjectId && s.subjectId === subjectId) || s.subjectName.toLowerCase() === alloc.subject.toLowerCase()) &&
          s.sectionId === sectionId
      );
      const effectiveSlots = classSlots.length > 0 ? classSlots : fallbackSlots;

      const room = effectiveSlots[0]?.room || 'L-101';
      const nextSession =
        effectiveSlots.length > 0
          ? `${effectiveSlots[0].day} · ${effectiveSlots[0].periodId} (${effectiveSlots[0].room})`
          : `${alloc.weeklyHours} hrs/week`;

      const classSessions = sessions.filter(
        sess =>
          (!courseId || sess.courseId === courseId) &&
          sess.sectionId === sectionId &&
          sess.subjectId === subjectId
      );
      const avgAttendance =
        classSessions.length > 0
          ? Math.round(classSessions.reduce((acc, s) => acc + s.percentage, 0) / classSessions.length)
          : 0;

      const classExamIds = new Set(
        exams
          .filter(
            e =>
              e.subjectId === subjectId ||
              e.subjectName.toLowerCase() === alloc.subject.toLowerCase()
          )
          .map(e => e.id)
      );
      const studentIdSet = new Set(matchedStudents.map(s => s.id));
      const classResults = results.filter(
        r => classExamIds.has(r.examId) && (studentIdSet.size === 0 || studentIdSet.has(r.studentId))
      );
      const avgMarksPct =
        classResults.length > 0
          ? Math.round(
              classResults.reduce(
                (acc, r) => acc + (r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0),
                0
              ) / classResults.length
            )
          : null;

      return {
        allocation: alloc,
        id: alloc.id,
        subject: alloc.subject,
        subjectId,
        subjectCode: subjectRec?.code || subjectId.toUpperCase(),
        subjectType: subjectRec?.type || 'Theory',
        course: alloc.course,
        courseId,
        semester: alloc.semester,
        section: alloc.section,
        sectionId,
        weeklyHours: alloc.weeklyHours,
        room,
        nextSession,
        students: matchedStudents,
        studentsCount: matchedStudents.length,
        sessionsCount: classSessions.length,
        avgAttendance,
        avgMarksPct
      };
    });
  });

  readonly facultySessions = computed<AttendanceSession[]>(() => {
    const classes = this.myClasses();
    const classKeys = new Set(classes.map(c => `${c.subjectId}::${c.sectionId}`));
    const subjectIds = new Set(classes.map(c => c.subjectId).filter(Boolean));
    return this.attendanceService
      .sessions()
      .filter(s => classKeys.has(`${s.subjectId}::${s.sectionId}`) || subjectIds.has(s.subjectId))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly attendanceTrend = computed<FacultyAttendanceTrendPoint[]>(() => {
    const sessions = this.facultySessions();
    const byDate = new Map<string, { present: number; total: number }>();
    for (const sess of sessions) {
      const curr = byDate.get(sess.date) || { present: 0, total: 0 };
      curr.present += sess.present;
      curr.total += sess.total;
      byDate.set(sess.date, curr);
    }
    return Array.from(byDate.keys())
      .sort((a, b) => a.localeCompare(b))
      .map(date => {
        const val = byDate.get(date)!;
        return {
          date,
          label: this.formatShortDate(date),
          percentage: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0
        };
      });
  });

  readonly facultyAssignments = computed(() => {
    const allocs = this.myAllocations();
    const subNames = new Set(allocs.map(a => a.subject.toLowerCase()));
    return this.assignmentsService
      .assignments()
      .filter(a => subNames.has(a.subjectName.toLowerCase()));
  });

  readonly assignmentTotals = computed(() => {
    void this.assignmentsService.submissions();
    let submitted = 0;
    let late = 0;
    let pending = 0;
    let evaluated = 0;
    for (const a of this.facultyAssignments()) {
      const s = this.assignmentsService.getAssignmentStats(a.id);
      submitted += s.submitted;
      late += s.late;
      pending += s.pending;
      evaluated += s.evaluated;
    }
    return {
      submitted,
      late,
      pending,
      evaluated,
      pendingReview: submitted + late
    };
  });

  readonly facultyExams = computed<Examination[]>(() => {
    const allocs = this.myAllocations();
    const subNames = new Set(allocs.map(a => a.subject.toLowerCase()));
    const todayIso = new Date().toISOString().split('T')[0];
    return this.examinationsService
      .exams()
      .filter(e => subNames.has(e.subjectName.toLowerCase()))
      .map(e => ({
        ...e,
        status: e.date < todayIso ? ('Completed' as const) : ('Scheduled' as const)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly myStudents = computed<FacultyStudentSummary[]>(() => {
    const classes = this.myClasses();
    const sessions = this.attendanceService.sessions();
    const examsById = new Map(this.examinationsService.exams().map(e => [e.id, e]));
    const results = this.resultsService.results();
    const parents = this.parentsService.parentsList();
    const threshold = this.attendanceThreshold();

    const byStudent = new Map<
      string,
      {
        student: Student;
        subjects: Set<string>;
        subjectIds: Set<string>;
        sectionIds: Set<string>;
      }
    >();

    for (const cls of classes) {
      for (const stu of cls.students) {
        let entry = byStudent.get(stu.id);
        if (!entry) {
          entry = {
            student: stu,
            subjects: new Set<string>(),
            subjectIds: new Set<string>(),
            sectionIds: new Set<string>()
          };
          byStudent.set(stu.id, entry);
        }
        entry.subjects.add(cls.subject);
        if (cls.subjectId) entry.subjectIds.add(cls.subjectId);
        entry.sectionIds.add(cls.sectionId);
      }
    }

    const list: FacultyStudentSummary[] = [];
    for (const entry of byStudent.values()) {
      const stu = entry.student;
      const relevantSessions = sessions.filter(
        sess =>
          sess.sectionId === stu.sectionId &&
          (entry.subjectIds.size === 0 || entry.subjectIds.has(sess.subjectId))
      );

      let attendedSessions = 0;
      for (const sess of relevantSessions) {
        const st = this.attendanceService.getStudentStatusForSession(sess.id, stu.id);
        if (st === 'Present') attendedSessions += 1;
      }
      const totalSessions = relevantSessions.length;
      const attendancePct =
        totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

      const stuResults = results
        .filter(r => r.studentId === stu.id)
        .map(r => {
          const ex = examsById.get(r.examId);
          const pct = r.maxMarks > 0 ? Math.round((r.marksObtained / r.maxMarks) * 100) : 0;
          return {
            subjectName: ex?.subjectName || 'Subject',
            examTitle: ex?.title || 'Examination',
            marksObtained: r.marksObtained,
            maxMarks: r.maxMarks,
            percentage: pct,
            grade: r.grade || getGrade(pct).grade
          };
        });

      const relevantResults = stuResults.filter(sr =>
        Array.from(entry.subjects).some(sub => sub.toLowerCase() === sr.subjectName.toLowerCase())
      );
      const calcPool = relevantResults.length > 0 ? relevantResults : stuResults;
      const avgMarksPct =
        calcPool.length > 0
          ? Math.round(calcPool.reduce((acc, r) => acc + r.percentage, 0) / calcPool.length)
          : null;

      const linkedParent = parents.find(p => p.studentIds.includes(stu.id));
      const isLowAttendance = totalSessions > 0 && attendancePct < threshold;
      const isAtRisk = isLowAttendance || (avgMarksPct !== null && avgMarksPct < 40);

      list.push({
        student: stu,
        subjectsTaught: Array.from(entry.subjects),
        attendedSessions,
        totalSessions,
        attendancePct,
        avgMarksPct,
        isLowAttendance,
        isAtRisk,
        guardianName: linkedParent?.name || stu.guardian?.name || 'Parent / Guardian',
        guardianRelation: linkedParent?.relation || stu.guardian?.relation || 'Guardian',
        guardianPhone: linkedParent?.phone || stu.guardian?.phone || 'N/A',
        subjectResults: stuResults
      });
    }

    return list.sort((a, b) => a.student.name.localeCompare(b.student.name));
  });

  readonly facultyNotices = computed(() => {
    const courseIds = new Set(this.myClasses().map(c => c.courseId).filter(Boolean));
    return this.communicationService
      .notices()
      .filter(
        n =>
          n.status === 'Published' &&
          (n.audience === 'All' ||
            n.audience === 'Faculty' ||
            (n.audience === 'Course-wise' && !!n.courseId && courseIds.has(n.courseId)))
      )
      .slice()
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
  });

  formatShortDate(dateStr: string): string {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }
}
