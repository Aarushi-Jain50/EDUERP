import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { PageHeader } from '../../../components/shared/page-header';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { CommunicationService } from '../../../services/communication.service';
import { FacultyService } from '../../../services/faculty.service';
import { StudentsService } from '../../../services/students.service';
import { Message } from '../../../models/communication.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-message-center-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeader, FormDrawer],
  template: `
    <div class="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans h-[calc(100vh-140px)]">
      <app-page-header title="Message Center" subtitle="Communicate internally with students, faculty, and administrative staff." primaryActionLabel="Compose" (primaryActionClicked)="openCompose()" />
      
      <div class="flex-1 flex bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden min-h-0">
         
         <!-- Left Pane: Folders & Message List (380px) -->
         <div class="w-full lg:w-[380px] border-r border-slate-100 flex flex-col shrink-0 min-h-0" [class.hidden]="selectedMessage() && isMobile()">
            <!-- Folders -->
            <div class="p-4 flex gap-2">
               <button 
                 (click)="activeFolder.set('Inbox')"
                 [class]="activeFolder() === 'Inbox' ? 'bg-[#6D42E8] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
                 class="flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
               >
                 <span class="material-icons text-sm">inbox</span>
                 Inbox
                 @if (unreadCount(); as count) { <span class="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{{ count }}</span> }
               </button>
               <button 
                 (click)="activeFolder.set('Sent')"
                 [class]="activeFolder() === 'Sent' ? 'bg-[#6D42E8] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
                 class="flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
               >
                 <span class="material-icons text-sm">send</span>
                 Sent
               </button>
            </div>

            <!-- Search -->
            <div class="px-4 pb-4">
               <div class="relative">
                 <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                   <span class="material-icons text-sm">search</span>
                 </span>
                 <input type="text" [(ngModel)]="searchQuery" placeholder="Search messages..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:border-[#6D42E8]" />
               </div>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
               @for (m of filteredMessages(); track m.id) {
                 <button 
                   (click)="selectMessage(m)"
                   class="w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-col gap-1 cursor-pointer group relative"
                   [class.bg-purple-50/50]="selectedMessage()?.id === m.id"
                 >
                    @if (!m.isRead && m.folder === 'Inbox') {
                       <div class="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#6D42E8] rounded-full"></div>
                    }
                    <div class="flex justify-between items-center">
                       <span class="text-xs font-black text-slate-900 truncate pr-4">{{ m.folder === 'Inbox' ? m.senderName : m.recipientName }}</span>
                       <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">{{ getRelativeTime(m.timestamp) }}</span>
                    </div>
                    <span class="text-[11px] font-bold text-slate-700 truncate">{{ m.subject }}</span>
                    <p class="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{{ m.body }}</p>
                 </button>
               } @empty {
                  <div class="py-20 text-center text-slate-300">
                     <span class="material-icons text-4xl block mb-2 opacity-20">mail_outline</span>
                     <p class="text-xs font-medium italic">No messages found</p>
                  </div>
               }
            </div>
         </div>

         <!-- Right Pane: Thread View -->
         <div class="flex-1 flex flex-col min-h-0 relative" [class.hidden]="!selectedMessage() && isMobile()">
            @if (selectedMessage(); as msg) {
               <!-- Thread Header -->
               <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div class="flex items-center gap-3">
                     @if (isMobile()) {
                       <button (click)="selectedMessage.set(null)" class="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                          <span class="material-icons">arrow_back</span>
                       </button>
                     }
                     <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#6D42E8] font-black text-sm border border-slate-200 uppercase">
                        {{ getInitials(msg.folder === 'Inbox' ? msg.senderName : msg.recipientName) }}
                     </div>
                     <div>
                        <h4 class="text-sm font-black text-slate-900 leading-none">{{ msg.folder === 'Inbox' ? msg.senderName : msg.recipientName }}</h4>
                        <p class="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">{{ msg.senderRole }} • {{ msg.folder === 'Inbox' ? 'Recipient: Me' : 'From: Me' }}</p>
                     </div>
                  </div>
                  <div class="flex items-center gap-2">
                     <button (click)="deleteMessage(msg.id)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
                        <span class="material-icons text-sm">delete_outline</span>
                     </button>
                  </div>
               </div>

               <!-- Subject Bar -->
               <div class="px-6 py-3 bg-slate-50 border-b border-slate-100">
                  <span class="text-[11px] font-black text-slate-800 uppercase tracking-widest">{{ msg.subject }}</span>
               </div>

               <!-- Message Body -->
               <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  <div class="max-w-3xl mx-auto space-y-6">
                     <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {{ msg.body }}
                     </div>
                     <div class="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">Sent on {{ msg.timestamp.toLocaleString() }}</div>
                  </div>
               </div>

               <!-- Sticky Reply Bar -->
               <div class="p-4 bg-white border-t border-slate-100">
                  <div class="max-w-3xl mx-auto relative">
                     <textarea [(ngModel)]="replyText" rows="1" class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none overflow-hidden" placeholder="Type a reply..."></textarea>
                     <button 
                       [disabled]="!replyText.trim()"
                       (click)="sendReply()"
                       class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#6D42E8] text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer"
                     >
                        <span class="material-icons text-sm">send</span>
                     </button>
                  </div>
               </div>
            } @else {
               <div class="flex-1 flex flex-col items-center justify-center p-20 text-slate-300">
                  <div class="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                     <span class="material-icons text-5xl opacity-20">mail</span>
                  </div>
                  <h3 class="text-xl font-bold text-slate-800">Select a message</h3>
                  <p class="text-sm mt-1 max-w-xs text-center">Choose a conversation from the sidebar to view the full message thread.</p>
               </div>
            }
         </div>
      </div>

      <!-- Compose Drawer -->
      <app-form-drawer 
        [isOpen]="isComposeOpen()" 
        title="Compose Message" 
        subtitle="Send an internal institutional message."
        saveLabel="Send Message"
        (closed)="isComposeOpen.set(false)" 
        (saved)="handleSend()"
      >
        <form [formGroup]="composeForm" class="space-y-4 pt-2">
           <div class="space-y-1.5">
             <label for="mc-recipient" class="text-xs font-semibold text-slate-800">Recipient <span class="text-red-500">*</span></label>
             <select id="mc-recipient" formControlName="recipientId" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
               <option value="">Select Recipient</option>
               <optgroup label="Faculty">
                 @for (f of facultyService.facultyList(); track f.id) {
                   <option [value]="f.id">{{ f.name }} ({{ f.designation }})</option>
                 }
               </optgroup>
               <optgroup label="Students">
                 @for (s of studentsService.students(); track s.id) {
                   <option [value]="s.id">{{ s.name }} ({{ s.enrollmentNo }})</option>
                 }
               </optgroup>
             </select>
           </div>

           <div class="space-y-1.5">
             <label for="mc-subject" class="text-xs font-semibold text-slate-800">Subject <span class="text-red-500">*</span></label>
             <input id="mc-subject" formControlName="subject" placeholder="What is this about?" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]" />
           </div>

           <div class="space-y-1.5">
             <label for="mc-body" class="text-xs font-semibold text-slate-800">Message <span class="text-red-500">*</span></label>
             <textarea id="mc-body" formControlName="body" rows="6" placeholder="Type your message here..." class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8] resize-none"></textarea>
           </div>

           <div class="space-y-1.5">
             <label for="mc-prio" class="text-xs font-semibold text-slate-800">Priority</label>
             <select id="mc-prio" formControlName="priority" class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]">
               <option value="Normal">Normal</option>
               <option value="High">High / Urgent</option>
             </select>
           </div>
        </form>
      </app-form-drawer>
    </div>
  `
})
export class MessageCenterPage {
  protected readonly commsService = inject(CommunicationService);
  protected readonly facultyService = inject(FacultyService);
  protected readonly studentsService = inject(StudentsService);

  protected searchQuery = '';
  protected readonly activeFolder = signal<'Inbox' | 'Sent'>('Inbox');
  protected readonly selectedMessage = signal<Message | null>(null);
  protected readonly isComposeOpen = signal(false);
  protected replyText = '';

  protected readonly composeForm = new FormGroup({
    recipientId: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required),
    body: new FormControl('', Validators.required),
    priority: new FormControl<'Normal' | 'High'>('Normal', Validators.required)
  });

  protected readonly filteredMessages = computed(() => {
    const q = this.searchQuery.toLowerCase();
    const folder = this.activeFolder();
    
    return this.commsService.messages().filter(m => {
      if (m.folder !== folder) return false;
      if (q && !m.subject.toLowerCase().includes(q) && !m.senderName.toLowerCase().includes(q) && !m.recipientName.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  protected readonly unreadCount = computed(() => 
    this.commsService.messages().filter(m => m.folder === 'Inbox' && !m.isRead).length
  );

  selectMessage(m: Message) {
    this.selectedMessage.set(m);
    if (m.folder === 'Inbox') this.commsService.markMessageRead(m.id);
  }

  deleteMessage(id: string) {
    if (confirm('Delete this message permanently?')) {
      this.commsService.deleteMessage(id);
      this.selectedMessage.set(null);
    }
  }

  openCompose() {
    this.composeForm.reset({ priority: 'Normal' });
    this.isComposeOpen.set(true);
  }

  handleSend() {
    if (this.composeForm.invalid) return;
    const val = this.composeForm.getRawValue();
    
    // Find recipient name
    let recipientName = 'User';
    
    const faculty = this.facultyService.facultyList().find(f => f.id === val.recipientId);
    if (faculty) { recipientName = faculty.name; }
    else {
      const student = this.studentsService.students().find(s => s.id === val.recipientId);
      if (student) { recipientName = student.name; }
    }

    this.commsService.sendMessage({
      senderId: 'admin',
      senderName: 'Administrator',
      senderRole: 'Super Admin',
      recipientId: val.recipientId!,
      recipientName,
      subject: val.subject!,
      body: val.body!,
      priority: val.priority!
    });

    this.isComposeOpen.set(false);
  }

  sendReply() {
    const original = this.selectedMessage();
    if (!original || !this.replyText.trim()) return;

    this.commsService.sendMessage({
      senderId: 'admin',
      senderName: 'Administrator',
      senderRole: 'Super Admin',
      recipientId: original.folder === 'Inbox' ? original.senderId : original.recipientId,
      recipientName: original.folder === 'Inbox' ? original.senderName : original.recipientName,
      subject: `Re: ${original.subject}`,
      body: this.replyText,
      priority: 'Normal'
    });

    this.replyText = '';
  }

  isMobile() { return window.innerWidth < 1024; }
  getInitials(n: string) { return n.split(' ').map(x => x[0]).join('').toUpperCase().substring(0, 2); }
  getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
