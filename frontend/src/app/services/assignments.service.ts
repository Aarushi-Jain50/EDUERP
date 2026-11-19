import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Unsubscribe, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { StudentsService } from './students.service';
import { AcademicService } from './academic.service';
import { FacultyService } from './faculty.service';
import { NotificationService } from './notification.service';
import { Student } from '../models/student.model';
import { AssignmentQuestion, getQuestionsForSubject } from '../data/assignment-questions';
import { auth, db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export type AssignmentStatus = 'Active' | 'Closed' | 'Overdue';
export type SubmissionStatus = 'Draft' | 'Submitted' | 'Late' | 'Evaluated';

export interface SubmissionAttachment {
  name: string;
  sizeKB: number;
  type: string;
}

export interface SubmissionHistoryEntry {
  version: number;
  answerText: string;
  questionAnswers?: Record<string, string>;
  attachments: SubmissionAttachment[];
  submittedAt: string;
  status: 'Submitted' | 'Late';
}

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
  allowLateSubmission?: boolean;
  questions?: AssignmentQuestion[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  answerText: string;
  questionAnswers?: Record<string, string>;
  attachments: SubmissionAttachment[];
  status: SubmissionStatus;
  submittedAt?: string;
  updatedAt?: string;
  version: number;
  history?: SubmissionHistoryEntry[];
  marks?: number;
  feedback?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  submittedOn?: string;
  note?: string;
}

export type StudentSubmission = AssignmentSubmission;

export interface AssignmentRosterRow {
  student: Student;
  submission: AssignmentSubmission | null;
  displayStatus: SubmissionStatus | 'Pending';
  submittedOnDisplay: string;
  attachmentsCount: number;
  marksDisplay: string;
}

const SUBMISSIONS_STORAGE_KEY = 'eduerp_student_submissions_v1';

const RAW_SEED_ASSIGNMENTS: Omit<Assignment, 'questions'>[] = [
  {
    id: 'as-1',
    title: 'Implementation of AVL Trees & Rotations',
    description:
      'Implement AVL Tree insertion, deletion, and LL/RR/LR/RL rotation logic in C++ and complete all 25 topic worksheet questions.',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    sectionId: 'sec-1',
    sectionName: 'Section A',
    assignedOn: '2026-11-01',
    dueDate: '2026-12-20',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-2',
    title: 'Angular Signals & Standalone Architecture',
    description:
      'Build a reusable portal module using standalone Angular components, Signals, and reactive computed state, and answer the 25 architectural questions.',
    subjectId: 'sub-2',
    subjectName: 'Enterprise Web Application Architecture',
    sectionId: 'sec-1',
    sectionName: 'Section A',
    assignedOn: '2026-11-05',
    dueDate: '2026-12-18',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-3',
    title: 'Full Stack REST & Transaction Integration',
    description:
      'Connect your Angular frontend to an Express REST API with validation, ACID transactions, and comprehensive 25-question lab assessment.',
    subjectId: 'sub-3',
    subjectName: 'Full Stack Development Lab',
    sectionId: 'sec-1',
    sectionName: 'Section A',
    assignedOn: '2025-10-10',
    dueDate: '2025-10-25',
    maxMarks: 50,
    status: 'Closed',
    allowLateSubmission: true,
  },
  {
    id: 'as-4',
    title: 'Kubernetes Pod Autoscaling & Cloud Security Lab',
    description:
      'Configure HorizontalPodAutoscaler manifests, attach resource CPU targets, and complete all 25 DevOps & Cloud worksheet questions.',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    sectionId: 'sec-1',
    sectionName: 'Section A',
    assignedOn: '2026-11-01',
    dueDate: '2026-12-22',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-11',
    title: 'Zero Trust Cryptography & AppSec Audit',
    description:
      'Perform threat modeling across TLS 1.3, OWASP XSS/CSRF controls, and Firestore RBAC policies across 25 core Cyber Security questions.',
    subjectId: 'sub-9',
    subjectName: 'Cyber Security & Ethics',
    sectionId: 'sec-1',
    sectionName: 'Section A',
    assignedOn: '2026-11-08',
    dueDate: '2026-12-28',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-5',
    title: 'Propositional Logic & Graph Theory Proofs',
    description:
      'Solve worksheet problems on recurrence relations, mathematical induction, and bipartite graph characterization across 25 structured questions.',
    subjectId: 'sub-5',
    subjectName: 'Discrete Mathematics',
    sectionId: 'sec-3',
    sectionName: 'Section A',
    assignedOn: '2026-11-06',
    dueDate: '2026-12-16',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-12',
    title: 'Java Streams, Concurrency & Collections Lab',
    description:
      'Implement multi-threaded collection processors with CompletableFuture and submit answers for all 25 Java Engineering questions.',
    subjectId: 'sub-6',
    subjectName: 'Java Programming Lab',
    sectionId: 'sec-3',
    sectionName: 'Section A',
    assignedOn: '2026-11-08',
    dueDate: '2026-12-24',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-6',
    title: 'Relational Schema Normalization (BCNF)',
    description:
      'Normalize the hospital management ER diagram up to BCNF with SQL DDL scripts and complete the 25-question DBMS assessment.',
    subjectId: 'sub-10',
    subjectName: 'Database Management Systems',
    sectionId: 'sec-3',
    sectionName: 'Section A',
    assignedOn: '2026-11-02',
    dueDate: '2026-12-19',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: false,
  },
  {
    id: 'as-7',
    title: 'Memory Management & Page Replacement',
    description:
      'Simulate FIFO, LRU, and Optimal page replacement algorithms in C++ and answer all 25 Operating Systems problem questions.',
    subjectId: 'sub-11',
    subjectName: 'Operating Systems',
    sectionId: 'sec-4',
    sectionName: 'Section A',
    assignedOn: '2026-11-07',
    dueDate: '2026-12-17',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-13',
    title: 'TCP Congestion Control & Subnetting Lab',
    description:
      'Perform VLSM CIDR subnetting, inspect TCP Slow Start congestion traces, and answer all 25 Computer Networks questions.',
    subjectId: 'sub-12',
    subjectName: 'Computer Networks',
    sectionId: 'sec-4',
    sectionName: 'Section A',
    assignedOn: '2026-11-09',
    dueDate: '2026-12-26',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-14',
    title: 'RAII, Smart Pointers & SOLID C++ Design',
    description:
      'Refactor raw pointer hierarchies into exception-safe unique_ptr/shared_ptr patterns and answer 25 C++ OOP design questions.',
    subjectId: 'sub-7',
    subjectName: 'Object Oriented Design & C++',
    sectionId: 'sec-4',
    sectionName: 'Section A',
    assignedOn: '2026-11-10',
    dueDate: '2026-12-27',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-8',
    title: 'Bayesian Inference & Neural Perceptron',
    description:
      'Implement a single-layer perceptron and Naive Bayes classifier in Python and complete the 25-question ML evaluation sheet.',
    subjectId: 'sub-8',
    subjectName: 'Artificial Intelligence & ML',
    sectionId: 'sec-1',
    sectionName: 'Section A',
    assignedOn: '2026-10-28',
    dueDate: '2026-11-09',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-9',
    title: 'Cloud IAM & VPC Security Audit',
    description:
      'Draft least-privilege IAM policy JSON and subnet firewall rules, plus answer all 25 Cloud & DevOps worksheet questions.',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    sectionId: 'sec-2',
    sectionName: 'Section B',
    assignedOn: '2026-11-03',
    dueDate: '2026-12-18',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
  {
    id: 'as-10',
    title: 'Graph Traversal & Shortest Path Lab',
    description:
      'Compare Dijkstra and Bellman-Ford performance on sparse and dense weighted graphs across 25 DSA questions.',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    sectionId: 'sec-2',
    sectionName: 'Section B',
    assignedOn: '2026-11-01',
    dueDate: '2026-12-20',
    maxMarks: 50,
    status: 'Active',
    allowLateSubmission: true,
  },
];

const SEED_ASSIGNMENTS: Assignment[] = RAW_SEED_ASSIGNMENTS.map(a => ({
  ...a,
  questions: getQuestionsForSubject(a.subjectId, a.id),
}));

const SEED_SUBMISSIONS: AssignmentSubmission[] = [
  {
    id: 'subm-1',
    assignmentId: 'as-3',
    studentId: 'stu-1',
    answerText:
      'Implemented the REST API endpoints in Express with CORS middleware, input validation, and wired the Angular dashboard using HttpClient and Signals.',
    attachments: [{ name: 'fullstack-integration-report.pdf', sizeKB: 420, type: 'application/pdf' }],
    status: 'Evaluated',
    submittedAt: '2025-10-23T16:40:00',
    submittedOn: '2025-10-23',
    version: 1,
    history: [],
    marks: 46,
    feedback: 'Clean REST integration and thorough error handling.',
    evaluatedBy: 'Dr. S. N. Roy',
    evaluatedAt: '2025-10-27T11:15:00',
    note: 'Completed REST endpoints and tested locally.',
  },
  {
    id: 'subm-2',
    assignmentId: 'as-8',
    studentId: 'stu-1',
    answerText:
      'Implemented the Gaussian Naive Bayes classifier and single-layer perceptron on the Iris dataset. Included confusion matrix analysis and convergence plot notes.',
    attachments: [
      { name: 'naive_bayes_perceptron_analysis.pdf', sizeKB: 685, type: 'application/pdf' },
      { name: 'ml_lab_code.zip', sizeKB: 1240, type: 'application/zip' },
    ],
    status: 'Late',
    submittedAt: '2026-11-11T14:15:00',
    submittedOn: '2026-11-11',
    version: 1,
    history: [],
    note: 'Uploaded notebook with confusion matrix analysis (submitted after due date).',
  },
  {
    id: 'subm-3',
    assignmentId: 'as-3',
    studentId: 'stu-2',
    answerText:
      'Built typed Express controllers, request validation, and Angular service integration along with unit tests for all API endpoints.',
    attachments: [{ name: 'ananya_fullstack_submission.pdf', sizeKB: 512, type: 'application/pdf' }],
    status: 'Evaluated',
    submittedAt: '2025-10-24T10:30:00',
    submittedOn: '2025-10-24',
    version: 1,
    history: [],
    marks: 48,
    feedback: 'Outstanding test coverage and UI polish.',
    evaluatedBy: 'Dr. S. N. Roy',
    evaluatedAt: '2025-10-27T11:30:00',
    note: 'Added unit tests for API routes.',
  },
  {
    id: 'subm-4',
    assignmentId: 'as-5',
    studentId: 'stu-3',
    answerText:
      'Completed all proofs covering strong mathematical induction, recurrence tree bounds, and 2-colorability of bipartite graphs.',
    attachments: [{ name: 'discrete_math_proofs_priyanshu.pdf', sizeKB: 390, type: 'application/pdf' }],
    status: 'Evaluated',
    submittedAt: '2026-11-12T18:05:00',
    submittedOn: '2026-11-12',
    version: 1,
    history: [],
    marks: 44,
    feedback: 'Clear induction proof steps.',
    evaluatedBy: 'Prof. Meena Sharma',
    evaluatedAt: '2026-11-13T09:10:00',
    note: 'Completed graph theory proofs.',
  },
  {
    id: 'subm-5',
    assignmentId: 'as-1',
    studentId: 'stu-2',
    answerText:
      'Implemented AVL insert and balance-factor recalculation for LL, RR, LR, and RL cases in C++. Verified height stays O(log n) across 1,000 sequential insertions.',
    attachments: [{ name: 'avl_tree_ananya.zip', sizeKB: 310, type: 'application/zip' }],
    status: 'Submitted',
    submittedAt: '2026-11-12T19:20:00',
    submittedOn: '2026-11-12',
    version: 1,
    history: [],
  },
  {
    id: 'subm-6',
    assignmentId: 'as-2',
    studentId: 'stu-12',
    answerText:
      'Designed modular Angular standalone components using signal inputs, computed totals, and OnPush change detection without NgModules.',
    attachments: [
      {
        name: 'angular_architecture_ishita.docx',
        sizeKB: 275,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ],
    status: 'Submitted',
    submittedAt: '2026-11-13T08:45:00',
    submittedOn: '2026-11-13',
    version: 1,
    history: [],
  },
];

@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly academicService = inject(AcademicService);
  private readonly facultyService = inject(FacultyService);
  private readonly notificationService = inject(NotificationService);

  private readonly _assignments = signal<Assignment[]>(SEED_ASSIGNMENTS);
  private readonly _submissions = signal<AssignmentSubmission[]>(this.loadStoredSubmissions());

  private readonly _evaluations = signal<Record<string, { marksObtained: number; feedback?: string }>>({
    'as-3::stu-1': { marksObtained: 46, feedback: 'Clean REST integration and thorough error handling.' },
    'as-3::stu-2': { marksObtained: 48, feedback: 'Outstanding test coverage and UI polish.' },
    'as-5::stu-3': { marksObtained: 44, feedback: 'Clear induction proof steps.' },
  });

  private submissionUnsub: Unsubscribe | null = null;

  readonly submissions = this._submissions.asReadonly();
  readonly evaluations = this._evaluations.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      onAuthStateChanged(auth, user => {
        this.submissionUnsub?.();
        this.submissionUnsub = null;
        if (user?.uid) {
          const q = query(collection(db, 'assignmentSubmissions'), where('ownerUid', '==', user.uid));
          this.submissionUnsub = onSnapshot(
            q,
            snapshot => {
              const cloudRows: AssignmentSubmission[] = [];
              for (const d of snapshot.docs) {
                const raw = d.data() as Record<string, unknown>;
                const assignmentId = String(raw['assignmentId'] || '');
                const studentId = String(raw['studentId'] || '');
                if (!assignmentId || !studentId) continue;
                cloudRows.push({
                  id: String(raw['id'] || d.id),
                  assignmentId,
                  studentId,
                  answerText: String(raw['answerText'] || ''),
                  questionAnswers:
                    (raw['questionAnswers'] as Record<string, string> | undefined) ?? undefined,
                  attachments: [],
                  status: (raw['status'] as SubmissionStatus) || 'Submitted',
                  submittedAt: raw['submittedAt'] ? String(raw['submittedAt']) : undefined,
                  submittedOn: raw['submittedAt'] ? String(raw['submittedAt']).split('T')[0] : undefined,
                  updatedAt: raw['updatedAt'] ? String(raw['updatedAt']) : undefined,
                  version: Number(raw['version'] ?? 1),
                  history: [],
                });
              }

              if (cloudRows.length > 0) {
                this._submissions.update(local => {
                  const map = new Map(local.map(s => [`${s.assignmentId}::${s.studentId}`, s]));
                  for (const row of cloudRows) {
                    const key = `${row.assignmentId}::${row.studentId}`;
                    const existing = map.get(key);
                    map.set(key, {
                      ...row,
                      attachments: existing?.attachments ?? [],
                      history: existing?.history ?? [],
                    });
                  }
                  const merged = Array.from(map.values());
                  this.persistLocalSubmissions(merged);
                  return merged;
                });
              }
            },
            error => handleFirestoreError(error, OperationType.LIST, 'assignmentSubmissions')
          );
        }
      });
    }
  }

  private loadStoredSubmissions(): AssignmentSubmission[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_SUBMISSIONS;
    try {
      const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AssignmentSubmission[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore invalid storage
    }
    return SEED_SUBMISSIONS;
  }

  private persistLocalSubmissions(list: AssignmentSubmission[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  }

  private async syncSubmissionToFirestore(sub: AssignmentSubmission): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const docId = `${uid}_${sub.assignmentId}_${sub.studentId}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 128);
    const cleanedAnswers: Record<string, string> = {};
    if (sub.questionAnswers) {
      for (const [k, v] of Object.entries(sub.questionAnswers)) {
        const cleanVal = v.trim();
        if (cleanVal) {
          cleanedAnswers[k] = cleanVal.slice(0, 1500);
        }
      }
    }

    const payload = {
      id: docId,
      assignmentId: sub.assignmentId.slice(0, 128),
      studentId: sub.studentId.slice(0, 128),
      status: sub.status,
      answerText: sub.answerText.slice(0, 5000),
      questionAnswersCount: Object.keys(cleanedAnswers).length,
      questionAnswers: cleanedAnswers,
      attachmentsCount: sub.attachments.length,
      version: sub.version,
      submittedAt: sub.submittedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerUid: uid,
    };

    try {
      await setDoc(doc(db, 'assignmentSubmissions', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `assignmentSubmissions/${docId}`);
    }
  }

  getQuestionsForAssignment(assignmentId: string): AssignmentQuestion[] {
    const assignment = this._assignments().find(a => a.id === assignmentId);
    if (!assignment) return [];
    return assignment.questions ?? getQuestionsForSubject(assignment.subjectId, assignment.id);
  }

  getEvaluation(
    assignmentId: string,
    studentId: string
  ): { marksObtained: number; feedback?: string } | undefined {
    const sub = this._submissions().find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    if (sub && sub.status === 'Evaluated' && sub.marks !== undefined) {
      return { marksObtained: sub.marks, feedback: sub.feedback };
    }
    return this._evaluations()[`${assignmentId}::${studentId}`];
  }

  getSubmissionForStudent(
    assignmentId: string,
    studentId: string
  ): AssignmentSubmission | undefined {
    return this._submissions().find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
  }

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

  resolveFacultyForAssignment(assignment: Assignment): { facultyId?: string; facultyName: string } {
    const subject = this.academicService.subjects().find(s => s.id === assignment.subjectId);
    const alloc =
      this.academicService.subjectAllocations().find(
        a =>
          a.subject.toLowerCase() === assignment.subjectName.toLowerCase() &&
          (!subject || a.course === subject.course) &&
          a.section === assignment.sectionName
      ) ||
      this.academicService.subjectAllocations().find(
        a => a.subject.toLowerCase() === assignment.subjectName.toLowerCase()
      );

    const facultyName = alloc?.faculty || 'Subject Faculty';
    const matchedFaculty = this.facultyService.facultyList().find(
      f => f.name.toLowerCase().trim() === facultyName.toLowerCase().trim()
    );
    return { facultyId: matchedFaculty?.id, facultyName };
  }

  getRosterStudentsForAssignment(assignmentId: string): Student[] {
    const assignment = this.assignments().find(a => a.id === assignmentId);
    if (!assignment) return [];
    const subject = this.academicService.subjects().find(s => s.id === assignment.subjectId);
    return this.studentsService.students().filter(s => {
      if (s.sectionId !== assignment.sectionId) return false;
      if (subject && s.course !== subject.course) return false;
      return true;
    });
  }

  getAssignmentRoster(assignmentId: string): AssignmentRosterRow[] {
    const assignment = this.assignments().find(a => a.id === assignmentId);
    if (!assignment) return [];
    const students = this.getRosterStudentsForAssignment(assignmentId);
    const subsByStudent = new Map(
      this._submissions()
        .filter(s => s.assignmentId === assignmentId)
        .map(s => [s.studentId, s])
    );

    return students.map(student => {
      const submission = subsByStudent.get(student.id) || null;
      const displayStatus: SubmissionStatus | 'Pending' = submission ? submission.status : 'Pending';
      const submittedDate = submission?.submittedAt || submission?.submittedOn || '';
      return {
        student,
        submission,
        displayStatus,
        submittedOnDisplay:
          submission && submission.status !== 'Draft' && submittedDate ? submittedDate.split('T')[0] : '-',
        attachmentsCount: submission?.attachments.length ?? 0,
        marksDisplay: submission?.marks !== undefined ? `${submission.marks} / ${assignment.maxMarks}` : '-',
      };
    });
  }

  getAssignmentStats(assignmentId: string) {
    const roster = this.getAssignmentRoster(assignmentId);
    const total = roster.length;
    const submitted = roster.filter(r => r.displayStatus === 'Submitted').length;
    const late = roster.filter(r => r.displayStatus === 'Late').length;
    const evaluated = roster.filter(r => r.displayStatus === 'Evaluated').length;
    const pending = roster.filter(r => r.displayStatus === 'Pending' || r.displayStatus === 'Draft').length;
    const completedCount = submitted + late + evaluated;
    const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      submitted,
      late,
      evaluated,
      pending,
      completedCount,
      completionPct,
    };
  }

  isAssignmentPastDue(assignment: Assignment): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(assignment.dueDate);
    due.setHours(0, 0, 0, 0);
    return today > due;
  }

  saveDraft(
    assignmentId: string,
    studentId: string,
    answerText: string,
    attachments: SubmissionAttachment[],
    questionAnswers?: Record<string, string>
  ): void {
    const assignment = this.assignments().find(a => a.id === assignmentId);
    const existing = this._submissions().find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );

    if (existing && (existing.status === 'Submitted' || existing.status === 'Late' || existing.status === 'Evaluated')) {
      return;
    }

    const normalizedAnswers: Record<string, string> = {};
    if (questionAnswers) {
      for (const [k, v] of Object.entries(questionAnswers)) {
        if (v.trim()) normalizedAnswers[k] = v;
      }
    }

    let savedRecord: AssignmentSubmission;
    if (existing) {
      savedRecord = {
        ...existing,
        answerText,
        questionAnswers: normalizedAnswers,
        attachments: [...attachments],
        status: 'Draft' as SubmissionStatus,
        updatedAt: new Date().toISOString(),
      };
      this._submissions.update(list => {
        const next = list.map(s => (s.id === existing.id ? savedRecord : s));
        this.persistLocalSubmissions(next);
        return next;
      });
    } else {
      savedRecord = {
        id: `subm-${Date.now()}`,
        assignmentId,
        studentId,
        answerText,
        questionAnswers: normalizedAnswers,
        attachments: [...attachments],
        status: 'Draft',
        version: 0,
        history: [],
        updatedAt: new Date().toISOString(),
      };
      this._submissions.update(list => {
        const next = [savedRecord, ...list];
        this.persistLocalSubmissions(next);
        return next;
      });
    }

    void this.syncSubmissionToFirestore(savedRecord).catch(() => {
      // logged by handleFirestoreError
    });

    if (assignment) {
      this.studentsService.showToast('info', `Draft saved for "${assignment.title}".`);
    }
  }

  submitWork(
    assignmentId: string,
    studentId: string,
    answerText: string,
    attachments: SubmissionAttachment[],
    questionAnswers?: Record<string, string>
  ): { success: boolean; error?: string } {
    const assignment = this.assignments().find(a => a.id === assignmentId);
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' };
    }

    const cleanQuestionAnswers: Record<string, string> = {};
    if (questionAnswers) {
      for (const [k, v] of Object.entries(questionAnswers)) {
        const clean = v.trim();
        if (clean) cleanQuestionAnswers[k] = clean;
      }
    }
    const answeredCount = Object.keys(cleanQuestionAnswers).length;
    const trimmed = answerText.trim();

    if (trimmed.length < 20 && answeredCount < 5) {
      return {
        success: false,
        error: 'Answer at least 5 worksheet questions or write at least 20 characters in the summary before submitting.',
      };
    }

    const isPastDue = this.isAssignmentPastDue(assignment);
    if (isPastDue && assignment.allowLateSubmission === false) {
      return { success: false, error: 'Late submissions are blocked for this assignment.' };
    }

    const existing = this._submissions().find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    if (existing?.status === 'Evaluated') {
      return { success: false, error: 'Evaluated submissions cannot be resubmitted.' };
    }
    if (existing && existing.status !== 'Draft' && isPastDue) {
      return { success: false, error: 'Resubmission is only permitted until the due date.' };
    }

    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const nextStatus: 'Submitted' | 'Late' = isPastDue ? 'Late' : 'Submitted';
    const prevVersion = existing?.version ?? 0;
    const nextVersion = prevVersion + 1;
    const summaryText =
      trimmed.length >= 20
        ? trimmed
        : `Completed ${answeredCount} worksheet questions for ${assignment.subjectName}.`;

    const history: SubmissionHistoryEntry[] = [...(existing?.history || [])];
    if (existing && (existing.status === 'Submitted' || existing.status === 'Late') && existing.submittedAt) {
      history.push({
        version: existing.version,
        answerText: existing.answerText,
        questionAnswers: existing.questionAnswers ? { ...existing.questionAnswers } : undefined,
        attachments: [...existing.attachments],
        submittedAt: existing.submittedAt,
        status: existing.status,
      });
    }

    let finalRecord: AssignmentSubmission;
    if (existing) {
      finalRecord = {
        ...existing,
        answerText: summaryText,
        questionAnswers: cleanQuestionAnswers,
        attachments: [...attachments],
        status: nextStatus,
        submittedAt: nowIso,
        submittedOn: todayDate,
        version: nextVersion,
        history,
        updatedAt: nowIso,
      };
      this._submissions.update(list => {
        const next = list.map(s => (s.id === existing.id ? finalRecord : s));
        this.persistLocalSubmissions(next);
        return next;
      });
    } else {
      finalRecord = {
        id: `subm-${Date.now()}`,
        assignmentId,
        studentId,
        answerText: summaryText,
        questionAnswers: cleanQuestionAnswers,
        attachments: [...attachments],
        status: nextStatus,
        submittedAt: nowIso,
        submittedOn: todayDate,
        version: 1,
        history: [],
        updatedAt: nowIso,
      };
      this._submissions.update(list => {
        const next = [finalRecord, ...list];
        this.persistLocalSubmissions(next);
        return next;
      });
    }

    void this.syncSubmissionToFirestore(finalRecord).catch(() => {
      // logged by handleFirestoreError
    });

    const student = this.studentsService.students().find(s => s.id === studentId);
    const facultyInfo = this.resolveFacultyForAssignment(assignment);
    this.notificationService.add({
      title: `New submission: ${assignment.title}`,
      description: `${student?.name || 'Student'} (${student?.enrollmentNo || ''}) submitted v${nextVersion}${nextStatus === 'Late' ? ' (Late)' : ''}.`,
      type: 'Academic',
      priority: nextStatus === 'Late' ? 'High' : 'Medium',
      icon: 'assignment_turned_in',
      link: `/faculty/assignments/${assignment.id}/submissions`,
      targetRole: 'faculty',
      targetFacultyId: facultyInfo.facultyId,
    });

    this.studentsService.showToast(
      'success',
      `Assignment "${assignment.title}" submitted (v${nextVersion}).`
    );
    return { success: true };
  }

  evaluateSubmission(
    assignmentId: string,
    studentId: string,
    marks: number,
    feedback: string,
    evaluatedBy: string
  ): { success: boolean; error?: string } {
    const assignment = this.assignments().find(a => a.id === assignmentId);
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' };
    }
    if (Number.isNaN(marks) || marks < 0 || marks > assignment.maxMarks) {
      return { success: false, error: `Marks must be between 0 and ${assignment.maxMarks}.` };
    }

    const existing = this._submissions().find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    if (!existing || existing.status === 'Draft') {
      return { success: false, error: 'Cannot evaluate before the student submits.' };
    }

    const evaluatedAt = new Date().toISOString();
    const cleanFeedback = feedback.trim();

    this._submissions.update(list => {
      const next = list.map(s =>
        s.id === existing.id
          ? {
              ...s,
              status: 'Evaluated' as SubmissionStatus,
              marks,
              feedback: cleanFeedback,
              evaluatedBy,
              evaluatedAt,
            }
          : s
      );
      this.persistLocalSubmissions(next);
      return next;
    });

    this._evaluations.update(map => ({
      ...map,
      [`${assignmentId}::${studentId}`]: {
        marksObtained: marks,
        feedback: cleanFeedback || undefined,
      },
    }));

    this.notificationService.add({
      title: `Assignment evaluated: ${assignment.title}`,
      description: `Scored ${marks}/${assignment.maxMarks} marks. Evaluated by ${evaluatedBy}.`,
      type: 'Academic',
      priority: 'Medium',
      icon: 'grade',
      link: `/student/assignments/${assignment.id}`,
      targetRole: 'student',
      targetStudentId: studentId,
    });

    const student = this.studentsService.students().find(s => s.id === studentId);
    this.studentsService.showToast(
      'success',
      `Evaluation saved for ${student?.name || 'student'} (${marks}/${assignment.maxMarks}).`
    );
    return { success: true };
  }

  submitAssignment(assignmentId: string, studentId: string, note?: string): void {
    const text = note?.trim()
      ? note.trim().padEnd(20, ' ')
      : 'Assignment coursework completed and submitted for evaluation.';
    this.submitWork(assignmentId, studentId, text, []);
  }

  add(assignment: Omit<Assignment, 'id'>): void {
    const newId = `as-${Date.now()}`;
    this._assignments.update(list => [
      {
        ...assignment,
        allowLateSubmission: assignment.allowLateSubmission ?? true,
        id: newId,
        questions: getQuestionsForSubject(assignment.subjectId, newId),
      },
      ...list,
    ]);
    this.studentsService.showToast('success', `Assignment "${assignment.title}" created.`);
  }

  update(id: string, assignment: Omit<Assignment, 'id'>): void {
    this._assignments.update(list =>
      list.map(a =>
        a.id === id
          ? {
              ...assignment,
              allowLateSubmission: assignment.allowLateSubmission ?? true,
              id,
              questions: getQuestionsForSubject(assignment.subjectId, id),
            }
          : a
      )
    );
    this.studentsService.showToast('success', `Assignment "${assignment.title}" updated.`);
  }

  delete(id: string): void {
    const a = this._assignments().find(item => item.id === id);
    this._assignments.update(list => list.filter(item => item.id !== id));
    this._submissions.update(list => {
      const next = list.filter(s => s.assignmentId !== id);
      this.persistLocalSubmissions(next);
      return next;
    });
    if (a) {
      this.studentsService.showToast('info', `Assignment "${a.title}" deleted.`);
    }
  }
}
