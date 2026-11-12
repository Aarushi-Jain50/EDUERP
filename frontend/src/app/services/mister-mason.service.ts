import { Injectable, signal } from '@angular/core';

export interface ServiceRequest {
  id: string;
  service: string;
  category: string;
  location: string;
  date: string;
  status: 'New' | 'In Progress' | 'Completed' | 'Pending';
  description: string;
  assignedEngineer?: string;
  engineerContact?: string;
  estimatedCost?: string;
}

export interface MaterialRequest {
  id: string;
  materialName: string;
  quantity: string;
  unit: string;
  deliverySite: string;
  status: 'Approved' | 'In Review' | 'Dispatched';
  urgency: 'Standard' | 'Urgent';
  createdDate: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  contractor: string;
  startDate: string;
  status: 'Active' | 'Pending' | 'Completed';
  budget: string;
}

@Injectable({
  providedIn: 'root'
})
export class MisterMasonService {
  readonly customerProfile = signal({
    name: 'Rose Sharma',
    email: 'rose@yopmail.com',
    customerId: 'CUST2026102311179160',
    phone: '+91 98102 34567',
    company: 'Kocuri Enterprises',
    address: 'Plot 42, Okhla Industrial Area, Phase III, New Delhi, India'
  });

  readonly serviceRequests = signal<ServiceRequest[]>([
    {
      id: 'RE20261110075800',
      service: 'General Service',
      category: 'Civil & Structural Inspection',
      location: 'Delhi, India',
      date: '10 Nov 2026',
      status: 'New',
      description: 'Comprehensive structural column check, plaster inspection, and waterproofing assessment for newly cast floor slab.',
      assignedEngineer: 'Er. Rajesh Kumar (Senior Structural Consultant)',
      engineerContact: '+91 98480 22334',
      estimatedCost: '₹8,500'
    },
    {
      id: 'RE20261108041220',
      service: 'Plumbing & Drainage',
      category: 'Sanitary Piping',
      location: 'Nellore, AP',
      date: '08 Nov 2026',
      status: 'In Progress',
      description: 'Main underground CPVC piping installation and high-pressure storm water drainage line inspection.',
      assignedEngineer: 'Er. S. Venkatesh (Site Engineer)',
      engineerContact: '+91 89196 11426',
      estimatedCost: '₹24,000'
    },
    {
      id: 'RE20261102011933',
      service: 'Electrical Rewiring',
      category: 'Substation & Panels',
      location: 'Delhi, India',
      date: '02 Nov 2026',
      status: 'Completed',
      description: '3-phase commercial panel wiring, heavy machinery isolator testing, and earthing pit resistance measurement.',
      assignedEngineer: 'Er. Amitav Sen (Lead Electrical Consultant)',
      engineerContact: '+91 98112 55440',
      estimatedCost: '₹38,500'
    }
  ]);

  readonly materialRequests = signal<MaterialRequest[]>([
    {
      id: 'MR-2026-101',
      materialName: 'UltraTech Super Cement (53 Grade OPC)',
      quantity: '450',
      unit: 'Bags (50kg)',
      deliverySite: 'Site A - Vikrutha Pet, Nellore',
      status: 'Dispatched',
      urgency: 'Urgent',
      createdDate: '09 Nov 2026'
    },
    {
      id: 'MR-2026-102',
      materialName: 'Tata Tiscon Fe550D High-Strength TMT Rebars (16mm & 12mm)',
      quantity: '18.5',
      unit: 'Metric Tonnes',
      deliverySite: 'Site B - Okhla Phase III, New Delhi',
      status: 'Approved',
      urgency: 'Standard',
      createdDate: '06 Nov 2026'
    },
    {
      id: 'MR-2026-103',
      materialName: 'Triple-Washed River Sand & M-Sand Mix',
      quantity: '4',
      unit: 'Heavy Dumpers (10 Wheeler)',
      deliverySite: 'Site A - Vikrutha Pet, Nellore',
      status: 'In Review',
      urgency: 'Standard',
      createdDate: '10 Nov 2026'
    }
  ]);

  addServiceRequest(request: Omit<ServiceRequest, 'id' | 'date'>): void {
    const today = new Date();
    const dateFormatted = `${today.getDate()} ${today.toLocaleString('default', { month: 'short' })} ${today.getFullYear()}`;
    const newId = `RE${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}${Math.floor(100000 + Math.random() * 900000)}`;

    this.serviceRequests.update(prev => [
      {
        ...request,
        id: newId,
        date: dateFormatted
      },
      ...prev
    ]);
  }

  addMaterialRequest(request: Omit<MaterialRequest, 'id' | 'createdDate'>): void {
    const today = new Date();
    const dateFormatted = `${today.getDate()} ${today.toLocaleString('default', { month: 'short' })} ${today.getFullYear()}`;
    const newId = `MR-${today.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    this.materialRequests.update(prev => [
      {
        ...request,
        id: newId,
        createdDate: dateFormatted
      },
      ...prev
    ]);
  }
}
