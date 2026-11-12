# EduERP Backend Service

Node.js / Express RESTful API backend service providing modular endpoints for Academic Operations, People Management, User Accounts, and Role-Based Access Control (RBAC).

## Architecture & Routes

- `/api/v1/academic`: Academic Years, Departments, Courses, Semesters, Subjects, Subject Allocation
- `/api/v1/people`: Students, Admissions, Faculty, Parents
- `/api/v1/auth`: User Accounts, Credentials, Roles & Permissions Matrix
- `/api/health`: Healthcheck endpoint

## Running locally

```bash
cd backend
npm install
npm run dev
```
