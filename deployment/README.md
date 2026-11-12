# EduERP Deployment Instructions

This directory contains containerization scripts, Docker configuration, Nginx setup, and deployment guides.

## Docker Compose Setup

Run the full stack (Frontend + Express Backend + PostgreSQL Database) with Docker Compose:

```bash
docker-compose -f deployment/docker-compose.yml up --build -d
```

- Frontend UI: `http://localhost:3000`
- REST API: `http://localhost:4000/api`
- PostgreSQL: `localhost:5432`
