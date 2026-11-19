export interface OnlineExamQuestion {
  id: string;
  number: number;
  kind: 'mcq' | 'short';
  topic: string;
  marks: number;
  prompt: string;
  options?: string[];
}

const SUBJECT_EXAM_BANK: Record<string, Omit<OnlineExamQuestion, 'id' | 'number'>[]> = {
  'sub-1': [
    {
      kind: 'mcq',
      topic: 'AVL Trees',
      marks: 2,
      prompt: 'Which rotation resolves a Left-Right (LR) imbalance after inserting into an AVL tree?',
      options: ['Single Left Rotation', 'Single Right Rotation', 'Left Rotation on left child followed by Right Rotation on ancestor', 'Right Rotation on ancestor followed by Left Rotation'],
    },
    {
      kind: 'mcq',
      topic: 'Heaps',
      marks: 2,
      prompt: 'What is the worst-case time complexity of building a binary max-heap from an unsorted array of n elements using bottom-up heapify?',
      options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(n^2)'],
    },
    {
      kind: 'mcq',
      topic: 'Shortest Paths',
      marks: 2,
      prompt: 'Which graph algorithm correctly detects negative-weight cycles reachable from a single source vertex?',
      options: ['Dijkstra with Fibonacci Heap', 'Bellman-Ford Algorithm', 'Prim’s MST Algorithm', 'Topological Relaxation'],
    },
    {
      kind: 'mcq',
      topic: 'Disjoint Set Union',
      marks: 2,
      prompt: 'Combining Union by Rank with Path Compression yields an amortized per-operation time complexity bounded by:',
      options: ['O(log log n)', 'O(alpha(n)) inverse Ackermann', 'O(sqrt(n))', 'O(1) worst-case'],
    },
    {
      kind: 'mcq',
      topic: 'String Matching',
      marks: 2,
      prompt: 'In the Knuth-Morris-Pratt (KMP) algorithm, what does the prefix array LPS[i] store?',
      options: ['Hash of prefix 0..i', 'Length of longest proper prefix that is also a suffix of pattern[0..i]', 'Last occurrence index of character i', 'Minimum edit distance up to i'],
    },
    {
      kind: 'mcq',
      topic: 'Red-Black Trees',
      marks: 2,
      prompt: 'What is the maximum possible height of a Red-Black Tree containing n internal nodes?',
      options: ['log2(n)', '2 * log2(n + 1)', 'n / 2', '1.44 * log2(n + 2)'],
    },
    {
      kind: 'mcq',
      topic: 'Segment Trees',
      marks: 2,
      prompt: 'Why is lazy propagation used in a Segment Tree during range update operations?',
      options: ['To compress node pointers into a bitset', 'To defer subtree updates until a query descends into them, keeping updates O(log n)', 'To avoid storing leaf nodes', 'To convert recursion into BFS'],
    },
    {
      kind: 'mcq',
      topic: 'B-Trees',
      marks: 2,
      prompt: 'In a B-Tree of minimum degree t = 4, what is the maximum number of keys a single node may store before splitting?',
      options: ['4', '7', '8', '9'],
    },
    {
      kind: 'short',
      topic: 'Dynamic Programming',
      marks: 2,
      prompt: 'Explain the loop traversal direction difference between 0/1 Knapsack and Unbounded Knapsack when optimizing space to a 1D DP array.',
    },
    {
      kind: 'short',
      topic: 'Network Flow',
      marks: 2,
      prompt: 'State why residual backward edges are mandatory in the Ford-Fulkerson / Edmonds-Karp maximum flow algorithm.',
    },
  ],
  'sub-2': [
    {
      kind: 'mcq',
      topic: 'Angular Signals',
      marks: 3,
      prompt: 'In Angular zoneless applications, which primitive automatically memoizes and recomputes derived reactive state without side effects?',
      options: ['effect()', 'computed()', 'afterNextRender()', 'BehaviorSubject.next()'],
    },
    {
      kind: 'mcq',
      topic: 'Standalone Architecture',
      marks: 3,
      prompt: 'What is the primary architectural advantage of standalone components paired with route-level loadComponent?',
      options: ['Enforces global NgModule eager bundling', 'Improves tree-shaking and defers feature bundle download until navigation', 'Eliminates TypeScript strict checks', 'Replaces RxJS completely'],
    },
    {
      kind: 'mcq',
      topic: 'SSR Hydration',
      marks: 3,
      prompt: 'Why must browser-only globals such as localStorage or sessionStorage be guarded with isPlatformBrowser(PLATFORM_ID)?',
      options: ['Angular SSR runs on Node.js where DOM storage APIs are undefined', 'It prevents Tailwind CSS purging', 'It disables OnPush change detection', 'It encrypts JWT cookies automatically'],
    },
    {
      kind: 'mcq',
      topic: 'Security & Guards',
      marks: 3,
      prompt: 'Which Angular Router guard hook prevents even downloading a lazy-loaded feature chunk for unauthorized users?',
      options: ['CanDeactivateFn', 'ResolveFn', 'CanMatchFn', 'HttpInterceptorFn'],
    },
    {
      kind: 'mcq',
      topic: 'Reactive Forms',
      marks: 3,
      prompt: 'Why is ReactiveFormsModule preferred over template-driven ngModel in strict enterprise portals?',
      options: ['Synchronous immutable FormControl models, typed FormGroup validation, and deterministic testing', 'It compiles templates at runtime with @angular/compiler', 'It bypasses FormGroup validators', 'It requires zone.js'],
    },
    {
      kind: 'mcq',
      topic: 'Template Control Flow',
      marks: 3,
      prompt: 'When using Angular @for blocks over mutable collections, why is tracking by a unique entity ID essential?',
      options: ['Preserves DOM nodes and input focus without re-creating unchanged rows', 'Forces full list teardown on every signal update', 'Automatically sorts items alphabetically', 'Injects ARIA roles automatically'],
    },
    {
      kind: 'mcq',
      topic: 'Accessibility',
      marks: 3,
      prompt: 'Which ARIA attributes must accompany a custom modal container for screen reader accessibility?',
      options: ['role="dialog" and aria-modal="true"', 'role="marquee" and aria-hidden="true"', 'tabindex="-1" only', 'data-modal="true"'],
    },
    {
      kind: 'mcq',
      topic: 'OnPush Change Detection',
      marks: 3,
      prompt: 'Under ChangeDetectionStrategy.OnPush, which event notifies Angular to re-evaluate the component view?',
      options: ['Mutating a plain array in-place via .push()', 'Reading a Signal whose value changed, receiving new input(), or a host/DOM event', 'Calling console.log inside a template', 'Using setTimeout without signals'],
    },
    {
      kind: 'short',
      topic: 'Facade Pattern',
      marks: 3,
      prompt: 'Describe how a portal facade service isolates UI components from raw multi-service mutations while exposing readonly computed state.',
    },
    {
      kind: 'short',
      topic: 'Strict TypeScript',
      marks: 3,
      prompt: 'Explain the runtime bug prevented by enabling strictTemplates and noPropertyAccessFromIndexSignature in tsconfig.json.',
    },
  ],
  'sub-4': [
    {
      kind: 'mcq',
      topic: 'Kubernetes Autoscaling',
      marks: 2.5,
      prompt: 'What prerequisite must be configured on a Pod container spec before a HorizontalPodAutoscaler can scale on CPU utilization?',
      options: ['livenessProbe timeout', 'resources.requests.cpu', 'NodePort exposure', 'hostNetwork: true'],
    },
    {
      kind: 'mcq',
      topic: 'Probes',
      marks: 2.5,
      prompt: 'If a Kubernetes Pod fails its readinessProbe while its livenessProbe continues passing, what happens?',
      options: ['Kubernetes immediately terminates and restarts the Pod', 'The Pod IP is removed from Service endpoints until readiness passes again', 'The Deployment deletes its ReplicaSet', 'Secrets are unmounted'],
    },
    {
      kind: 'mcq',
      topic: 'Container Security',
      marks: 2.5,
      prompt: 'Which combination best minimizes post-exploitation blast radius inside a production container?',
      options: ['Running as UID 0 with SYS_ADMIN', 'Non-root USER, readOnlyRootFilesystem: true, and distroless runtime image', 'Mounting host /var/run/docker.sock', 'Single-stage build with build compilers retained'],
    },
    {
      kind: 'mcq',
      topic: 'Deployments',
      marks: 2.5,
      prompt: 'Which release strategy routes a progressive 5% -> 25% -> 100% traffic slice to a new revision while monitoring SLO error budgets?',
      options: ['Recreate Deployment', 'Canary Rollout', 'Manual SSH Pull', 'DNS Round-Robin Only'],
    },
    {
      kind: 'mcq',
      topic: 'Disaster Recovery',
      marks: 2.5,
      prompt: 'Recovery Point Objective (RPO) directly measures:',
      options: ['Maximum acceptable time to restore service after an outage', 'Maximum acceptable window of recent data loss measured backwards from failure', 'TLS certificate validity duration', 'Pod cold-start latency'],
    },
    {
      kind: 'mcq',
      topic: 'IAM',
      marks: 2.5,
      prompt: 'Under Least Privilege IAM design for a stateless backend service, roles should:',
      options: ['Grant roles/editor across the whole project', 'Scope permissions strictly to exact required collections, buckets, and verbs', 'Embed admin private keys inside frontend bundles', 'Disable audit logs'],
    },
    {
      kind: 'mcq',
      topic: 'CDN & Caching',
      marks: 2.5,
      prompt: 'What HTTP Cache-Control policy pairs safely with content-hashed JS bundles and index.html in an Angular SPA?',
      options: ['no-store on JS chunks and max-age=31536000 on index.html', 'public, max-age=31536000, immutable on hashed JS/CSS assets and no-cache on index.html', 'private on all static images', 'no-cache everywhere'],
    },
    {
      kind: 'mcq',
      topic: 'Observability',
      marks: 2.5,
      prompt: 'Which standard header propagates distributed trace context across HTTP microservices?',
      options: ['X-Powered-By', 'W3C traceparent', 'Accept-Charset', 'Pragma'],
    },
    {
      kind: 'short',
      topic: 'Multi-Stage Builds',
      marks: 2.5,
      prompt: 'Explain why separating build dependencies from the final runtime stage reduces both container image attack surface and pull latency.',
    },
    {
      kind: 'short',
      topic: 'Blameless Postmortems',
      marks: 2.5,
      prompt: 'List the essential sections of an actionable blameless postmortem following a production database outage.',
    },
  ],
};

const DEFAULT_EXAM_QUESTIONS: Omit<OnlineExamQuestion, 'id' | 'number'>[] = [
  {
    kind: 'mcq',
    topic: 'Core Architecture',
    marks: 2,
    prompt: 'Which property is essential when designing fault-tolerant, transaction-safe student portal workflows?',
    options: ['Atomic state transitions with idempotent submission keys', 'Storing passwords in plain text client cookies', 'Unbounded array polling in tight loops', 'Skipping server-side schema validation'],
  },
  {
    kind: 'mcq',
    topic: 'Security & Authorization',
    marks: 2,
    prompt: 'When enforcing strict access control on user-owned examination records in Firestore, rules must validate:',
    options: ['Client UI button disabled state only', 'Authenticated owner UID, verified email claim, allowed keys, and field size bounds', 'Collection length via wildcard reads', 'Timestamp formatting on the client only'],
  },
  {
    kind: 'mcq',
    topic: 'Complexity & Scalability',
    marks: 2,
    prompt: 'Why should interactive list queries enforce explicit indexing and owner predicates at the database rule level?',
    options: ['Prevents unauthorized collection scraping and eliminates O(n) latency spikes', 'Disables pagination', 'Allows unauthenticated public writes', 'Doubles payload sizes'],
  },
  {
    kind: 'mcq',
    topic: 'Data Integrity',
    marks: 2,
    prompt: 'What ensures that once an online assessment is marked Submitted, no subsequent client write can alter its recorded answers?',
    options: ['Checking existing resource status != Submitted inside Firestore update rules', 'Relying solely on localStorage', 'Hiding the Edit link in CSS', 'Using a non-unique random document ID'],
  },
  {
    kind: 'mcq',
    topic: 'Concurrency Control',
    marks: 2,
    prompt: 'How are race conditions avoided when two updates attempt to modify the same academic record concurrently?',
    options: ['Optimistic concurrency / version predicates or transactional updates', 'Ignoring error callbacks', 'Using synchronous alerts', 'Duplicating records on every save'],
  },
  {
    kind: 'mcq',
    topic: 'Error Handling',
    marks: 2,
    prompt: 'When a network write fails due to permission denial or offline status, resilient UI architecture should:',
    options: ['Fail silently with no user feedback', 'Surface an inline contextual diagnostic message and preserve draft safely', 'Clear the user form immediately', 'Infinite-loop retry without backoff'],
  },
  {
    kind: 'mcq',
    topic: 'Modular Engineering',
    marks: 2,
    prompt: 'Why should business domain calculations (such as SGPA/CGPA or fee balances) live inside pure typed helpers/facades?',
    options: ['Deterministic unit testing, single source of truth, and cleaner templates', 'Larger JavaScript bundles', 'Tighter DOM coupling', 'Avoiding TypeScript interfaces'],
  },
  {
    kind: 'mcq',
    topic: 'Proctoring Integrity',
    marks: 2,
    prompt: 'Which browser event signals that a candidate switched tabs or minimized the examination window?',
    options: ['visibilitychange / document.hidden and window blur', 'mousemove', 'scrollend', 'resize only'],
  },
  {
    kind: 'short',
    topic: 'System Trade-offs',
    marks: 2,
    prompt: 'Briefly explain one critical difference between online proctored assessment delivery and offline hall-based examination verification.',
  },
  {
    kind: 'short',
    topic: 'Audit & Verification',
    marks: 2,
    prompt: 'Describe how deterministic hall ticket serials and immutable submission timestamps strengthen academic auditability.',
  },
];

export function getOnlineExamQuestions(subjectId: string, examId: string): OnlineExamQuestion[] {
  const bank = SUBJECT_EXAM_BANK[subjectId] ?? DEFAULT_EXAM_QUESTIONS;
  return bank.map((q, idx) => ({
    ...q,
    id: `${examId}-eq${idx + 1}`,
    number: idx + 1,
  }));
}
