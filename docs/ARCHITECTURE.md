# EduERP System Architecture Overview

EduERP is designed as a enterprise-grade Higher Education Resource Planning (ERP) platform for academic institutions.

```text
                               +-----------------------------+
                               |     Browser Client (UI)     |
                               +--------------+--------------+
                                              |
                                              v
                               +--------------+--------------+
                               |  Nginx Reverse Proxy / SSL  |
                               +------+--------------+-------+
                                      |              |
                    +-----------------+              +-----------------+
                    |                                                  |
                    v                                                  v
    +---------------+---------------+                  +---------------+---------------+
    |  Angular 21 Frontend (SSR)    |                  |  Express REST API Backend     |
    |  Port: 3000                   |                  |  Port: 4000                   |
    +---------------+---------------+                  +---------------+---------------+
                    |                                                  |
                    v                                                  v
    +---------------+---------------+                  +---------------+---------------+
    |  In-Memory Signals / Cache    |                  | PostgreSQL / Firestore DB     |
    +-------------------------------+                  +-------------------------------+
```

## Layer Responsibilities

1. **Presentation Layer (Frontend)**: Angular 21, Tailwind CSS v4, Signals state management.
2. **API & Service Layer (Backend)**: Node.js Express server, JWT authentication, RBAC authorization.
3. **Data Layer**: Relational PostgreSQL DB or Firestore NoSQL.
