-- EduERP Initial Seed Data

INSERT INTO academic_years (id, year_code, start_date, end_date, status) VALUES
('ay-2025', '2025-26', '2025-07-01', '2026-05-31', 'Active'),
('ay-2026', '2026-27', '2026-07-01', '2027-05-31', 'Upcoming'),
('ay-2024', '2024-25', '2024-07-01', '2025-05-31', 'Completed');

INSERT INTO departments (id, name, code, status) VALUES
('dept-1', 'Computer Applications', 'MCA', 'Active'),
('dept-2', 'Management Studies', 'MBA', 'Active'),
('dept-3', 'Computer Science & Engineering', 'CSE', 'Active');

INSERT INTO courses (id, name, code, department_id, level, duration_years, total_semesters, intake_capacity, status) VALUES
('crs-1', 'Master of Computer Applications', 'MCA', 'dept-1', 'PG', 2, 4, 120, 'Active'),
('crs-2', 'Bachelor of Computer Applications', 'BCA', 'dept-1', 'UG', 3, 6, 120, 'Active'),
('crs-3', 'Master of Business Administration', 'MBA', 'dept-2', 'PG', 2, 4, 90, 'Active');

INSERT INTO faculty (id, employee_id, name, email, phone, department_id, designation, qualification, experience_years, joining_date, status) VALUES
('fac-1', 'FAC-0001', 'Dr. S. N. Roy', 'sn.roy@eduerp.edu', '9876543210', 'dept-1', 'Professor & HOD', 'Ph.D in AI/ML', 18, '2015-08-01', 'Active'),
('fac-2', 'FAC-0002', 'Dr. Amit Joshi', 'amit.joshi@eduerp.edu', '9876543211', 'dept-1', 'Associate Professor', 'Ph.D in Data Science', 12, '2018-06-15', 'Active'),
('fac-3', 'FAC-0003', 'Prof. Meena Sharma', 'meena.sharma@eduerp.edu', '9876543212', 'dept-1', 'Assistant Professor', 'M.Tech in CSE', 8, '2020-01-10', 'Active');

INSERT INTO students (id, enrollment_no, name, email, phone, gender, dob, course_id, semester_number, section_name, admission_date, status) VALUES
('stu-1', 'MCA-2025-001', 'Rahul Verma', 'rahul.verma@eduerp.edu', '9876543210', 'Male', '2002-05-14', 'crs-1', 2, 'Section A', '2025-07-15', 'Active'),
('stu-2', 'MCA-2025-002', 'Ananya Sharma', 'ananya.sharma@eduerp.edu', '9876543211', 'Female', '2002-08-22', 'crs-1', 2, 'Section A', '2025-07-15', 'Active'),
('stu-3', 'BCA-2025-014', 'Priyanshu Das', 'priyanshu.das@eduerp.edu', '9876543212', 'Male', '2003-11-05', 'crs-2', 4, 'Section B', '2024-07-20', 'Active');

INSERT INTO parents (id, name, relation, phone, email, status) VALUES
('par-1', 'Sanjay Verma', 'Father', '9812345678', 'sanjay.verma@gmail.com', 'Active'),
('par-2', 'Sunita Sharma', 'Mother', '9812345679', 'sunita.sharma@gmail.com', 'Active');

INSERT INTO user_accounts (id, name, username, email, password_hash, role, profile_type, status) VALUES
('usr-1', 'System Administrator', 'admin_eduerp', 'admin@eduerp.edu', '$2b$10$hashedpass123', 'Super Admin', 'Staff', 'Active'),
('usr-2', 'Dr. S. N. Roy', 'sn_roy', 'sn.roy@eduerp.edu', '$2b$10$hashedpass456', 'Faculty', 'Faculty', 'Active'),
('usr-4', 'Rahul Verma', 'rahul_v', 'rahul.verma@eduerp.edu', '$2b$10$hashedpass789', 'Student', 'Student', 'Active');
