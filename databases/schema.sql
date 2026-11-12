-- EduERP Relational Database Schema (PostgreSQL / MySQL compatible)

-- 1. ACADEMIC YEARS TABLE
CREATE TABLE academic_years (
    id VARCHAR(36) PRIMARY KEY,
    year_code VARCHAR(20) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Upcoming', 'Completed')) DEFAULT 'Upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS TABLE
CREATE TABLE departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    hod_id VARCHAR(36),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. COURSES TABLE
CREATE TABLE courses (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    department_id VARCHAR(36) REFERENCES departments(id) ON DELETE CASCADE,
    level VARCHAR(10) CHECK (level IN ('UG', 'PG', 'Diploma')) NOT NULL,
    duration_years INT NOT NULL,
    total_semesters INT NOT NULL,
    intake_capacity INT NOT NULL DEFAULT 60,
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active'
);

-- 4. SEMESTERS TABLE
CREATE TABLE semesters (
    id VARCHAR(36) PRIMARY KEY,
    semester_number INT NOT NULL,
    course_id VARCHAR(36) REFERENCES courses(id) ON DELETE CASCADE,
    academic_year_id VARCHAR(36) REFERENCES academic_years(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Upcoming', 'Completed')) DEFAULT 'Upcoming'
);

-- 5. FACULTY TABLE
CREATE TABLE faculty (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    department_id VARCHAR(36) REFERENCES departments(id),
    designation VARCHAR(50) NOT NULL,
    qualification VARCHAR(100),
    experience_years INT DEFAULT 0,
    joining_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'On Leave', 'Resigned')) DEFAULT 'Active'
);

-- 6. STUDENTS TABLE
CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    enrollment_no VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    dob DATE NOT NULL,
    course_id VARCHAR(36) REFERENCES courses(id),
    semester_number INT NOT NULL DEFAULT 1,
    section_name VARCHAR(20),
    admission_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Passed Out')) DEFAULT 'Active'
);

-- 7. PARENTS TABLE
CREATE TABLE parents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    relation VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    occupation VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active'
);

-- 8. PARENT_STUDENT_LINK TABLE
CREATE TABLE parent_student_link (
    parent_id VARCHAR(36) REFERENCES parents(id) ON DELETE CASCADE,
    student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, student_id)
);

-- 9. USER ACCOUNTS TABLE
CREATE TABLE user_accounts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    profile_type VARCHAR(20) CHECK (profile_type IN ('Student', 'Faculty', 'Parent', 'Staff')),
    linked_profile_id VARCHAR(36),
    force_password_change BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Suspended')) DEFAULT 'Active',
    last_login TIMESTAMP
);

-- 10. ROLES & PERMISSIONS TABLE
CREATE TABLE role_permissions (
    role_id VARCHAR(50) NOT NULL,
    module_key VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (role_id, module_key)
);
