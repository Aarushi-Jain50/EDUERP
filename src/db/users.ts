import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  academicYears,
  courses,
  departments,
  faculty,
  parentStudentLink,
  parents,
  students,
  userAccounts,
  users
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  name = '',
  role = 'STUDENT'
) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        name: cleanName,
        role
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          ...(cleanName ? { name: cleanName } : {})
        }
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to sync user account with database.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getAcademicYearsList() {
  try {
    return await db
      .select({
        id: academicYears.id,
        year: academicYears.yearCode,
        startDate: academicYears.startDate,
        endDate: academicYears.endDate,
        status: academicYears.status
      })
      .from(academicYears)
      .orderBy(desc(academicYears.startDate));
  } catch (error) {
    console.error('Database query failed in getAcademicYearsList:', error);
    throw new Error('Failed to fetch academic years.', { cause: error });
  }
}

export async function getDepartmentsList() {
  try {
    const [deptRows, facRows, courseRows, studentRows] = await Promise.all([
      db.select().from(departments),
      db.select({ id: faculty.id, name: faculty.name, departmentId: faculty.departmentId }).from(faculty),
      db.select({ id: courses.id, departmentId: courses.departmentId }).from(courses),
      db.select({ id: students.id, courseId: students.courseId }).from(students)
    ]);

    const facById = new Map(facRows.map(f => [f.id, f.name]));
    const courseDeptById = new Map(courseRows.map(c => [c.id, c.departmentId]));

    return deptRows.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      hodName: d.hodId ? facById.get(d.hodId) ?? null : null,
      facultyCount: facRows.filter(f => f.departmentId === d.id).length,
      studentCount: studentRows.filter(s => s.courseId && courseDeptById.get(s.courseId) === d.id).length,
      coursesCount: courseRows.filter(c => c.departmentId === d.id).length,
      status: d.status
    }));
  } catch (error) {
    console.error('Database query failed in getDepartmentsList:', error);
    throw new Error('Failed to fetch departments.', { cause: error });
  }
}

export async function getCoursesList() {
  try {
    return await db
      .select({
        id: courses.id,
        name: courses.name,
        code: courses.code,
        departmentName: departments.name,
        level: courses.level,
        durationYears: courses.durationYears,
        totalSemesters: courses.totalSemesters,
        intakeCapacity: courses.intakeCapacity,
        status: courses.status
      })
      .from(courses)
      .innerJoin(departments, eq(courses.departmentId, departments.id));
  } catch (error) {
    console.error('Database query failed in getCoursesList:', error);
    throw new Error('Failed to fetch courses.', { cause: error });
  }
}

export async function getStudentsList() {
  try {
    return await db
      .select({
        id: students.id,
        name: students.name,
        enrollmentNo: students.enrollmentNo,
        courseName: courses.code,
        semester: students.semesterNumber,
        sectionName: students.sectionName,
        phone: students.phone,
        email: students.email,
        status: students.status
      })
      .from(students)
      .leftJoin(courses, eq(students.courseId, courses.id));
  } catch (error) {
    console.error('Database query failed in getStudentsList:', error);
    throw new Error('Failed to fetch students.', { cause: error });
  }
}

export async function getFacultyList() {
  try {
    return await db
      .select({
        id: faculty.id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        departmentName: departments.name,
        designation: faculty.designation,
        qualification: faculty.qualification,
        experienceYears: faculty.experienceYears,
        email: faculty.email,
        status: faculty.status
      })
      .from(faculty)
      .leftJoin(departments, eq(faculty.departmentId, departments.id));
  } catch (error) {
    console.error('Database query failed in getFacultyList:', error);
    throw new Error('Failed to fetch faculty.', { cause: error });
  }
}

export async function getParentsList() {
  try {
    const [parentRows, linkRows, studentRows] = await Promise.all([
      db.select().from(parents),
      db.select().from(parentStudentLink),
      db.select({ id: students.id, name: students.name }).from(students)
    ]);

    const studentNameById = new Map(studentRows.map(s => [s.id, s.name]));

    return parentRows.map(p => ({
      id: p.id,
      name: p.name,
      relation: p.relation,
      phone: p.phone,
      email: p.email,
      linkedStudentNames: linkRows
        .filter(l => l.parentId === p.id)
        .map(l => studentNameById.get(l.studentId))
        .filter((name): name is string => Boolean(name)),
      status: p.status
    }));
  } catch (error) {
    console.error('Database query failed in getParentsList:', error);
    throw new Error('Failed to fetch parents.', { cause: error });
  }
}

export async function upsertPortalUserAccount(input: {
  id: string;
  firebaseUid?: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  profileType: 'Student' | 'Faculty' | 'Parent' | 'Staff';
  status?: string;
}) {
  try {
    const result = await db
      .insert(userAccounts)
      .values({
        id: input.id,
        firebaseUid: input.firebaseUid ?? null,
        name: input.name,
        username: input.username,
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
        profileType: input.profileType,
        forcePasswordChange: false,
        status: input.status ?? 'Active'
      })
      .onConflictDoUpdate({
        target: userAccounts.email,
        set: {
          name: input.name,
          ...(input.firebaseUid ? { firebaseUid: input.firebaseUid } : {}),
          lastLogin: new Date()
        }
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertPortalUserAccount:', error);
    throw new Error('Failed to persist user account.', { cause: error });
  }
}
