# EduERP Database Entity Relationship (ERD)

```text
[ departments ] <--- 1:N ---> [ courses ] <--- 1:N ---> [ semesters ]
       |                            |                         |
       | 1:N                        | 1:N                     | 1:N
       v                            v                         v
  [ faculty ]                 [ students ] <------------ [ subjects ]
       |                            ^                         |
       | 1:N                        | 1:N                     | 1:N
       v                            v                         v
 [ user_accounts ] <------ [ parent_student_link ] <-- [ subject_allocations ]
```

## Primary Key Conventions

All tables use `VARCHAR(36)` UUID strings for primary keys (e.g., `dept-1`, `stu-1`, `usr-1`).
