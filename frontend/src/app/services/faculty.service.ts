import { Injectable, signal, computed, inject } from '@angular/core';
import { Faculty } from '../models/faculty-parent.model';
import { AcademicService } from './academic.service';

@Injectable({
  providedIn: 'root'
})
export class FacultyService {
  private readonly academicService = inject(AcademicService);

  // Initial Faculty Mock Data matching Subject Allocation & HODs
  private readonly _facultyList = signal<Faculty[]>([
    {
      id: 'fac-1',
      employeeId: 'FAC-0001',
      name: 'Dr. S. N. Roy',
      initials: 'SR',
      gender: 'Male',
      email: 'sn.roy@eduerp.edu',
      phone: '9811001122',
      departmentId: 'dept-mca',
      department: 'Computer Applications',
      designation: 'Professor',
      qualification: 'Ph.D. in Computer Science (IIT Delhi)',
      experienceYears: 18,
      experience: '18 Years',
      joiningDate: '2008-07-15',
      status: 'Active',
      isHod: true
    },
    {
      id: 'fac-2',
      employeeId: 'FAC-0002',
      name: 'Dr. Amit Joshi',
      initials: 'AJ',
      gender: 'Male',
      email: 'amit.joshi@eduerp.edu',
      phone: '9811002233',
      departmentId: 'dept-mca',
      department: 'Computer Applications',
      designation: 'Professor',
      qualification: 'Ph.D. in Algorithms & Data Structures',
      experienceYears: 14,
      experience: '14 Years',
      joiningDate: '2012-08-01',
      status: 'Active'
    },
    {
      id: 'fac-3',
      employeeId: 'FAC-0003',
      name: 'Prof. Ananya Sen',
      initials: 'AS',
      gender: 'Female',
      email: 'ananya.sen@eduerp.edu',
      phone: '9811003344',
      departmentId: 'dept-mca',
      department: 'Computer Applications',
      designation: 'Associate Professor',
      qualification: 'M.Tech Full Stack Web Architectures',
      experienceYears: 10,
      experience: '10 Years',
      joiningDate: '2016-01-10',
      status: 'Active'
    },
    {
      id: 'fac-4',
      employeeId: 'FAC-0004',
      name: 'Prof. Meena Sharma',
      initials: 'MS',
      gender: 'Female',
      email: 'meena.sharma@eduerp.edu',
      phone: '9811004455',
      departmentId: 'dept-mca',
      department: 'Computer Applications',
      designation: 'Assistant Professor',
      qualification: 'MCA, M.Tech Software Systems',
      experienceYears: 7,
      experience: '7 Years',
      joiningDate: '2019-07-20',
      status: 'Active'
    },
    {
      id: 'fac-5',
      employeeId: 'FAC-0005',
      name: 'Prof. Sandeep Bansal',
      initials: 'SB',
      gender: 'Male',
      email: 'sandeep.bansal@eduerp.edu',
      phone: '9811005566',
      departmentId: 'dept-mca',
      department: 'Computer Applications',
      designation: 'Assistant Professor',
      qualification: 'M.Tech Cloud Computing & DevOps',
      experienceYears: 5,
      experience: '5 Years',
      joiningDate: '2021-02-15',
      status: 'Active'
    },
    {
      id: 'fac-6',
      employeeId: 'FAC-0006',
      name: 'Dr. Shalini Gupta',
      initials: 'SG',
      gender: 'Female',
      email: 'shalini.gupta@eduerp.edu',
      phone: '9822001122',
      departmentId: 'dept-cse',
      department: 'Computer Science & Engineering',
      designation: 'Professor',
      qualification: 'Ph.D. Artificial Intelligence & ML (IITB)',
      experienceYears: 16,
      experience: '16 Years',
      joiningDate: '2010-06-10',
      status: 'Active',
      isHod: true
    },
    {
      id: 'fac-7',
      employeeId: 'FAC-0007',
      name: 'Dr. Rajesh Khanna',
      initials: 'RK',
      gender: 'Male',
      email: 'rajesh.khanna@eduerp.edu',
      phone: '9833001122',
      departmentId: 'dept-it',
      department: 'Information Technology',
      designation: 'Professor',
      qualification: 'Ph.D. Network Security & Distributed Systems',
      experienceYears: 15,
      experience: '15 Years',
      joiningDate: '2011-09-01',
      status: 'Active',
      isHod: true
    },
    {
      id: 'fac-8',
      employeeId: 'FAC-0008',
      name: 'Dr. Manish Aggarwal',
      initials: 'MA',
      gender: 'Male',
      email: 'manish.aggarwal@eduerp.edu',
      phone: '9844001122',
      departmentId: 'dept-mgmt',
      department: 'Management Studies',
      designation: 'Professor',
      qualification: 'Ph.D. Financial Management (IIM-A)',
      experienceYears: 12,
      experience: '12 Years',
      joiningDate: '2014-07-01',
      status: 'Active',
      isHod: true
    },
    {
      id: 'fac-9',
      employeeId: 'FAC-0009',
      name: 'Dr. P. V. Ramamurthy',
      initials: 'PR',
      gender: 'Male',
      email: 'pv.ramamurthy@eduerp.edu',
      phone: '9855001122',
      departmentId: 'dept-comm',
      department: 'Commerce & Finance',
      designation: 'Professor',
      qualification: 'Ph.D. Corporate Accounting & Taxation',
      experienceYears: 20,
      experience: '20 Years',
      joiningDate: '2006-08-15',
      status: 'Active',
      isHod: true
    },
    {
      id: 'fac-10',
      employeeId: 'FAC-0010',
      name: 'Dr. T. P. Raman',
      initials: 'TR',
      gender: 'Male',
      email: 'tp.raman@eduerp.edu',
      phone: '9866001122',
      departmentId: 'dept-ece',
      department: 'Electronics & Communication',
      designation: 'Professor',
      qualification: 'Ph.D. VLSI & Embedded Systems',
      experienceYears: 17,
      experience: '17 Years',
      joiningDate: '2009-07-10',
      status: 'Active',
      isHod: true
    },
    {
      id: 'fac-11',
      employeeId: 'FAC-0011',
      name: 'Prof. Vikram Chatterji',
      initials: 'VC',
      gender: 'Male',
      email: 'vikram.chatterji@eduerp.edu',
      phone: '9877001122',
      departmentId: 'dept-cse',
      department: 'Computer Science & Engineering',
      designation: 'Associate Professor',
      qualification: 'M.Tech Cyber Security & Forensics',
      experienceYears: 9,
      experience: '9 Years',
      joiningDate: '2017-08-20',
      status: 'On Leave'
    },
    {
      id: 'fac-12',
      employeeId: 'FAC-0012',
      name: 'Prof. Deepa Varghese',
      initials: 'DV',
      gender: 'Female',
      email: 'deepa.varghese@eduerp.edu',
      phone: '9888001122',
      departmentId: 'dept-it',
      department: 'Information Technology',
      designation: 'Assistant Professor',
      qualification: 'M.Tech Software Engineering',
      experienceYears: 6,
      experience: '6 Years',
      joiningDate: '2020-01-15',
      status: 'Active'
    }
  ]);

  readonly facultyList = this._facultyList.asReadonly();

  // Computed Faculty Stats
  readonly facultyStats = computed(() => {
    const list = this._facultyList();
    const professors = list.filter(f => f.designation === 'Professor').length;
    const associate = list.filter(f => f.designation === 'Associate Professor').length;
    const assistant = list.filter(f => f.designation === 'Assistant Professor' || f.designation === 'Lecturer').length;

    // Unique departments covered
    const deptSet = new Set(list.map(f => f.department));

    return {
      total: list.length,
      breakdown: `${professors} Prof / ${associate} Assoc / ${assistant} Asst`,
      departmentsCovered: deptSet.size
    };
  });

  private generateInitials(name: string): string {
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/, '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  generateEmployeeId(): string {
    const nextNum = this._facultyList().length + 1;
    return `FAC-${String(nextNum).padStart(4, '0')}`;
  }

  saveFaculty(data: Omit<Faculty, 'id' | 'initials' | 'experience'>, editId?: string): { success: boolean; error?: string } {
    const cleanEmpId = data.employeeId.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check unique employeeId
    const existing = this._facultyList().find(
      f => f.employeeId.toUpperCase() === cleanEmpId && f.id !== editId
    );
    if (existing) {
      return { success: false, error: `Employee ID "${cleanEmpId}" is already assigned to ${existing.name}.` };
    }

    const initials = this.generateInitials(data.name);
    const experience = `${data.experienceYears} Year${data.experienceYears === 1 ? '' : 's'}`;

    if (editId) {
      this._facultyList.update(list =>
        list.map(f => (f.id === editId ? { ...data, employeeId: cleanEmpId, email: cleanEmail, experience, initials, id: editId } : f))
      );
    } else {
      const newFac: Faculty = {
        ...data,
        employeeId: cleanEmpId,
        email: cleanEmail,
        experience,
        initials,
        id: `fac-${Date.now()}`
      };
      this._facultyList.update(list => [newFac, ...list]);
    }

    return { success: true };
  }

  deleteFaculty(id: string): { success: boolean; error?: string } {
    const target = this._facultyList().find(f => f.id === id);
    if (!target) {
      return { success: false, error: 'Faculty record not found.' };
    }

    // BLOCK DELETION if faculty has active subject allocations in AcademicService
    const activeAllocations = this.academicService.subjectAllocations().filter(
      alloc => alloc.faculty.toLowerCase().trim() === target.name.toLowerCase().trim()
    );

    if (activeAllocations.length > 0) {
      const subjectsList = activeAllocations.map(a => `"${a.subject}" (${a.section})`).join(', ');
      return {
        success: false,
        error: `Cannot delete "${target.name}". They are currently allocated to ${activeAllocations.length} active subject(s): ${subjectsList}. Reassign or remove these subject allocations first.`
      };
    }

    this._facultyList.update(list => list.filter(f => f.id !== id));
    return { success: true };
  }
}
