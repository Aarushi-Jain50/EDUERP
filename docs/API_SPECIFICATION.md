# EduERP RESTful API Specification

Base URL: `/api/v1`

## 1. Academic Operations API

### `GET /academic/academic-years`
Returns all academic years and sessions.

### `GET /academic/departments`
Returns departments with HOD and student counts.

### `GET /academic/courses`
Returns UG/PG degree programs.

---

## 2. People Management API

### `GET /people/students`
Returns student profiles.

### `GET /people/faculty`
Returns faculty directory and designations.

### `GET /people/parents`
Returns parent profiles linked to students.

---

## 3. User Accounts & RBAC API

### `GET /auth/users`
Returns system accounts and roles.

### `GET /auth/roles`
Returns system and custom roles permissions matrix.
