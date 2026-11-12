# EduERP Database Specifications & Schemas

This directory contains relational (PostgreSQL / MySQL) and NoSQL (Firebase Firestore) database definitions, seed data, and access control rules for the EduERP application.

## Files

- `schema.sql`: Relational DDL schema containing tables for Academic Operations, People Management, User Accounts, and Role Permissions.
- `seed.sql`: Realistic Indian EduERP seed data covering academic sessions, departments, courses, faculty, students, and system accounts.
- `firebase-blueprint.json`: Firestore document schema structure.
- `firestore.rules`: Security rules enforcing RBAC roles (`Super Admin`, `Admin`, `Faculty`, `Student`, `Parent`, `Accounts Officer`).

## Quick Setup (PostgreSQL)

```bash
psql -U postgres -d eduerp -f databases/schema.sql
psql -U postgres -d eduerp -f databases/seed.sql
```
