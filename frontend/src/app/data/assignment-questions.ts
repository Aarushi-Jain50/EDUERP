export interface AssignmentQuestion {
  id: string;
  number: number;
  prompt: string;
  topic: string;
  hint: string;
}

interface QuestionTemplate {
  topic: string;
  prompt: string;
  hint: string;
}

const SUBJECT_QUESTION_BANK: Record<string, QuestionTemplate[]> = {
  'sub-1': [
    { topic: 'Asymptotic Analysis', prompt: 'Compare Big-O, Omega, and Theta tight bounds for nested triangular loops.', hint: 'Sum i from 1 to n gives n(n+1)/2.' },
    { topic: 'AVL Rotations', prompt: 'Trace insertion of keys [30, 20, 40, 10, 25, 5] into an empty AVL tree and name each rotation.', hint: 'Identify the deepest unbalanced ancestor after insertion.' },
    { topic: 'Balance Factor', prompt: 'Prove why rebalancing an AVL deletion may require O(log n) rotations up to the root.', hint: 'Decreasing subtree height can unbalance ancestor nodes.' },
    { topic: 'Red-Black Trees', prompt: 'Contrast height guarantees and color invariants between Red-Black trees and AVL trees.', hint: 'Max height is 2*log2(n+1) vs 1.44*log2(n+2).' },
    { topic: 'B-Trees', prompt: 'Calculate minimum and maximum keys in a B-Tree node of minimum degree t = 4.', hint: 'Non-root nodes hold between t-1 and 2t-1 keys.' },
    { topic: 'Heaps', prompt: 'Prove why bottom-up buildMaxHeap runs in O(n) rather than O(n log n) time.', hint: 'Sum height * nodes_at_height using geometric series.' },
    { topic: 'Priority Queues', prompt: 'Design a median-maintenance data structure supporting O(log n) insert and O(1) median query.', hint: 'Combine a max-heap for lower half and min-heap for upper half.' },
    { topic: 'Disjoint Set Union', prompt: 'Explain how union by rank with path compression achieves inverse Ackermann amortized time.', hint: 'Path compression flattens parent pointers on find().' },
    { topic: 'Tries', prompt: 'Compare compressed radix tries against standard 26-way tries for autocomplete dictionaries.', hint: 'Consider edge label merging on single-child chains.' },
    { topic: 'Segment Trees', prompt: 'Implement lazy propagation logic for range-add update and range-sum query in O(log n).', hint: 'Push pending lazy values to children before descending.' },
    { topic: 'Fenwick Trees', prompt: 'Explain the bit manipulation expression (i & -i) used in Binary Indexed Tree updates.', hint: 'Isolates the least significant set bit.' },
    { topic: 'Hashing', prompt: 'Contrast open addressing (Robin Hood hashing) with separate chaining under high load factors.', hint: 'Analyze probe variance and cache locality.' },
    { topic: 'Graph Representation', prompt: 'Compare adjacency list vs adjacency matrix memory and edge-lookup complexity for sparse graphs.', hint: 'O(V + E) vs O(V^2) space.' },
    { topic: 'Topological Sort', prompt: 'Apply Kahn’s BFS algorithm to detect cycles in a Directed Acyclic Graph (DAG).', hint: 'Check whether visited count equals V at termination.' },
    { topic: 'Shortest Paths', prompt: 'Explain why Dijkstra’s greedy relaxation fails in graphs containing negative edge weights.', hint: 'A finalized node may later get a shorter path through a negative edge.' },
    { topic: 'Bellman-Ford', prompt: 'Describe how running a V-th relaxation pass detects negative-weight cycles reachable from source.', hint: 'At most V-1 edges exist in any simple shortest path.' },
    { topic: 'MST', prompt: 'Verify the cut property that justifies both Prim’s and Kruskal’s minimum spanning tree algorithms.', hint: 'The lightest edge crossing any cut belongs to some MST.' },
    { topic: 'Strongly Connected Components', prompt: 'Trace Kosaraju’s two-pass DFS algorithm using finishing times and transpose graphs.', hint: 'Second pass processes vertices in decreasing finish order.' },
    { topic: 'Dynamic Programming', prompt: 'Formulate state transitions and base cases for Longest Common Subsequence with O(min(m,n)) space.', hint: 'Keep only current and previous DP rows.' },
    { topic: 'Knapsack', prompt: 'Differentiate 0/1 Knapsack from Unbounded Knapsack traversal direction when using a 1D DP array.', hint: 'Iterate capacity backward for 0/1 and forward for unbounded.' },
    { topic: 'Divide & Conquer', prompt: 'Solve T(n) = 4T(n/2) + n^2 log n using Master Theorem or recursion tree.', hint: 'Examine work per level: sum (log(n/2^k)) across log n levels.' },
    { topic: 'String Matching', prompt: 'Construct the KMP LPS (prefix function) array for pattern "ABABCABAB" and analyze matching steps.', hint: 'LPS[i] stores length of longest proper prefix that is also suffix.' },
    { topic: 'Backtracking', prompt: 'Design pruning conditions for N-Queens using bitmasks for columns and both diagonals.', hint: 'Use bitwise OR and shift left/right per row.' },
    { topic: 'Network Flow', prompt: 'Explain max-flow min-cut theorem and residual backward edges in Edmonds-Karp.', hint: 'Backward edges allow pushing flow back to augment alternative paths.' },
    { topic: 'NP-Completeness', prompt: 'Outline polynomial-time reduction steps showing 3-SAT reduces to Clique or Vertex Cover.', hint: 'Encode each clause literal cleanly without intra-clause edges.' },
  ],
  'sub-2': [
    { topic: 'Standalone Components', prompt: 'Explain how Angular standalone components simplify dependency graphs compared to legacy NgModules.', hint: 'Direct imports array enables finer tree-shaking.' },
    { topic: 'Zoneless Change Detection', prompt: 'Describe how Angular signals drive UI updates cleanly without zone.js monkey-patching.', hint: 'Reactive signal notifications schedule targeted view checks.' },
    { topic: 'Signals vs RxJS', prompt: 'Contrast synchronous state derivation with computed() against asynchronous streams in RxJS.', hint: 'Signals represent always-defined values; Observables represent event streams.' },
    { topic: 'OnPush Strategy', prompt: 'List the exact triggers that mark an OnPush component dirty for re-rendering.', hint: 'Signal reads, input changes, host/template events, and async pipe.' },
    { topic: 'Effects Hygiene', prompt: 'Explain common pitfalls when writing to signals inside an effect() and how to prevent infinite loops.', hint: 'Prefer computed() for derived state; keep effects side-effect focused.' },
    { topic: 'Router Lazy Loading', prompt: 'Configure loadComponent and loadChildren route chunks to optimize First Contentful Paint.', hint: 'Verify chunk splitting in production bundle output.' },
    { topic: 'Route Guards', prompt: 'Write a functional CanActivateFn guard that checks role claims before entering protected layouts.', hint: 'Return UrlTree for clean declarative redirects.' },
    { topic: 'HTTP Interceptors', prompt: 'Design a functional HttpInterceptorFn to attach Bearer tokens and handle 401 refresh gracefully.', hint: 'Use catchError and shareReplay for concurrent requests.' },
    { topic: 'Reactive Forms', prompt: 'Contrast FormGroup with FormArray and implement a cross-field password confirmation validator.', hint: 'Return ValidationErrors | null from a parent ValidatorFn.' },
    { topic: 'SSR Hydration', prompt: 'Explain Angular Server-Side Rendering hydration mismatches and why typeof window guards matter.', hint: 'Use isPlatformBrowser(PLATFORM_ID) before touching localStorage.' },
    { topic: 'Template Control Flow', prompt: 'Compare track expression choice in @for blocks when mutating items in large lists.', hint: 'Tracking by unique ID preserves DOM state and avoids full re-creation.' },
    { topic: 'Deferrable Views', prompt: 'Apply @defer (on viewport) with @placeholder and @loading blocks for heavy dashboards.', hint: 'Reduces initial JS payload for below-the-fold widgets.' },
    { topic: 'Content Projection', prompt: 'Use multi-slot ng-content selectors to create reusable modal shells and toolbar headers.', hint: 'Select slots cleanly via attributes or CSS classes.' },
    { topic: 'Dependency Injection', prompt: 'Explain inject() execution context rules and hierarchical injector resolution with InjectionToken.', hint: 'inject() must run during construction or field initialization.' },
    { topic: 'Accessibility (a11y)', prompt: 'Implement ARIA dialog semantics, keyboard Escape close, and explicit label associations in modals.', hint: 'Pair role="dialog" aria-modal="true" and button backdrops.' },
    { topic: 'XSS Prevention', prompt: 'Describe how Angular DomSanitizer contexts protect against HTML, style, and URL injection.', hint: 'Avoid bypassSecurityTrustHtml on untrusted user data.' },
    { topic: 'State Architecture', prompt: 'Structure a Feature Facade service exposing readonly computed views while hiding internal mutations.', hint: 'Expose .asReadonly() signals instead of raw setters.' },
    { topic: 'Bundle Budgets', prompt: 'Analyze how vendor barrel imports inflate bundle size and configure angular.json size budgets.', hint: 'Import specific entrypoints cleanly.' },
    { topic: 'Web Vitals', prompt: 'Identify strategies to minimize Cumulative Layout Shift (CLS) in responsive Angular data tables.', hint: 'Reserve container heights and avoid late-loading unstyled flashes.' },
    { topic: 'Micro-Frontends', prompt: 'Evaluate Module Federation trade-offs vs monorepo libraries for multi-team university portals.', hint: 'Consider shared Angular version pinning and deployment cadence.' },
    { topic: 'Service Workers', prompt: 'Compare Stale-While-Revalidate vs Network-First caching strategies for ERP announcements.', hint: 'API transactional mutations should never serve stale reads.' },
    { topic: 'Unit Testing', prompt: 'Test signal-driven components cleanly with TestBed and signal input setters.', hint: 'Call fixture.componentRef.setInput(...) instead of mutating props directly.' },
    { topic: 'Design Tokens', prompt: 'Organize Tailwind v4 @theme typography, spacing, and color tokens for institutional branding.', hint: 'Maintain consistent WCAG AA contrast ratios.' },
    { topic: 'Type Safety', prompt: 'Explain benefits of strictTemplates and noPropertyAccessFromIndexSignature in tsconfig.json.', hint: 'Catches mistyped template bindings at compile time.' },
    { topic: 'Observability', prompt: 'Implement a global ErrorHandler that ships structured stack context without crashing UI responsiveness.', hint: 'Capture route, timestamp, and safe sanitized error message.' },
  ],
  'sub-3': [
    { topic: 'REST Resource Modeling', prompt: 'Design idempotent REST endpoints for student course registration and enrollment withdrawal.', hint: 'Use PUT/DELETE cleanly and map conflict states to 409.' },
    { topic: 'Express Middleware', prompt: 'Trace request lifecycle through logging, CORS, JSON parsing, auth validation, and error middleware.', hint: '4-argument (err, req, res, next) must be registered last.' },
    { topic: 'Validation Schemas', prompt: 'Enforce strict runtime payload validation on Express routes before database writes occur.', hint: 'Reject unexpected properties and malformed types with HTTP 400.' },
    { topic: 'ACID Transactions', prompt: 'Demonstrate BEGIN/COMMIT/ROLLBACK transaction handling during multi-step fee receipt creation.', hint: 'Ensure partial failures roll back ledger updates atomically.' },
    { topic: 'Connection Pooling', prompt: 'Tune PostgreSQL connection pool max/idle timeouts to prevent connection exhaustion under spikes.', hint: 'Avoid creating new clients inside per-request handlers.' },
    { topic: 'Parameterized Queries', prompt: 'Illustrate how parameterized SQL ($1, $2) eliminates first-order SQL injection vectors.', hint: 'Never concatenate user input strings into SQL text.' },
    { topic: 'Pagination Design', prompt: 'Compare cursor-based pagination against OFFSET/LIMIT for large academic attendance logs.', hint: 'Cursor pagination avoids deep-offset full scans.' },
    { topic: 'CORS & Cookies', prompt: 'Configure credentials, SameSite, Secure, and HttpOnly flags for cross-subdomain session cookies.', hint: 'SameSite=None requires Secure=true over HTTPS.' },
    { topic: 'JWT Security', prompt: 'Analyze short-lived access tokens + rotating refresh tokens against revocation requirements.', hint: 'Store refresh token hashes cleanly with expiry checks.' },
    { topic: 'File Uploads', prompt: 'Validate multipart MIME headers, extension allowlists, and max byte caps on assignment uploads.', hint: 'Do not rely solely on client-supplied filename extensions.' },
    { topic: 'Rate Limiting', prompt: 'Implement sliding-window rate limiting on login and OTP verification endpoints.', hint: 'Return Retry-After headers alongside 429 responses.' },
    { topic: 'Error Envelope', prompt: 'Standardize JSON error payloads across validation, auth failure, and unhandled server exceptions.', hint: 'Never leak raw SQL stack traces to production clients.' },
    { topic: 'Optimistic Concurrency', prompt: 'Prevent lost updates when two admins edit the same fee structure using version numbers.', hint: 'Include WHERE version = $expected in UPDATE statements.' },
    { topic: 'N+1 Query Elimination', prompt: 'Rewrite nested per-student queries into batched joins or IN-clause lookups.', hint: 'Check query counts in request profiling logs.' },
    { topic: 'SSE vs WebSockets', prompt: 'Compare Server-Sent Events vs WebSockets for live notice broadcasts and exam timers.', hint: 'SSE works well over standard HTTP/1.1 & HTTP/2 one-way streams.' },
    { topic: 'Health Checks', prompt: 'Differentiate shallow /healthz liveness checks from /readyz database readiness probes.', hint: 'Ready probes execute lightweight SELECT 1 checks with short timeouts.' },
    { topic: 'Structured Logging', prompt: 'Include correlation request IDs across API logs to trace end-to-end transaction latency.', hint: 'Log structured JSON without PII/credentials.' },
    { topic: 'Caching Layer', prompt: 'Design cache invalidation hooks when exam schedules or timetable slots are updated.', hint: 'Prefer explicit key busting + short TTL fallbacks.' },
    { topic: 'Angular HttpClient', prompt: 'Configure retry(1) with exponential backoff cleanly for idempotent GET requests only.', hint: 'Never auto-retry non-idempotent POST payment submissions.' },
    { topic: 'CSRF Defenses', prompt: 'Explain why double-submit CSRF tokens or custom headers protect cookie-authenticated endpoints.', hint: 'Simple HTML forms cannot attach custom JSON Content-Type headers.' },
    { topic: 'Database Indexing', prompt: 'Choose composite index column ordering for queries filtering by (courseId, semester, date).', hint: 'Lead with high-selectivity equality predicates before range columns.' },
    { topic: 'Graceful Shutdown', prompt: 'Handle SIGTERM in Node/Express so active HTTP requests finish before closing DB pools.', hint: 'Call server.close() then pool.end().' },
    { topic: 'Integration Testing', prompt: 'Write supertest integration cases covering both valid workflows and 401/403/400 rejection paths.', hint: 'Isolate test DB state per suite.' },
    { topic: 'Environment Config', prompt: 'Validate required environment variables on server startup so misconfigured deploys fail fast.', hint: 'Separate .env.example template cleanly from runtime secrets.' },
    { topic: 'API Versioning', prompt: 'Plan backward-compatible response evolution under /api/v1 vs introducing /api/v2 endpoints.', hint: 'Additive optional fields stay backward-compatible.' },
  ],
  'sub-4': [
    { topic: 'Docker Multi-Stage', prompt: 'Write a minimal multi-stage Dockerfile separating Angular build tools from runtime Node image.', hint: 'Copy only dist/ artifacts and production dependencies.' },
    { topic: 'Kubernetes Pods', prompt: 'Explain Pod lifecycle phases, init containers, and restartPolicy behaviors.', hint: 'Containers inside a Pod share network namespace and localhost.' },
    { topic: 'HPA Autoscaling', prompt: 'Analyze HorizontalPodAutoscaler CPU/memory utilization calculation and scale-down stabilization.', hint: 'Requires requests set on container resources.' },
    { topic: 'Probes', prompt: 'Contrast startupProbe, readinessProbe, and livenessProbe failure behaviors in Kubernetes.', hint: 'Readiness removes endpoints from Service; liveness restarts container.' },
    { topic: 'K8s Services', prompt: 'Differentiate ClusterIP, NodePort, LoadBalancer, and Ingress routing in production clusters.', hint: 'Ingress handles L7 HTTP path/host routing.' },
    { topic: 'ConfigMaps & Secrets', prompt: 'Compare mounting Secrets as volumes vs environment variables and base64 encoding limitations.', hint: 'Enable KMS encryption at rest in etcd.' },
    { topic: 'CI/CD Pipelines', prompt: 'Design a build-lint-test-scan-deploy pipeline blocking merges on security/test failures.', hint: 'Cache node dependencies by lockfile hash.' },
    { topic: 'Blue-Green vs Canary', prompt: 'Compare rollback speed and blast radius between Blue-Green and Canary deployments.', hint: 'Canary shifts progressive percentage traffic with metric gates.' },
    { topic: 'Terraform State', prompt: 'Explain remote state locking (GCS/S3) to prevent concurrent infrastructure corruption.', hint: 'Never commit terraform.tfstate with secret outputs to Git.' },
    { topic: 'IAM Least Privilege', prompt: 'Audit a cloud service account JSON policy to eliminate wildcard (*) permissions.', hint: 'Scope resources and actions strictly to needed buckets/DBs.' },
    { topic: 'VPC Networking', prompt: 'Design public ALB subnets paired with private application and isolated database subnets.', hint: 'Keep DB subnets free of direct internet gateway routes.' },
    { topic: 'Container Security', prompt: 'Explain benefits of non-root USER directives, readOnlyRootFilesystem, and distroless images.', hint: 'Minimizes shell binaries available after container escape attempts.' },
    { topic: 'SBOM & Scanning', prompt: 'Integrate container image CVE scanning before pushing tags to production Artifact Registry.', hint: 'Pin base image digests for reproducibility.' },
    { topic: 'Observability Pillars', prompt: 'Correlate Metrics (Prometheus), Logs (JSON), and Distributed Traces (OpenTelemetry) on high latency.', hint: 'Propagate W3C traceparent headers.' },
    { topic: 'SLIs & SLOs', prompt: 'Define realistic availability SLOs and error budgets for a university exam portal.', hint: '99.9% permits ~43 minutes of monthly downtime.' },
    { topic: 'Serverless Cold Starts', prompt: 'Evaluate Cloud Run min-instances vs concurrency settings for bursty traffic workloads.', hint: 'Set min-instances >= 1 for latency-sensitive endpoints.' },
    { topic: 'Load Balancing', prompt: 'Compare round-robin, least-connections, and consistent hashing algorithms across stateful nodes.', hint: 'Avoid sticky sessions by externalizing session state.' },
    { topic: 'Disaster Recovery', prompt: 'Contrast RPO and RTO targets when designing cross-region automated PostgreSQL snapshots.', hint: 'Test backup restoration periodically, not just snapshot creation.' },
    { topic: 'GitOps', prompt: 'Describe declarative reconciliation loops in ArgoCD compared to push-based deploy scripts.', hint: 'Git repo stays single source of truth for cluster manifests.' },
    { topic: 'Secrets Rotation', prompt: 'Automate zero-downtime rotation of database credentials using dual active secrets.', hint: 'Overlap validity window during rollout.' },
    { topic: 'CDN Caching', prompt: 'Configure Cache-Control immutable headers for hashed assets alongside no-store for HTML shells.', hint: 'Prevents stale index.html pointing to deleted chunk hashes.' },
    { topic: 'Chaos Engineering', prompt: 'Design a safe fault-injection experiment verifying graceful degradation when cache nodes restart.', hint: 'Start with bounded blast radius and clear abort conditions.' },
    { topic: 'FinOps', prompt: 'Identify cloud cost optimizations using spot instances, storage lifecycle policies, and right-sizing.', hint: 'Review idle non-prod environments overnight.' },
    { topic: 'DNS Failover', prompt: 'Configure health-checked DNS TTLs and multi-region load balancer routing policies.', hint: 'Lower TTLs ahead of planned migrations.' },
    { topic: 'Incident Postmortems', prompt: 'Structure a blameless postmortem capturing timeline, root cause, and preventative action items.', hint: 'Focus on systemic gaps rather than human blame.' },
  ],
};

const GENERIC_QUESTION_BANK: QuestionTemplate[] = [
  { topic: 'Core Principles', prompt: 'Define the foundational theoretical principles covered in Unit 1 of this course.', hint: 'Support your explanation with formal terminology.' },
  { topic: 'Problem Formulation', prompt: 'Translate a real campus or industry workflow into a formal technical specification.', hint: 'Clarify inputs, constraints, and expected outputs.' },
  { topic: 'Complexity & Cost', prompt: 'Analyze time, space, or operational complexity of the primary algorithm/architecture in Unit 2.', hint: 'Discuss best, average, and worst-case trade-offs.' },
  { topic: 'Edge Cases', prompt: 'Identify 4 critical boundary or failure conditions and specify clean handling logic.', hint: 'Include empty states, overflow, concurrency, and invalid input.' },
  { topic: 'Comparative Design', prompt: 'Compare two competing design patterns taught in class using concrete evaluation criteria.', hint: 'Contrast maintainability, throughput, and learning curve.' },
  { topic: 'Step-by-Step Trace', prompt: 'Walk through a worked numerical or execution trace of the core mechanism step by step.', hint: 'Show intermediate states clearly.' },
  { topic: 'Invariant Proof', prompt: 'State and justify the key structural invariant that must hold across all operations.', hint: 'Explain preservation before and after mutation.' },
  { topic: 'Data Modeling', prompt: 'Sketch the schema, entity relationships, or class hierarchy for the lab module.', hint: 'Highlight primary identifiers and cardinality constraints.' },
  { topic: 'Optimization Strategy', prompt: 'Propose two optimizations to reduce latency or resource footprint in a baseline implementation.', hint: 'Quantify expected improvement.' },
  { topic: 'Security & Integrity', prompt: 'Examine authentication, authorization, or data integrity risks specific to this subject.', hint: 'Propose layered preventative controls.' },
  { topic: 'Concurrency Issues', prompt: 'Explain race conditions or synchronization hazards that arise under concurrent execution.', hint: 'Show how locking, isolation, or immutable updates solve them.' },
  { topic: 'Failure Recovery', prompt: 'Detail recovery procedures if a process crashes mid-operation during this workflow.', hint: 'Address atomicity, idempotency, or rollback logs.' },
  { topic: 'Modularity & Reuse', prompt: 'Explain how separation of concerns improves testability within this assignment module.', hint: 'Separate pure domain logic from I/O interfaces.' },
  { topic: 'Quantitative Calculation', prompt: 'Compute exact throughput, memory utilization, or schedule timing from realistic parameters.', hint: 'Show formulas and unit conversions explicitly.' },
  { topic: 'Testing Strategy', prompt: 'List 5 unit/integration test scenarios verifying positive and negative specifications.', hint: 'Verify boundary conditions alongside happy paths.' },
  { topic: 'Protocol / Interface Contract', prompt: 'Document the contract guarantees (preconditions, postconditions, error codes) for the main API.', hint: 'Ensure unambiguous caller expectations.' },
  { topic: 'Scalability Bottlenecks', prompt: 'Identify the first bottleneck that appears when workload scales 100x and how to mitigate it.', hint: 'Consider CPU, lock contention, I/O, or network bandwidth.' },
  { topic: 'Standard Compliance', prompt: 'Explain how industry standards or formal specifications govern implementations in this domain.', hint: 'Reference RFCs, ISO, IEEE, or ANSI conventions where applicable.' },
  { topic: 'Debugging Approach', prompt: 'Outline a systematic diagnostic plan to isolate a subtle intermittent bug in this system.', hint: 'Combine logging, reproduction isolation, and state inspection.' },
  { topic: 'Memory & Resource Lifecycle', prompt: 'Trace allocation, ownership, and cleanup of long-lived resources in this topic.', hint: 'Prevent memory leaks, dangling handles, or unclosed streams.' },
  { topic: 'Trade-off Analysis', prompt: 'Discuss when a simpler solution outperforms an advanced enterprise architecture.', hint: 'Factor operational overhead against scale requirements.' },
  { topic: 'Monitoring & Telemetry', prompt: 'Define 3 meaningful operational metrics to track health of a production deployment.', hint: 'Include latency percentiles, error rate, and saturation.' },
  { topic: 'Refactoring Critique', prompt: 'Critique common anti-patterns found in student submissions for this lab and show fixes.', hint: 'Explain why each anti-pattern introduces defects.' },
  { topic: 'Real-World Case Study', prompt: 'Summarize how an industry engineering team applies this concept at production scale.', hint: 'Focus on architectural constraints and lessons learned.' },
  { topic: 'Reflection & Synthesis', prompt: 'Synthesize how this assignment connects theoretical lectures with hands-on software engineering.', hint: 'Highlight key takeaways verified in your solution.' },
];

const SUBJECT_CUSTOM_BANK: Record<string, { topics: string[]; prefix: string }> = {
  'sub-5': { prefix: 'Discrete Mathematics', topics: ['Propositional Logic', 'Predicate Quantifiers', 'Set Identities', 'Functions & Bijections', 'Equivalence Relations', 'Partial Orders & Hasse Diagrams', 'Mathematical Induction', 'Strong Induction', 'Pigeonhole Principle', 'Permutations & Combinations', 'Binomial Theorem', 'Inclusion-Exclusion', 'Linear Recurrence Relations', 'Generating Functions', 'Graph Degree Sum Theorem', 'Eulerian Circuits', 'Hamiltonian Paths', 'Planar Graphs & Euler Formula', 'Bipartite Characterization', 'Graph Coloring & Chromatic Number', 'Spanning Trees', 'Modular Arithmetic', 'Fermat Little Theorem', 'Boolean Algebra', 'Finite State Automata'] },
  'sub-6': { prefix: 'Java Programming', topics: ['JVM Architecture', 'Immutable Strings', 'OOP Inheritance vs Composition', 'Abstract Classes vs Interfaces', 'Exception Hierarchy', 'Generics & Wildcards', 'ArrayList vs LinkedList', 'HashMap Internals & Equals/HashCode', 'TreeMap & Comparator', 'Functional Interfaces', 'Lambda Expressions', 'Java Streams API', 'Optional Null-Safety', 'NIO File I/O', 'Synchronized Monitors', 'ReentrantLock & Condition', 'ExecutorService Thread Pools', 'CompletableFuture', 'ConcurrentHashMap', 'Garbage Collection Basics', 'JDBC PreparedStatement', 'Serialization Risks', 'Records & Sealed Classes', 'JUnit 5 Assertions', 'Clean Exception Logging'] },
  'sub-7': { prefix: 'C++ OOP & Systems Design', topics: ['RAII Pattern', 'Rule of Five', 'unique_ptr Ownership', 'shared_ptr & weak_ptr Cycles', 'Virtual Vtable Dispatch', 'Pure Virtual Interfaces', 'Move Semantics & Rvalue Refs', 'Copy Elision (RVO)', 'const Correctness', 'Template Specialization', 'Concepts & Constraints', 'STL Vector Capacity Growth', 'Unordered Map Bucket Collisions', 'Iterators Invalidation Rules', 'Operator Overloading', 'Exception Safety Guarantees', 'SOLID Single Responsibility', 'Open-Closed Principle', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion', 'Factory & Strategy Patterns', 'Observer Lifetimes', 'std::mutex & lock_guard', 'AddressSanitizer & Valgrind'] },
  'sub-8': { prefix: 'AI & Machine Learning', topics: ['Uninformed vs A* Search', 'Heuristic Admissibility', 'Minimax & Alpha-Beta Pruning', 'Bayes Theorem Classifier', 'Laplace Smoothing', 'Linear Regression & MSE', 'Gradient Descent Convergence', 'Feature Scaling', 'Logistic Regression & Sigmoid', 'Decision Tree Entropy & Gini', 'Overfitting vs Underfitting', 'Bias-Variance Tradeoff', 'Random Forest Bagging', 'Gradient Boosting Intuition', 'SVM Margin & Kernels', 'K-Means Clustering', 'PCA Dimensionality Reduction', 'Cross-Validation Folds', 'Precision, Recall & F1', 'ROC-AUC Interpretation', 'Perceptron Convergence', 'Backpropagation Chain Rule', 'Activation Functions (ReLU vs GELU)', 'Regularization (L1 vs L2)', 'AI Ethics & Dataset Bias'] },
  'sub-9': { prefix: 'Cyber Security & Ethics', topics: ['CIA Triad', 'Threat Modeling (STRIDE)', 'Symmetric AES Modes (GCM vs ECB)', 'Asymmetric RSA & ECC', 'Diffie-Hellman Key Exchange', 'Cryptographic Hashing (SHA-256)', 'Salted Password Hashing (Argon2)', 'TLS 1.3 Handshake', 'PKI & Certificate Authorities', 'OWASP Broken Access Control', 'Cross-Site Scripting (XSS)', 'CSRF Countermeasures', 'SQL Injection Prevention', 'Firestore Rule AuthZ Isolation', 'Principle of Least Privilege', 'Zero Trust Architecture', 'RBAC vs ABAC Models', 'Multi-Factor Authentication', 'Audit Trail Tamper Resistance', 'Vulnerability Disclosure', 'GDPR & PII Minimization', 'Incident Containment', 'Phishing & Social Engineering', 'Supply Chain Dependency Audits', 'Responsible AI & Computing Ethics'] },
  'sub-10': { prefix: 'DBMS', topics: ['ER Diagram Modeling', 'Weak Entity Sets', 'Relational Algebra', 'Primary & Candidate Keys', 'Referential Integrity', '1NF, 2NF, 3NF Decomposition', 'Boyce-Codd Normal Form (BCNF)', 'Lossless Join Property', 'Dependency Preservation', 'SQL GROUP BY & HAVING', 'Correlated Subqueries', 'INNER vs OUTER JOINs', 'Window Functions (RANK, ROW_NUMBER)', 'B+ Tree Indexing', 'Covering Indexes', 'Query Execution Plans (EXPLAIN)', 'ACID Isolation Levels', 'Phantom Read Anomaly', 'Two-Phase Locking (2PL)', 'Deadlock Detection Wait-For Graph', 'MVCC Snapshots', 'Write-Ahead Logging (WAL)', 'CHECKPOINT Recovery', 'CAP Theorem Trade-offs', 'Denormalization for Read Workloads'] },
  'sub-11': { prefix: 'Operating Systems', topics: ['User vs Kernel Mode Transitions', 'System Call Dispatch', 'Process Control Block (PCB)', 'Threads vs Processes', 'Context Switch Overhead', 'CPU Scheduling (FCFS, SJF, RR)', 'Multilevel Feedback Queue', 'Priority Inversion Mitigation', 'Peterson Solution', 'Semaphores & Mutexes', 'Producer-Consumer Bounded Buffer', 'Readers-Writers Synchronization', 'Coffman Deadlock Conditions', 'Banker Safety Algorithm', 'Logical vs Physical Addressing', 'Multi-Level Page Tables', 'Translation Lookaside Buffer (TLB)', 'Page Fault Handling', 'FIFO vs LRU vs Optimal Replacement', 'Belady Anomaly', 'Thrashing & Working Set Model', 'UNIX Inode Structure', 'Disk Scheduling Algorithms', 'Copy-on-Write (fork)', 'Virtualization & Containers'] },
  'sub-12': { prefix: 'Computer Networks', topics: ['OSI vs TCP/IP Layers', 'Circuit vs Packet Switching', 'Delay Components (Tx, Prop, Queue)', 'CSMA/CD vs CSMA/CA', 'ARP Address Resolution', 'IPv4 CIDR & VLSM Subnetting', 'Longest Prefix Matching', 'NAT Traversal & Port Mapping', 'ICMP Ping & Traceroute', 'Distance Vector vs Link State Routing', 'OSPF vs BGP Scope', 'UDP vs TCP Guarantees', 'TCP 3-Way Handshake & SYN Floods', 'TCP Sliding Window Flow Control', 'TCP Congestion Control (AIMD)', 'Fast Retransmit & Fast Recovery', 'DNS Recursive Resolution', 'HTTP/1.1 vs HTTP/2 vs HTTP/3', 'TLS Encryption Layer', 'DHCP DORA Sequence', 'Software Defined Networking (SDN)', 'QoS DiffServ Queuing', 'VLAN Tagging (802.1Q)', 'Packet Loss & Jitter Analysis', 'Wireshark Capture Diagnostics'] },
};

export function getQuestionsForSubject(subjectId: string, assignmentId: string): AssignmentQuestion[] {
  const exactBank = SUBJECT_QUESTION_BANK[subjectId];
  if (exactBank && exactBank.length >= 25) {
    return exactBank.slice(0, 25).map((item, idx) => ({
      id: `${assignmentId}-q${idx + 1}`,
      number: idx + 1,
      topic: item.topic,
      prompt: item.prompt,
      hint: item.hint,
    }));
  }

  const custom = SUBJECT_CUSTOM_BANK[subjectId];
  if (custom) {
    return custom.topics.slice(0, 25).map((topic, idx) => {
      const base = GENERIC_QUESTION_BANK[idx % GENERIC_QUESTION_BANK.length];
      return {
        id: `${assignmentId}-q${idx + 1}`,
        number: idx + 1,
        topic,
        prompt: `[${custom.prefix} · ${topic}] ${base.prompt}`,
        hint: base.hint,
      };
    });
  }

  return GENERIC_QUESTION_BANK.slice(0, 25).map((item, idx) => ({
    id: `${assignmentId}-q${idx + 1}`,
    number: idx + 1,
    topic: item.topic,
    prompt: item.prompt,
    hint: item.hint,
  }));
}
