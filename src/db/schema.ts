import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core';

// Firebase Auth linked users table (mandatory uid primary link)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('STUDENT'),
  createdAt: timestamp('created_at').defaultNow()
});

// 1. Academic Years
export const academicYears = pgTable('academic_years', {
  id: text('id').primaryKey(),
  yearCode: text('year_code').notNull().unique(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').notNull().default('Upcoming'),
  createdAt: timestamp('created_at').defaultNow()
});

// 2. Departments
export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  hodId: text('hod_id'),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at').defaultNow()
});

// 3. Courses
export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  departmentId: text('department_id')
    .references(() => departments.id, { onDelete: 'cascade' })
    .notNull(),
  level: text('level').notNull(),
  durationYears: integer('duration_years').notNull(),
  totalSemesters: integer('total_semesters').notNull(),
  intakeCapacity: integer('intake_capacity').notNull().default(60),
  status: text('status').notNull().default('Active')
});

// 4. Semesters
export const semesters = pgTable('semesters', {
  id: text('id').primaryKey(),
  semesterNumber: integer('semester_number').notNull(),
  courseId: text('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  academicYearId: text('academic_year_id')
    .references(() => academicYears.id, { onDelete: 'cascade' })
    .notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').notNull().default('Upcoming')
});

// 5. Faculty
export const faculty = pgTable('faculty', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  departmentId: text('department_id').references(() => departments.id),
  designation: text('designation').notNull(),
  qualification: text('qualification'),
  experienceYears: integer('experience_years').default(0),
  joiningDate: date('joining_date').notNull(),
  status: text('status').notNull().default('Active')
});

// 6. Students
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  enrollmentNo: text('enrollment_no').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  gender: text('gender').notNull(),
  dob: date('dob').notNull(),
  courseId: text('course_id').references(() => courses.id),
  semesterNumber: integer('semester_number').notNull().default(1),
  sectionName: text('section_name'),
  admissionDate: date('admission_date').notNull(),
  status: text('status').notNull().default('Active')
});

// 7. Parents
export const parents = pgTable('parents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  relation: text('relation').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  occupation: text('occupation'),
  status: text('status').notNull().default('Active')
});

// 8. Parent-Student Link
export const parentStudentLink = pgTable(
  'parent_student_link',
  {
    parentId: text('parent_id')
      .references(() => parents.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: text('student_id')
      .references(() => students.id, { onDelete: 'cascade' })
      .notNull()
  },
  (table) => [primaryKey({ columns: [table.parentId, table.studentId] })]
);

// 9. Portal User Accounts
export const userAccounts = pgTable('user_accounts', {
  id: text('id').primaryKey(),
  firebaseUid: text('firebase_uid'),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  profileType: text('profile_type'),
  linkedProfileId: text('linked_profile_id'),
  forcePasswordChange: boolean('force_password_change').default(true),
  status: text('status').notNull().default('Active'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow()
});

// 10. Role Permissions Matrix
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id').notNull(),
    moduleKey: text('module_key').notNull(),
    canView: boolean('can_view').default(false),
    canCreate: boolean('can_create').default(false),
    canEdit: boolean('can_edit').default(false),
    canDelete: boolean('can_delete').default(false)
  },
  (table) => [primaryKey({ columns: [table.roleId, table.moduleKey] })]
);

// 11. Auth Users (Cloud SQL replacement for local SQLite auth_users)
export const authUsers = pgTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  status: text('status').notNull().default('Active'),
  totpEnabled: boolean('totp_enabled').notNull().default(true),
  totpSecret: text('totp_secret').notNull().default(''),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: bigint('locked_until', { mode: 'number' }),
  lastLogin: text('last_login'),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by').notNull().default('system')
});

// 12. Auth Sessions (Cloud SQL replacement for local SQLite auth_sessions)
export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: text('created_at').notNull(),
  userAgent: text('user_agent').notNull().default('')
});

// 13. Admin 2FA & Password Reset Challenges
export const adminChallenges = pgTable('admin_challenges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  purpose: text('purpose').notNull(),
  otpHash: text('otp_hash').notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  used: boolean('used').notNull().default(false),
  createdAt: text('created_at').notNull()
});

// 14. Security & Authentication Audit Logs
export const authAuditLogs = pgTable('auth_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  email: text('email'),
  role: text('role'),
  event: text('event').notNull(),
  status: text('status').notNull(),
  ip: text('ip'),
  details: text('details'),
  createdAt: text('created_at').notNull()
});

// 15. Application Configuration / Runtime Keys
export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// 16. Student Portal: Study Task & Goal Checklist
export const studentStudyTasks = pgTable('student_study_tasks', {
  id: text('id').primaryKey(),
  studentKey: text('student_key').notNull(),
  text: text('text').notNull(),
  done: boolean('done').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 17. Student Portal: GPA Target Simulator Preferences
export const studentAcademicGoals = pgTable('student_academic_goals', {
  studentKey: text('student_key').primaryKey(),
  targetGpa: doublePrecision('target_gpa').notNull().default(8.5),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 18. Student Portal: Assignments
export const studentAssignmentsDb = pgTable('student_assignments_db', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull(),
  semesterNumber: integer('semester_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  subjectCode: text('subject_code').notNull(),
  subjectName: text('subject_name').notNull(),
  dueDate: text('due_date').notNull(),
  maxMarks: integer('max_marks').notNull().default(100),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 19. Student Portal: Submissions
export const studentSubmissionsDb = pgTable('student_submissions_db', {
  id: text('id').primaryKey(),
  assignmentId: text('assignment_id').notNull(),
  studentId: text('student_id').notNull(),
  answerText: text('answer_text').notNull(),
  attachmentsJson: text('attachments_json').notNull().default('[]'),
  status: text('status').notNull().default('Submitted'),
  submittedAt: text('submitted_at').notNull(),
  version: integer('version').notNull().default(1),
  marksObtained: integer('marks_obtained'),
  feedback: text('feedback'),
  evaluatedBy: text('evaluated_by'),
  evaluatedAt: text('evaluated_at')
});

// 20. Student Portal: Leave Requests
export const studentLeaveRequestsDb = pgTable('student_leave_requests_db', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('Pending'),
  appliedAt: text('applied_at').notNull(),
  remarks: text('remarks')
});

// 21. Student Portal: Fee Payments
export const studentPaymentsDb = pgTable('student_payments_db', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  paymentRef: text('payment_ref').notNull().unique(),
  amountPaid: doublePrecision('amount_paid').notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionDate: text('transaction_date').notNull(),
  receiptNumber: text('receipt_number').notNull(),
  status: text('status').notNull().default('Successful')
});

// 22. Student Portal: Support Tickets
export const studentSupportTicketsDb = pgTable('student_support_tickets_db', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  category: text('category').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('Open'),
  priority: text('priority').notNull().default('Medium'),
  createdAt: text('created_at').notNull(),
  closedAt: text('closed_at')
});

// 23. Student Portal: Syllabus & Study Materials
export const studentSyllabusDb = pgTable('student_syllabus_db', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull(),
  semesterNumber: integer('semester_number').notNull(),
  subjectCode: text('subject_code').notNull(),
  subjectName: text('subject_name').notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSizeKb: integer('file_size_kb').notNull().default(1024),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: text('uploaded_at').notNull()
});


// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  courses: many(courses),
  facultyMembers: many(faculty)
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  department: one(departments, {
    fields: [courses.departmentId],
    references: [departments.id]
  }),
  semesters: many(semesters),
  students: many(students)
}));

export const semestersRelations = relations(semesters, ({ one }) => ({
  course: one(courses, {
    fields: [semesters.courseId],
    references: [courses.id]
  }),
  academicYear: one(academicYears, {
    fields: [semesters.academicYearId],
    references: [academicYears.id]
  })
}));

export const facultyRelations = relations(faculty, ({ one }) => ({
  department: one(departments, {
    fields: [faculty.departmentId],
    references: [departments.id]
  })
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  course: one(courses, {
    fields: [students.courseId],
    references: [courses.id]
  }),
  parentLinks: many(parentStudentLink)
}));

export const parentsRelations = relations(parents, ({ many }) => ({
  studentLinks: many(parentStudentLink)
}));

export const parentStudentLinkRelations = relations(parentStudentLink, ({ one }) => ({
  parent: one(parents, {
    fields: [parentStudentLink.parentId],
    references: [parents.id]
  }),
  student: one(students, {
    fields: [parentStudentLink.studentId],
    references: [students.id]
  })
}));
