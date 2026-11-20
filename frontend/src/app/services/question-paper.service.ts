import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudentsService } from './students.service';
import { ExaminationsService } from './examinations.service';
import { StudentFirebaseService } from './student-firebase.service';
import { NotificationService } from './notification.service';
import { getOnlineExamQuestions } from '../data/exam-questions';

export type QuestionType = 'MCQ' | 'Short Answer' | 'Long Essay' | 'Numerical / Code';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionPaperStatus = 'Draft' | 'Finalized';
export type AnswerSheetStatus = 'Pending Evaluation' | 'Evaluated';

export interface QuestionBankItem {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  marks: number;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  rubricHint?: string;
  createdBy: string;
  createdAt: string;
}

export interface QuestionPaperSection {
  id: string;
  name: string;
  instructions: string;
  questionIds: string[];
}

export interface QuestionPaper {
  id: string;
  title: string;
  examId?: string;
  examTitle?: string;
  subjectId: string;
  subjectName: string;
  courseName: string;
  semester: string;
  durationMinutes: number;
  targetMaxMarks: number;
  generalInstructions: string;
  sections: QuestionPaperSection[];
  status: QuestionPaperStatus;
  createdBy: string;
  updatedAt: string;
}

export interface AnswerSheetQuestionEval {
  questionId: string;
  questionNo: number;
  kind: 'mcq' | 'subjective';
  topic: string;
  prompt: string;
  maxMarks: number;
  studentAnswer: string;
  correctAnswer?: string;
  marksAwarded: number | null;
  comment?: string;
}

export interface ExamAnswerSheet {
  id: string;
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  courseName: string;
  semester: string;
  studentId: string;
  studentName: string;
  enrollmentNo: string;
  sheetCode: string;
  mode: 'Online' | 'Offline Scanned' | 'Hybrid';
  submittedAt: string;
  verificationHash?: string;
  responses: AnswerSheetQuestionEval[];
  totalMarksAwarded: number | null;
  maxMarks: number;
  overallFeedback: string;
  status: AnswerSheetStatus;
  evaluatedBy?: string;
  evaluatedAt?: string;
  syncedToResults: boolean;
}

const QUESTION_BANK_STORAGE_KEY = 'eduerp_question_bank_v1';
const QUESTION_PAPERS_STORAGE_KEY = 'eduerp_question_papers_v1';
const ANSWER_SHEETS_STORAGE_KEY = 'eduerp_answer_sheets_v1';

const SEED_QUESTIONS: QuestionBankItem[] = [
  // Advanced Data Structures & Algorithms (sub-1)
  {
    id: 'qb-1',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    topic: 'AVL Trees',
    type: 'MCQ',
    difficulty: 'Easy',
    marks: 2,
    prompt: 'Which rotation resolves a Left-Right (LR) imbalance after inserting into an AVL tree?',
    options: [
      'Single Left Rotation',
      'Single Right Rotation',
      'Left Rotation on left child followed by Right Rotation on ancestor',
      'Right Rotation on ancestor followed by Left Rotation'
    ],
    correctAnswer: 'Left Rotation on left child followed by Right Rotation on ancestor',
    rubricHint: 'Award full 2 marks for exact two-step double rotation answer.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-18T10:00:00.000Z'
  },
  {
    id: 'qb-2',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    topic: 'Heaps & Priority Queues',
    type: 'MCQ',
    difficulty: 'Medium',
    marks: 2,
    prompt: 'What is the worst-case time complexity of building a binary max-heap from an unsorted array of n elements using bottom-up heapify?',
    options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(n^2)'],
    correctAnswer: 'O(n)',
    rubricHint: 'Geometric series summation proves linear tight bound.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-18T10:05:00.000Z'
  },
  {
    id: 'qb-3',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    topic: 'Shortest Paths',
    type: 'MCQ',
    difficulty: 'Medium',
    marks: 2,
    prompt: 'Which graph algorithm correctly detects negative-weight cycles reachable from a single source vertex?',
    options: [
      'Dijkstra with Fibonacci Heap',
      'Bellman-Ford Algorithm',
      'Prim MST Algorithm',
      'Topological Relaxation'
    ],
    correctAnswer: 'Bellman-Ford Algorithm',
    rubricHint: 'V-th relaxation pass detects negative cycles.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-18T10:10:00.000Z'
  },
  {
    id: 'qb-4',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    topic: 'Dynamic Programming',
    type: 'Short Answer',
    difficulty: 'Medium',
    marks: 4,
    prompt: 'Explain the loop traversal direction difference between 0/1 Knapsack and Unbounded Knapsack when optimizing space to a 1D DP array.',
    correctAnswer: '0/1 Knapsack iterates capacity backward (W down to w[i]) to avoid reusing the same item; Unbounded Knapsack iterates forward (w[i] up to W) so items can be reused.',
    rubricHint: '2 marks for 0/1 backward invariant, 2 marks for Unbounded forward reuse.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-19T09:30:00.000Z'
  },
  {
    id: 'qb-5',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    topic: 'Segment Trees & Lazy Propagation',
    type: 'Long Essay',
    difficulty: 'Hard',
    marks: 10,
    prompt: 'Design a Segment Tree supporting range-add updates and range-sum queries in O(log n). Trace lazy propagation push-down logic on an 8-element array.',
    correctAnswer: 'Store tree[] and lazy[] arrays of size 4n; push pending lazy updates to children before descending on partial overlap.',
    rubricHint: '4 marks for push-down invariants, 4 marks for update/query recursion, 2 marks for complexity proof.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-20T14:15:00.000Z'
  },
  // Cloud Computing & DevOps (sub-4)
  {
    id: 'qb-6',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    topic: 'Kubernetes Autoscaling',
    type: 'MCQ',
    difficulty: 'Easy',
    marks: 2,
    prompt: 'What prerequisite must be configured on a Pod container spec before a HorizontalPodAutoscaler can scale on CPU utilization?',
    options: ['livenessProbe timeout', 'resources.requests.cpu', 'NodePort exposure', 'hostNetwork: true'],
    correctAnswer: 'resources.requests.cpu',
    rubricHint: 'HPA calculates utilization percentage relative to requested CPU.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-22T11:00:00.000Z'
  },
  {
    id: 'qb-7',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    topic: 'Container Security',
    type: 'Short Answer',
    difficulty: 'Medium',
    marks: 5,
    prompt: 'Contrast startupProbe, readinessProbe, and livenessProbe failure behaviors in Kubernetes production deployments.',
    correctAnswer: 'readinessProbe detaches Pod IP from Service endpoints; livenessProbe restarts the container; startupProbe delays liveness checks during slow boots.',
    rubricHint: 'Award 1.5 marks per probe behavior and 0.5 for production example.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-22T11:15:00.000Z'
  },
  {
    id: 'qb-8',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    topic: 'Disaster Recovery & SRE',
    type: 'Long Essay',
    difficulty: 'Hard',
    marks: 10,
    prompt: 'Differentiate RPO and RTO targets and design a multi-region failover architecture for a university examination portal with zero-downtime secrets rotation.',
    correctAnswer: 'RPO bounds data loss window; RTO bounds restoration time. Combine cross-region WAL streaming, dual active secrets, and health-checked DNS failover.',
    rubricHint: '3 marks RPO/RTO, 4 marks multi-region failover topology, 3 marks dual-key rotation.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-25T15:40:00.000Z'
  },
  // AI & Machine Learning (sub-8)
  {
    id: 'qb-9',
    subjectId: 'sub-8',
    subjectName: 'Artificial Intelligence & ML',
    topic: 'Bias-Variance Tradeoff',
    type: 'MCQ',
    difficulty: 'Easy',
    marks: 2,
    prompt: 'Increasing L2 regularization strength (lambda) in linear regression primarily:',
    options: [
      'Increases model variance and overfitting risk',
      'Shrinks weight magnitudes to reduce variance at the cost of higher bias',
      'Forces sparse exact zero feature weights like L1',
      'Eliminates need for feature scaling'
    ],
    correctAnswer: 'Shrinks weight magnitudes to reduce variance at the cost of higher bias',
    rubricHint: 'Ridge regression penalizes squared L2 norm of weights.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-28T09:10:00.000Z'
  },
  {
    id: 'qb-10',
    subjectId: 'sub-8',
    subjectName: 'Artificial Intelligence & ML',
    topic: 'Heuristic Search',
    type: 'Numerical / Code',
    difficulty: 'Hard',
    marks: 8,
    prompt: 'Trace the A* search open and closed priority queue steps on a 5-node weighted graph with heuristic h(n) and prove why admissibility guarantees optimality.',
    correctAnswer: 'Admissible h(n) <= h*(n) ensures f(goal) <= f(n) for every node along suboptimal prefixes before goal expansion.',
    rubricHint: '5 marks for queue trace, 3 marks for admissibility proof.',
    createdBy: 'Dr. Sameer Verma',
    createdAt: '2026-10-29T13:20:00.000Z'
  }
];

const SEED_PAPERS: QuestionPaper[] = [
  {
    id: 'qp-1',
    title: 'Internal Assessment I — DSA Theory & Problem Solving',
    examId: 'ex-1',
    examTitle: 'Internal Assessment I',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    durationMinutes: 60,
    targetMaxMarks: 20,
    generalInstructions: 'All questions are compulsory. Write clean asymptotic justifications for Section B and Section C.',
    sections: [
      {
        id: 'sec-a',
        name: 'Section A — Objective Assessment (MCQs)',
        instructions: 'Choose the most accurate option. Each question carries 2 marks.',
        questionIds: ['qb-1', 'qb-2', 'qb-3']
      },
      {
        id: 'sec-b',
        name: 'Section B — Analytical Short Answer',
        instructions: 'Answer concisely with state invariant reasoning.',
        questionIds: ['qb-4']
      },
      {
        id: 'sec-c',
        name: 'Section C — Algorithm Design',
        instructions: 'Provide complete recurrence/complexity proof.',
        questionIds: ['qb-5']
      }
    ],
    status: 'Finalized',
    createdBy: 'Dr. Sameer Verma',
    updatedAt: '2026-11-10T10:30:00.000Z'
  },
  {
    id: 'qp-2',
    title: 'Internal Assessment II — Cloud Infrastructure & SRE',
    examId: 'ex-6',
    examTitle: 'Internal Assessment II',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    durationMinutes: 60,
    targetMaxMarks: 25,
    generalInstructions: 'Show Kubernetes YAML key paths cleanly and specify RPO/RTO metrics where requested.',
    sections: [
      {
        id: 'sec-a',
        name: 'Section A — Cloud Fundamentals',
        instructions: 'Attempt all objective questions.',
        questionIds: ['qb-6']
      },
      {
        id: 'sec-b',
        name: 'Section B — Architecture & Reliability',
        instructions: 'Attempt both short and long design responses.',
        questionIds: ['qb-7', 'qb-8']
      }
    ],
    status: 'Draft',
    createdBy: 'Dr. Sameer Verma',
    updatedAt: '2026-11-14T15:20:00.000Z'
  }
];

const SEED_ANSWER_SHEETS: ExamAnswerSheet[] = [
  {
    id: 'asheet-ex1-stu1',
    examId: 'ex-1',
    examTitle: 'Internal Assessment I',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    studentId: 'stu-1',
    studentName: 'Rahul Verma',
    enrollmentNo: 'MCA-2025-001',
    sheetCode: 'ANS-EX1-001',
    mode: 'Online',
    submittedAt: '2026-11-20T10:52:00.000Z',
    verificationHash: 'EX-CS501-001-VERIFIED',
    maxMarks: 20,
    totalMarksAwarded: null,
    overallFeedback: '',
    status: 'Pending Evaluation',
    syncedToResults: false,
    responses: [
      {
        questionId: 'qb-1',
        questionNo: 1,
        kind: 'mcq',
        topic: 'AVL Trees',
        prompt: 'Which rotation resolves a Left-Right (LR) imbalance after inserting into an AVL tree?',
        maxMarks: 2,
        studentAnswer: 'Left Rotation on left child followed by Right Rotation on ancestor',
        correctAnswer: 'Left Rotation on left child followed by Right Rotation on ancestor',
        marksAwarded: null
      },
      {
        questionId: 'qb-2',
        questionNo: 2,
        kind: 'mcq',
        topic: 'Heaps & Priority Queues',
        prompt: 'What is the worst-case time complexity of building a binary max-heap from an unsorted array of n elements using bottom-up heapify?',
        maxMarks: 2,
        studentAnswer: 'O(n)',
        correctAnswer: 'O(n)',
        marksAwarded: null
      },
      {
        questionId: 'qb-3',
        questionNo: 3,
        kind: 'mcq',
        topic: 'Shortest Paths',
        prompt: 'Which graph algorithm correctly detects negative-weight cycles reachable from a single source vertex?',
        maxMarks: 2,
        studentAnswer: 'Bellman-Ford Algorithm',
        correctAnswer: 'Bellman-Ford Algorithm',
        marksAwarded: null
      },
      {
        questionId: 'qb-4',
        questionNo: 4,
        kind: 'subjective',
        topic: 'Dynamic Programming',
        prompt: 'Explain the loop traversal direction difference between 0/1 Knapsack and Unbounded Knapsack when optimizing space to a 1D DP array.',
        maxMarks: 4,
        studentAnswer:
          'In 0/1 Knapsack we loop capacity j from W down to weight[i] so dp[j - weight[i]] still reflects the previous item row. In Unbounded Knapsack we loop from weight[i] up to W so updated states in the same row allow picking item i multiple times.',
        correctAnswer:
          '0/1 Knapsack iterates capacity backward (W down to w[i]); Unbounded Knapsack iterates forward (w[i] up to W).',
        marksAwarded: null
      },
      {
        questionId: 'qb-5',
        questionNo: 5,
        kind: 'subjective',
        topic: 'Segment Trees & Lazy Propagation',
        prompt: 'Design a Segment Tree supporting range-add updates and range-sum queries in O(log n). Trace lazy propagation push-down logic on an 8-element array.',
        maxMarks: 10,
        studentAnswer:
          'Maintain tree[4n] for segment sums and lazy[4n] for deferred deltas. Before recursing on partial overlap, push(node, l, r): add lazy[node]*(r-l+1) to tree[node] and propagate delta down to 2*node and 2*node+1 when l != r, then reset lazy[node]=0. Both query and update traverse at most 4*log(n) nodes.',
        correctAnswer:
          'Store tree[] and lazy[] arrays of size 4n; push pending lazy updates to children before descending.',
        marksAwarded: null
      }
    ]
  },
  {
    id: 'asheet-ex1-stu2',
    examId: 'ex-1',
    examTitle: 'Internal Assessment I',
    subjectId: 'sub-1',
    subjectName: 'Advanced Data Structures & Algorithms',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    studentId: 'stu-2',
    studentName: 'Ananya Sharma',
    enrollmentNo: 'MCA-2025-002',
    sheetCode: 'ANS-EX1-002',
    mode: 'Online',
    submittedAt: '2026-11-20T10:48:00.000Z',
    verificationHash: 'EX-CS501-002-VERIFIED',
    maxMarks: 20,
    totalMarksAwarded: 19,
    overallFeedback: 'Clear invariant reasoning and exact complexity bounds.',
    status: 'Evaluated',
    evaluatedBy: 'Dr. Sameer Verma',
    evaluatedAt: '2026-11-20T16:15:00.000Z',
    syncedToResults: false,
    responses: [
      {
        questionId: 'qb-1',
        questionNo: 1,
        kind: 'mcq',
        topic: 'AVL Trees',
        prompt: 'Which rotation resolves a Left-Right (LR) imbalance after inserting into an AVL tree?',
        maxMarks: 2,
        studentAnswer: 'Left Rotation on left child followed by Right Rotation on ancestor',
        correctAnswer: 'Left Rotation on left child followed by Right Rotation on ancestor',
        marksAwarded: 2
      },
      {
        questionId: 'qb-2',
        questionNo: 2,
        kind: 'mcq',
        topic: 'Heaps & Priority Queues',
        prompt: 'What is the worst-case time complexity of building a binary max-heap from an unsorted array of n elements using bottom-up heapify?',
        maxMarks: 2,
        studentAnswer: 'O(n)',
        correctAnswer: 'O(n)',
        marksAwarded: 2
      },
      {
        questionId: 'qb-3',
        questionNo: 3,
        kind: 'mcq',
        topic: 'Shortest Paths',
        prompt: 'Which graph algorithm correctly detects negative-weight cycles reachable from a single source vertex?',
        maxMarks: 2,
        studentAnswer: 'Bellman-Ford Algorithm',
        correctAnswer: 'Bellman-Ford Algorithm',
        marksAwarded: 2
      },
      {
        questionId: 'qb-4',
        questionNo: 4,
        kind: 'subjective',
        topic: 'Dynamic Programming',
        prompt: 'Explain the loop traversal direction difference between 0/1 Knapsack and Unbounded Knapsack when optimizing space to a 1D DP array.',
        maxMarks: 4,
        studentAnswer:
          'Backward iteration protects previous-row state for 0/1 selection; forward iteration intentionally cascades current-row updates for unbounded selection.',
        correctAnswer:
          '0/1 Knapsack iterates capacity backward (W down to w[i]); Unbounded Knapsack iterates forward.',
        marksAwarded: 4
      },
      {
        questionId: 'qb-5',
        questionNo: 5,
        kind: 'subjective',
        topic: 'Segment Trees & Lazy Propagation',
        prompt: 'Design a Segment Tree supporting range-add updates and range-sum queries in O(log n). Trace lazy propagation push-down logic on an 8-element array.',
        maxMarks: 10,
        studentAnswer:
          'Presented tree[4n] and lazy[4n] node update rules and full trace on [2,4,1,5,3,6,2,8] for range add [1..4] +3.',
        correctAnswer: 'Push lazy tags lazily before descending.',
        marksAwarded: 9,
        comment: 'Missed explicit base condition check when l == r during leaf push.'
      }
    ]
  },
  {
    id: 'asheet-ex6-stu5',
    examId: 'ex-6',
    examTitle: 'Internal Assessment II',
    subjectId: 'sub-4',
    subjectName: 'Cloud Computing & DevOps',
    courseName: 'Master of Computer Applications',
    semester: 'Semester 2',
    studentId: 'stu-5',
    studentName: 'Rohan Kulkarni',
    enrollmentNo: 'MCA-2025-005',
    sheetCode: 'SCAN-EX6-005',
    mode: 'Offline Scanned',
    submittedAt: '2026-11-24T12:05:00.000Z',
    maxMarks: 25,
    totalMarksAwarded: null,
    overallFeedback: '',
    status: 'Pending Evaluation',
    syncedToResults: false,
    responses: [
      {
        questionId: 'qb-6',
        questionNo: 1,
        kind: 'mcq',
        topic: 'Kubernetes Autoscaling',
        prompt: 'What prerequisite must be configured on a Pod container spec before a HorizontalPodAutoscaler can scale on CPU utilization?',
        maxMarks: 5,
        studentAnswer: 'resources.requests.cpu',
        correctAnswer: 'resources.requests.cpu',
        marksAwarded: null
      },
      {
        questionId: 'qb-7',
        questionNo: 2,
        kind: 'subjective',
        topic: 'Probes & Health Checks',
        prompt: 'Contrast startupProbe, readinessProbe, and livenessProbe failure behaviors in Kubernetes production deployments.',
        maxMarks: 10,
        studentAnswer:
          'Scanned Booklet Page 2: Correctly differentiated endpoint removal on readinessProbe failure vs kubelet container restart on livenessProbe failure; startupProbe shields slow JVM bootups.',
        correctAnswer: 'Readiness removes endpoints; liveness restarts Pod; startup delays liveness.',
        marksAwarded: null
      },
      {
        questionId: 'qb-8',
        questionNo: 3,
        kind: 'subjective',
        topic: 'Disaster Recovery',
        prompt: 'Differentiate RPO and RTO targets and design a multi-region failover architecture.',
        maxMarks: 10,
        studentAnswer:
          'Scanned Booklet Page 4: Defined RPO as data-loss tolerance and RTO as recovery downtime SLA; sketched active-passive PostgreSQL read replica promotion.',
        correctAnswer: 'RPO vs RTO definitions + multi-region replication and secret rotation.',
        marksAwarded: null
      }
    ]
  }
];

@Injectable({ providedIn: 'root' })
export class QuestionPaperService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly studentsService = inject(StudentsService);
  private readonly examsService = inject(ExaminationsService);
  private readonly studentFirebase = inject(StudentFirebaseService);
  private readonly notificationService = inject(NotificationService);

  private readonly _questions = signal<QuestionBankItem[]>(this.loadStoredQuestions());
  private readonly _papers = signal<QuestionPaper[]>(this.loadStoredPapers());
  private readonly _answerSheets = signal<ExamAnswerSheet[]>(this.loadStoredAnswerSheets());

  readonly questions = this._questions.asReadonly();
  readonly papers = this._papers.asReadonly();

  // Merge seeded/evaluated answer sheets with any live submitted student ExamAttempts
  readonly answerSheets = computed<ExamAnswerSheet[]>(() => {
    const stored = this._answerSheets();
    const byKey = new Map(stored.map(s => [`${s.examId}::${s.studentId}`, s]));
    const liveAttempts = this.studentFirebase.examAttempts().filter(a => a.status === 'Submitted');
    const studentsById = new Map(this.studentsService.students().map(s => [s.id, s]));
    const examsById = new Map(this.examsService.exams().map(e => [e.id, e]));

    for (const att of liveAttempts) {
      const key = `${att.examId}::${att.studentId}`;
      if (byKey.has(key)) continue;

      const exam = examsById.get(att.examId);
      if (!exam) continue;
      const stu = studentsById.get(att.studentId);
      const examQuestions = getOnlineExamQuestions(exam.subjectId, exam.id);
      const responses: AnswerSheetQuestionEval[] = examQuestions.map(q => ({
        questionId: q.id,
        questionNo: q.number,
        kind: q.kind === 'mcq' ? 'mcq' : 'subjective',
        topic: q.topic,
        prompt: q.prompt,
        maxMarks: Number(q.marks) || 2,
        studentAnswer: att.answers[q.id] || '(Not answered)',
        correctAnswer: q.options?.[0],
        marksAwarded: null
      }));

      byKey.set(key, {
        id: `asheet-live-${att.id}`,
        examId: exam.id,
        examTitle: exam.title,
        subjectId: exam.subjectId,
        subjectName: exam.subjectName,
        courseName: exam.courseName,
        semester: exam.semester,
        studentId: att.studentId,
        studentName: stu?.name || 'Student',
        enrollmentNo: att.enrollmentNo || stu?.enrollmentNo || '-',
        sheetCode: `ONL-${exam.id.toUpperCase()}-${att.studentId.toUpperCase()}`,
        mode: att.mode === 'Hybrid' ? 'Hybrid' : 'Online',
        submittedAt: att.submittedAt || att.updatedAt,
        verificationHash: att.verificationHash,
        responses,
        totalMarksAwarded: null,
        maxMarks: exam.maxMarks,
        overallFeedback: '',
        status: 'Pending Evaluation',
        syncedToResults: false
      });
    }

    return Array.from(byKey.values()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  });

  private loadStoredQuestions(): QuestionBankItem[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_QUESTIONS;
    try {
      const raw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuestionBankItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return SEED_QUESTIONS;
  }

  private persistQuestions(list: QuestionBankItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore quota errors
    }
  }

  private loadStoredPapers(): QuestionPaper[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_PAPERS;
    try {
      const raw = localStorage.getItem(QUESTION_PAPERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuestionPaper[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return SEED_PAPERS;
  }

  private persistPapers(list: QuestionPaper[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(QUESTION_PAPERS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore quota errors
    }
  }

  private loadStoredAnswerSheets(): ExamAnswerSheet[] {
    if (!isPlatformBrowser(this.platformId)) return SEED_ANSWER_SHEETS;
    try {
      const raw = localStorage.getItem(ANSWER_SHEETS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ExamAnswerSheet[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return SEED_ANSWER_SHEETS;
  }

  private persistAnswerSheets(list: ExamAnswerSheet[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(ANSWER_SHEETS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore quota errors
    }
  }

  addQuestion(payload: Omit<QuestionBankItem, 'id' | 'createdAt'>): QuestionBankItem {
    const item: QuestionBankItem = {
      ...payload,
      id: `qb-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this._questions.update(list => {
      const next = [item, ...list];
      this.persistQuestions(next);
      return next;
    });
    this.studentsService.showToast('success', `Question added to "${item.subjectName}" bank.`);
    return item;
  }

  updateQuestion(id: string, payload: Omit<QuestionBankItem, 'id' | 'createdAt'>): void {
    this._questions.update(list => {
      const next = list.map(q => (q.id === id ? { ...q, ...payload } : q));
      this.persistQuestions(next);
      return next;
    });
    this.studentsService.showToast('success', 'Question updated in Question Bank.');
  }

  deleteQuestion(id: string): void {
    this._questions.update(list => {
      const next = list.filter(q => q.id !== id);
      this.persistQuestions(next);
      return next;
    });
    this._papers.update(papers => {
      const next = papers.map(p => ({
        ...p,
        sections: p.sections.map(s => ({
          ...s,
          questionIds: s.questionIds.filter(qId => qId !== id)
        }))
      }));
      this.persistPapers(next);
      return next;
    });
    this.studentsService.showToast('info', 'Question removed from bank.');
  }

  getPaperQuestions(paper: QuestionPaper): QuestionBankItem[] {
    const qMap = new Map(this._questions().map(q => [q.id, q]));
    const ordered: QuestionBankItem[] = [];
    for (const sec of paper.sections) {
      for (const qId of sec.questionIds) {
        const q = qMap.get(qId);
        if (q) ordered.push(q);
      }
    }
    return ordered;
  }

  getPaperTotalMarks(paper: QuestionPaper): number {
    return this.getPaperQuestions(paper).reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  }

  createPaper(payload: Omit<QuestionPaper, 'id' | 'updatedAt'>): QuestionPaper {
    const paper: QuestionPaper = {
      ...payload,
      id: `qp-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    this._papers.update(list => {
      const next = [paper, ...list];
      this.persistPapers(next);
      return next;
    });
    this.studentsService.showToast(
      'success',
      `Question paper "${paper.title}" saved as ${paper.status}.`
    );
    return paper;
  }

  updatePaper(id: string, payload: Omit<QuestionPaper, 'id' | 'updatedAt'>): void {
    this._papers.update(list => {
      const next = list.map(p =>
        p.id === id ? { ...payload, id, updatedAt: new Date().toISOString() } : p
      );
      this.persistPapers(next);
      return next;
    });
    this.studentsService.showToast('success', `Question paper "${payload.title}" updated.`);
  }

  finalizePaper(id: string): void {
    this._papers.update(list => {
      const next = list.map(p =>
        p.id === id
          ? { ...p, status: 'Finalized' as QuestionPaperStatus, updatedAt: new Date().toISOString() }
          : p
      );
      this.persistPapers(next);
      return next;
    });
    this.studentsService.showToast('success', 'Question paper finalized and locked for examination printing.');
  }

  deletePaper(id: string): void {
    this._papers.update(list => {
      const next = list.filter(p => p.id !== id);
      this.persistPapers(next);
      return next;
    });
    this.studentsService.showToast('info', 'Question paper deleted.');
  }

  evaluateAnswerSheet(
    sheetId: string,
    responses: AnswerSheetQuestionEval[],
    overallFeedback: string,
    evaluatedBy: string,
    markSynced = false
  ): ExamAnswerSheet | null {
    const sourceSheet = this.answerSheets().find(s => s.id === sheetId);
    if (!sourceSheet) return null;

    const totalMarksAwarded = Math.min(
      sourceSheet.maxMarks,
      Math.max(
        0,
        Math.round(responses.reduce((acc, r) => acc + (Number(r.marksAwarded) || 0), 0) * 10) / 10
      )
    );

    const updatedSheet: ExamAnswerSheet = {
      ...sourceSheet,
      responses: responses.map(r => ({ ...r })),
      totalMarksAwarded,
      overallFeedback: overallFeedback.trim(),
      status: 'Evaluated',
      evaluatedBy,
      evaluatedAt: new Date().toISOString(),
      syncedToResults: markSynced ? true : sourceSheet.syncedToResults
    };

    this._answerSheets.update(list => {
      const exists = list.some(s => s.id === sheetId);
      const next = exists
        ? list.map(s => (s.id === sheetId ? updatedSheet : s))
        : [updatedSheet, ...list];
      this.persistAnswerSheets(next);
      return next;
    });

    this.notificationService.add({
      title: `Answer sheet evaluated: ${sourceSheet.examTitle}`,
      description: `Scored ${totalMarksAwarded}/${sourceSheet.maxMarks} in ${sourceSheet.subjectName}. Evaluated by ${evaluatedBy}.`,
      type: 'Academic',
      priority: 'Medium',
      icon: 'fact_check',
      link: '/student/exams',
      targetRole: 'student',
      targetStudentId: sourceSheet.studentId
    });

    this.studentsService.showToast(
      'success',
      `Evaluated ${sourceSheet.studentName}'s answer sheet (${totalMarksAwarded}/${sourceSheet.maxMarks}).`
    );
    return updatedSheet;
  }

  markSheetsSynced(sheetIds: string[]): void {
    const idSet = new Set(sheetIds);
    const currentSheets = this.answerSheets();
    const updatedMap = new Map(this._answerSheets().map(s => [s.id, s]));

    for (const s of currentSheets) {
      if (idSet.has(s.id)) {
        updatedMap.set(s.id, { ...s, syncedToResults: true });
      }
    }

    const next = Array.from(updatedMap.values());
    this._answerSheets.set(next);
    this.persistAnswerSheets(next);
  }
}
