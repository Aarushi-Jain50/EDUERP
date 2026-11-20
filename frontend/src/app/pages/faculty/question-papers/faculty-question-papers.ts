import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../components/shared/page-header';
import { StatStrip, StatItem } from '../../../components/shared/stat-strip';
import { FormDrawer } from '../../../components/shared/form-drawer';
import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { StatusBadge } from '../../../components/shared/status-badge';
import { EmptyState } from '../../../components/shared/empty-state';
import { FacultyPortalFacade } from '../shared/faculty-portal.facade';
import { AcademicService } from '../../../services/academic.service';
import {
  QuestionBankItem,
  QuestionDifficulty,
  QuestionPaper,
  QuestionPaperSection,
  QuestionPaperService,
  QuestionType
} from '../../../services/question-paper.service';
import { exportToPdf } from '../../../utils/export.helper';

@Component({
  selector: 'app-faculty-question-papers',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    PageHeader,
    StatStrip,
    FormDrawer,
    ConfirmDialog,
    StatusBadge,
    EmptyState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5 font-sans text-slate-900 text-[13px] pb-16 min-w-0">
      <app-page-header
        title="Question Bank & Question Papers"
        subtitle="Author subject questions, structure multi-section examination papers, finalize blueprints, and export printable PDFs."
        [actionLabel]="activeTab() === 'bank' ? 'Add Question' : 'Prepare Question Paper'"
        actionIcon="add"
        (actionClicked)="activeTab() === 'bank' ? openCreateQuestion() : openCreatePaper()"
      />

      <div class="mb-4">
        <app-stat-strip [items]="stats()" />
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200">
        <div class="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            (click)="activeTab.set('papers')"
            [class]="activeTab() === 'papers'
              ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-semibold bg-white'
              : 'text-slate-500 hover:text-slate-800 font-medium'"
            class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">description</mat-icon>
            <span>Question Papers ({{ facultyPapers().length }})</span>
          </button>
          <button
            type="button"
            (click)="activeTab.set('bank')"
            [class]="activeTab() === 'bank'
              ? 'border-b-2 border-[#6D42E8] text-[#6D42E8] font-semibold bg-white'
              : 'text-slate-500 hover:text-slate-800 font-medium'"
            class="px-4 sm:px-5 py-3 text-xs transition-all cursor-pointer rounded-t-xl whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <mat-icon class="text-sm">quiz</mat-icon>
            <span>Question Bank ({{ facultyQuestions().length }})</span>
          </button>
        </div>

        <div class="pb-2 flex items-center gap-2">
          <button
            type="button"
            (click)="openCreateQuestion()"
            class="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#6D42E8] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="text-sm">add_circle_outline</mat-icon>
            <span>Add Question</span>
          </button>
          <button
            type="button"
            (click)="openCreatePaper()"
            class="px-3 py-1.5 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <mat-icon class="text-sm">note_add</mat-icon>
            <span>New Paper</span>
          </button>
        </div>
      </div>

      <!-- TAB 1: QUESTION PAPERS -->
      @if (activeTab() === 'papers') {
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 sm:max-w-md">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-base">search</mat-icon>
            </span>
            <input
              type="text"
              [value]="paperSearch()"
              (input)="onPaperSearchInput($event)"
              placeholder="Search question papers by title or subject..."
              class="w-full h-10 pl-9 pr-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <select
            [value]="paperSubjectFilter()"
            (change)="onPaperSubjectFilter($event)"
            aria-label="Filter papers by subject"
            class="h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">All My Subjects</option>
            @for (sub of mySubjects(); track sub.subjectId) {
              <option [value]="sub.subjectName">{{ sub.subjectName }}</option>
            }
          </select>
        </div>

        @if (filteredPapers().length > 0) {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            @for (paper of filteredPapers(); track paper.id) {
              @let totalMarks = qpService.getPaperTotalMarks(paper);
              @let qCount = qpService.getPaperQuestions(paper).length;
              @let marksMismatch = totalMarks !== paper.targetMaxMarks;

              <article class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4 flex flex-col justify-between">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="space-y-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <app-status-badge [status]="paper.status" />
                        @if (paper.examTitle) {
                          <span class="px-2 py-0.5 rounded-md bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-semibold">
                            {{ paper.examTitle }}
                          </span>
                        }
                      </div>
                      <h3 class="font-display font-bold text-slate-900 text-base leading-snug">
                        {{ paper.title }}
                      </h3>
                      <p class="text-xs text-slate-500">
                        {{ paper.subjectName }} · {{ paper.courseName }} ({{ paper.semester }})
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div>
                      <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Questions</span>
                      <span class="font-bold text-slate-900 tabular-nums">{{ qCount }} Qs ({{ paper.sections.length }} Sec)</span>
                    </div>
                    <div>
                      <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Paper Marks</span>
                      <span class="font-bold tabular-nums" [class]="marksMismatch ? 'text-amber-700' : 'text-emerald-700'">
                        {{ totalMarks }} / {{ paper.targetMaxMarks }}
                      </span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Duration</span>
                      <span class="font-bold text-slate-900 tabular-nums">{{ paper.durationMinutes }} mins</span>
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    @for (sec of paper.sections; track sec.id) {
                      <div class="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-100">
                        <span class="font-semibold text-slate-800 truncate">{{ sec.name }}</span>
                        <span class="text-[11px] font-mono text-[#6D42E8] shrink-0">{{ sec.questionIds.length }} Qs</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      (click)="previewPaper.set(paper)"
                      class="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#6D42E8] text-xs font-semibold text-slate-700 hover:text-[#6D42E8] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-sm">visibility</mat-icon>
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      (click)="downloadPaperPdf(paper, false)"
                      class="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-[#6D42E8] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                      <span>Paper PDF</span>
                    </button>
                    <button
                      type="button"
                      (click)="downloadPaperPdf(paper, true)"
                      class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <mat-icon class="text-sm">key</mat-icon>
                      <span>Answer Key</span>
                    </button>
                  </div>

                  <div class="flex items-center gap-1.5">
                    @if (paper.status === 'Draft') {
                      <button
                        type="button"
                        (click)="qpService.finalizePaper(paper.id)"
                        class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <mat-icon class="text-sm">check_circle</mat-icon>
                        <span>Finalize</span>
                      </button>
                    }
                    <button
                      type="button"
                      (click)="openEditPaper(paper)"
                      aria-label="Edit paper"
                      class="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#6D42E8] hover:bg-purple-50 cursor-pointer"
                      title="Edit Question Paper"
                    >
                      <mat-icon class="text-base">edit</mat-icon>
                    </button>
                    <button
                      type="button"
                      (click)="confirmDeletePaper(paper)"
                      aria-label="Delete paper"
                      class="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Question Paper"
                    >
                      <mat-icon class="text-base">delete</mat-icon>
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="bg-white rounded-xl border border-[#E2E8F0]">
            <app-empty-state
              icon="description"
              title="No question papers prepared"
              message="Build a multi-section examination question paper from your subject question bank."
              actionLabel="Prepare Question Paper"
              (actionClicked)="openCreatePaper()"
            />
          </div>
        }
      }

      <!-- TAB 2: QUESTION BANK -->
      @if (activeTab() === 'bank') {
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="relative lg:col-span-2">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <mat-icon class="text-base">search</mat-icon>
            </span>
            <input
              type="text"
              [value]="questionSearch()"
              (input)="onQuestionSearchInput($event)"
              placeholder="Search questions by prompt or topic..."
              class="w-full h-10 pl-9 pr-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <select
            [value]="questionSubjectFilter()"
            (change)="onQuestionSubjectFilter($event)"
            aria-label="Filter questions by subject"
            class="h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">All My Subjects</option>
            @for (sub of mySubjects(); track sub.subjectId) {
              <option [value]="sub.subjectName">{{ sub.subjectName }}</option>
            }
          </select>

          <select
            [value]="questionTypeFilter()"
            (change)="onQuestionTypeFilter($event)"
            aria-label="Filter questions by type"
            class="h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium focus:outline-none focus:border-[#6D42E8]"
          >
            <option value="">All Question Types</option>
            <option value="MCQ">MCQ / Objective</option>
            <option value="Short Answer">Short Answer</option>
            <option value="Long Essay">Long Essay</option>
            <option value="Numerical / Code">Numerical / Code</option>
          </select>
        </div>

        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          @if (filteredQuestions().length > 0) {
            <div class="divide-y divide-slate-100">
              @for (q of filteredQuestions(); track q.id) {
                <div class="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors space-y-2.5">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="px-2 py-0.5 rounded-md bg-purple-50 text-[#6D42E8] border border-purple-200 text-[11px] font-bold">
                        {{ q.type }}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded-md border text-[11px] font-semibold"
                        [class]="q.difficulty === 'Hard'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : q.difficulty === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
                      >
                        {{ q.difficulty }}
                      </span>
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold tabular-nums">
                        {{ q.marks }} {{ q.marks === 1 ? 'Mark' : 'Marks' }}
                      </span>
                      <span class="text-xs font-semibold text-slate-500">{{ q.subjectName }} · {{ q.topic }}</span>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        (click)="openEditQuestion(q)"
                        aria-label="Edit question"
                        class="p-1.5 rounded-lg text-slate-500 hover:text-[#6D42E8] hover:bg-purple-50 cursor-pointer"
                        title="Edit"
                      >
                        <mat-icon class="text-base">edit</mat-icon>
                      </button>
                      <button
                        type="button"
                        (click)="confirmDeleteQuestion(q)"
                        aria-label="Delete question"
                        class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete"
                      >
                        <mat-icon class="text-base">delete</mat-icon>
                      </button>
                    </div>
                  </div>

                  <p class="font-semibold text-slate-900 text-[13px] leading-relaxed">
                    {{ q.prompt }}
                  </p>

                  @if (q.type === 'MCQ' && q.options && q.options.length > 0) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      @for (opt of q.options; track opt; let idx = $index) {
                        <div
                          class="px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2"
                          [class]="q.correctAnswer === opt
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                            : 'bg-slate-50 border-slate-200/80 text-slate-700'"
                        >
                          <span class="font-mono font-bold text-[11px]">{{ optionLetter(idx) }}.</span>
                          <span class="truncate">{{ opt }}</span>
                        </div>
                      }
                    </div>
                  }

                  @if (q.rubricHint || (q.type !== 'MCQ' && q.correctAnswer)) {
                    <p class="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <strong class="text-slate-700">Answer Key / Rubric:</strong>
                      {{ q.correctAnswer || q.rubricHint }}
                    </p>
                  }
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="quiz"
              title="No matching questions"
              message="Add objective MCQs, short-answer, or long essay questions for your allocated subjects."
              actionLabel="Add First Question"
              (actionClicked)="openCreateQuestion()"
            />
          }
        </div>
      }

      <!-- DRAWER 1: ADD / EDIT QUESTION -->
      <app-form-drawer
        [isOpen]="isQuestionDrawerOpen()"
        [title]="editingQuestionId() ? 'Edit Question' : 'Add Question to Bank'"
        subtitle="Create reusable MCQ, Short Answer, Long Essay, or Numerical/Code questions"
        [saveLabel]="editingQuestionId() ? 'Update Question' : 'Save Question'"
        widthClass="max-w-[540px]"
        (closed)="isQuestionDrawerOpen.set(false)"
        (saved)="saveQuestion()"
      >
        <form [formGroup]="questionForm" class="space-y-4 pt-1">
          @if (questionError()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
              <span>{{ questionError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="qb-sub" class="text-xs font-semibold text-[#172554]">Subject <span class="text-rose-500">*</span></label>
            <select
              id="qb-sub"
              formControlName="subjectId"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            >
              <option value="">Select Subject</option>
              @for (sub of mySubjects(); track sub.subjectId) {
                <option [value]="sub.subjectId">{{ sub.subjectName }} ({{ sub.subjectCode }})</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="space-y-1.5">
              <label for="qb-type" class="text-xs font-semibold text-[#172554]">Question Type</label>
              <select
                id="qb-type"
                formControlName="type"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              >
                <option value="MCQ">MCQ</option>
                <option value="Short Answer">Short Answer</option>
                <option value="Long Essay">Long Essay</option>
                <option value="Numerical / Code">Numerical / Code</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="qb-diff" class="text-xs font-semibold text-[#172554]">Difficulty</label>
              <select
                id="qb-diff"
                formControlName="difficulty"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label for="qb-marks" class="text-xs font-semibold text-[#172554]">Marks <span class="text-rose-500">*</span></label>
              <input
                id="qb-marks"
                type="number"
                min="1"
                formControlName="marks"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="qb-topic" class="text-xs font-semibold text-[#172554]">Unit / Topic <span class="text-rose-500">*</span></label>
            <input
              id="qb-topic"
              formControlName="topic"
              placeholder="e.g. AVL Trees, Kubernetes HPA, Backpropagation"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <div class="space-y-1.5">
            <label for="qb-prompt" class="text-xs font-semibold text-[#172554]">Question Statement <span class="text-rose-500">*</span></label>
            <textarea
              id="qb-prompt"
              rows="3"
              formControlName="prompt"
              placeholder="Enter complete question statement..."
              class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            ></textarea>
          </div>

          @if (questionForm.controls.type.value === 'MCQ') {
            <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2.5">
              <p class="text-xs font-bold text-[#172554]">Multiple Choice Options</p>
              <input formControlName="optionA" placeholder="Option A" class="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg text-xs" />
              <input formControlName="optionB" placeholder="Option B" class="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg text-xs" />
              <input formControlName="optionC" placeholder="Option C" class="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg text-xs" />
              <input formControlName="optionD" placeholder="Option D" class="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg text-xs" />
              <div class="space-y-1">
                <label for="qb-mcq-ans" class="text-[11px] font-semibold text-slate-600">Correct Option Letter</label>
                <select id="qb-mcq-ans" formControlName="correctOptionKey" class="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold">
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </div>
          } @else {
            <div class="space-y-1.5">
              <label for="qb-answer" class="text-xs font-semibold text-[#172554]">Model Answer / Expected Key Points</label>
              <textarea
                id="qb-answer"
                rows="3"
                formControlName="correctAnswer"
                placeholder="Key points or model solution used during answer sheet evaluation..."
                class="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              ></textarea>
            </div>
          }

          <div class="space-y-1.5">
            <label for="qb-rubric" class="text-xs font-semibold text-[#172554]">Marking Rubric Hint</label>
            <input
              id="qb-rubric"
              formControlName="rubricHint"
              placeholder="e.g. 2 marks formula + 3 marks derivation"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>
        </form>
      </app-form-drawer>

      <!-- DRAWER 2: PREPARE / EDIT QUESTION PAPER -->
      <app-form-drawer
        [isOpen]="isPaperDrawerOpen()"
        [title]="editingPaperId() ? 'Edit Question Paper' : 'Prepare Question Paper'"
        subtitle="Organize sections, pick questions from your subject bank, and verify total marks"
        [saveLabel]="editingPaperId() ? 'Update Paper' : 'Save Question Paper'"
        widthClass="max-w-[680px]"
        (closed)="isPaperDrawerOpen.set(false)"
        (saved)="savePaper()"
      >
        <form [formGroup]="paperForm" class="space-y-4 pt-1">
          @if (paperError()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <mat-icon class="text-base text-rose-600 shrink-0">error_outline</mat-icon>
              <span>{{ paperError() }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="qp-title" class="text-xs font-semibold text-[#172554]">Question Paper Title <span class="text-rose-500">*</span></label>
            <input
              id="qp-title"
              formControlName="title"
              placeholder="e.g. Mid-Term Theory Question Paper — DSA"
              class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label for="qp-sub" class="text-xs font-semibold text-[#172554]">Subject <span class="text-rose-500">*</span></label>
              <select
                id="qp-sub"
                formControlName="subjectId"
                (change)="onPaperSubjectChanged()"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              >
                <option value="">Select Subject</option>
                @for (sub of mySubjects(); track sub.subjectId) {
                  <option [value]="sub.subjectId">{{ sub.subjectName }}</option>
                }
              </select>
            </div>

            <div class="space-y-1.5">
              <label for="qp-exam" class="text-xs font-semibold text-[#172554]">Link Examination (Optional)</label>
              <select
                id="qp-exam"
                formControlName="examId"
                (change)="onLinkedExamChanged()"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              >
                <option value="">Standalone / Practice Paper</option>
                @for (ex of facultyExams(); track ex.id) {
                  <option [value]="ex.id">{{ ex.title }} ({{ ex.subjectName }} · {{ ex.maxMarks }}M)</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1.5">
              <label for="qp-dur" class="text-xs font-semibold text-[#172554]">Duration (min)</label>
              <input
                id="qp-dur"
                type="number"
                min="15"
                formControlName="durationMinutes"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              />
            </div>
            <div class="space-y-1.5">
              <label for="qp-target" class="text-xs font-semibold text-[#172554]">Target Max Marks</label>
              <input
                id="qp-target"
                type="number"
                min="5"
                formControlName="targetMaxMarks"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              />
            </div>
            <div class="space-y-1.5">
              <label for="qp-status" class="text-xs font-semibold text-[#172554]">Paper Status</label>
              <select
                id="qp-status"
                formControlName="status"
                class="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
              >
                <option value="Draft">Draft</option>
                <option value="Finalized">Finalized</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="qp-instr" class="text-xs font-semibold text-[#172554]">General Candidate Instructions</label>
            <textarea
              id="qp-instr"
              rows="2"
              formControlName="generalInstructions"
              class="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#6D42E8]"
            ></textarea>
          </div>

          <!-- Live Paper Marks Summary -->
          <div class="p-3 rounded-xl bg-purple-50 border border-purple-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-semibold text-[#172554]">
              Selected Marks Total:
              <strong class="text-[#6D42E8] tabular-nums">{{ draftPaperMarks() }} / {{ paperForm.controls.targetMaxMarks.value }} Marks</strong>
              ({{ draftPaperQuestionCount() }} Questions)
            </span>
            <button
              type="button"
              (click)="addPaperSection()"
              class="px-2.5 py-1 rounded-lg bg-[#6D42E8] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <mat-icon class="text-xs">add</mat-icon>
              <span>Add Section</span>
            </button>
          </div>

          <!-- Sections & Question Selection -->
          <div class="space-y-3">
            @for (sec of draftSections(); track sec.id; let sIdx = $index) {
              <div class="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    [value]="sec.name"
                    (input)="updateSectionField(sec.id, 'name', $event)"
                    placeholder="Section Name (e.g. Section A — MCQs)"
                    class="flex-1 h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#172554]"
                  />
                  @if (draftSections().length > 1) {
                    <button
                      type="button"
                      (click)="removePaperSection(sec.id)"
                      aria-label="Remove section"
                      class="text-rose-600 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                    >
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  }
                </div>

                <input
                  type="text"
                  [value]="sec.instructions"
                  (input)="updateSectionField(sec.id, 'instructions', $event)"
                  placeholder="Section instructions..."
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-slate-600"
                />

                <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  @for (q of availableQuestionsForPaper(); track q.id) {
                    @let checked = sec.questionIds.includes(q.id);
                    <label
                      class="flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer text-xs transition-colors"
                      [class]="checked ? 'bg-purple-50/80 border-purple-300' : 'bg-white border-slate-200 hover:border-purple-200'"
                    >
                      <input
                        type="checkbox"
                        [checked]="checked"
                        (change)="toggleQuestionInSection(sec.id, q.id)"
                        class="mt-0.5 rounded border-slate-300 text-[#6D42E8]"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-semibold text-[#6D42E8] text-[11px]">{{ q.type }} · {{ q.topic }}</span>
                          <span class="font-bold text-slate-800 text-[11px] tabular-nums shrink-0">{{ q.marks }}M</span>
                        </div>
                        <p class="text-slate-800 line-clamp-2 mt-0.5">{{ q.prompt }}</p>
                      </div>
                    </label>
                  } @empty {
                    <p class="text-[11px] text-slate-500 py-2">
                      No questions in the bank for this subject yet. Switch to Question Bank to add questions first.
                    </p>
                  }
                </div>
              </div>
            }
          </div>
        </form>
      </app-form-drawer>

      <!-- PAPER PREVIEW MODAL -->
      @if (previewPaper(); as pp) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="paper-preview-title">
          <button
            type="button"
            aria-label="Close paper preview"
            (click)="previewPaper.set(null)"
            class="fixed inset-0 bg-black/50 backdrop-blur-xs w-full h-full border-0"
          ></button>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col z-10 border border-[#E2E8F0] overflow-hidden">
            <div class="p-5 bg-[#0F172A] text-white flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-wider text-purple-300 font-semibold">Apex Institute of Technology · Examination Blueprint</p>
                <h3 id="paper-preview-title" class="text-base font-bold mt-0.5">{{ pp.title }}</h3>
                <p class="text-xs text-slate-300 mt-0.5">
                  {{ pp.subjectName }} · Max Marks: {{ qpService.getPaperTotalMarks(pp) }} · Time: {{ pp.durationMinutes }} Mins
                </p>
              </div>
              <button
                type="button"
                (click)="previewPaper.set(null)"
                aria-label="Close modal"
                class="text-slate-300 hover:text-white p-1 cursor-pointer"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-5 overflow-y-auto space-y-5 flex-1">
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <strong>General Instructions:</strong> {{ pp.generalInstructions }}
              </div>

              @for (sec of pp.sections; track sec.id) {
                <div class="space-y-2.5">
                  <div class="border-b border-slate-200 pb-1.5">
                    <h4 class="font-bold text-slate-900 text-sm">{{ sec.name }}</h4>
                    <p class="text-[11px] text-slate-500">{{ sec.instructions }}</p>
                  </div>
                  @for (qId of sec.questionIds; track qId; let qIdx = $index) {
                    @let qObj = findQuestion(qId);
                    @if (qObj) {
                      <div class="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5 text-xs">
                        <div class="flex items-start justify-between gap-3">
                          <p class="font-semibold text-slate-900">Q{{ qIdx + 1 }}. {{ qObj.prompt }}</p>
                          <span class="font-bold text-[#6D42E8] shrink-0 tabular-nums">[{{ qObj.marks }}M]</span>
                        </div>
                        @if (qObj.options && qObj.options.length > 0) {
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-3 text-[11px] text-slate-600">
                            @for (opt of qObj.options; track opt; let oIdx = $index) {
                              <span>({{ optionLetter(oIdx) }}) {{ opt }}</span>
                            }
                          </div>
                        }
                      </div>
                    }
                  }
                </div>
              }
            </div>

            <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                (click)="downloadPaperPdf(pp, false)"
                class="px-4 py-2 rounded-xl bg-[#6D42E8] hover:bg-[#5b34cc] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="text-sm">picture_as_pdf</mat-icon>
                <span>Export Paper PDF</span>
              </button>
            </div>
          </div>
        </div>
      }

      <app-confirm-dialog
        [isOpen]="deleteTarget() !== null"
        [title]="deleteTarget()?.kind === 'paper' ? 'Delete Question Paper' : 'Delete Question'"
        [message]="deleteTarget()?.kind === 'paper' ? 'Are you sure you want to remove this question paper?' : 'Delete this question from the Question Bank?'"
        confirmLabel="Delete"
        (cancelled)="deleteTarget.set(null)"
        (confirmed)="executeDelete()"
      />
    </div>
  `
})
export class FacultyQuestionPapersPage {
  protected readonly facade = inject(FacultyPortalFacade);
  protected readonly qpService = inject(QuestionPaperService);
  private readonly academicService = inject(AcademicService);

  protected readonly activeTab = signal<'papers' | 'bank'>('papers');
  protected readonly paperSearch = signal<string>('');
  protected readonly paperSubjectFilter = signal<string>('');
  protected readonly questionSearch = signal<string>('');
  protected readonly questionSubjectFilter = signal<string>('');
  protected readonly questionTypeFilter = signal<string>('');

  protected readonly isQuestionDrawerOpen = signal<boolean>(false);
  protected readonly editingQuestionId = signal<string | null>(null);
  protected readonly questionError = signal<string>('');

  protected readonly isPaperDrawerOpen = signal<boolean>(false);
  protected readonly editingPaperId = signal<string | null>(null);
  protected readonly paperError = signal<string>('');
  protected readonly draftSections = signal<QuestionPaperSection[]>([]);

  protected readonly previewPaper = signal<QuestionPaper | null>(null);
  protected readonly deleteTarget = signal<{ kind: 'question' | 'paper'; id: string } | null>(null);

  protected readonly facultyExams = this.facade.facultyExams;

  protected readonly mySubjects = computed(() => {
    const map = new Map<string, { subjectId: string; subjectName: string; subjectCode: string; course: string; semester: string }>();
    for (const c of this.facade.myClasses()) {
      const id = c.subjectId || c.subject;
      if (!map.has(id)) {
        map.set(id, {
          subjectId: c.subjectId || 'sub-1',
          subjectName: c.subject,
          subjectCode: c.subjectCode,
          course: c.course,
          semester: c.semester
        });
      }
    }
    return Array.from(map.values());
  });

  protected readonly facultySubjectNames = computed(
    () => new Set(this.mySubjects().map(s => s.subjectName.toLowerCase()))
  );

  protected readonly facultyQuestions = computed(() => {
    const allowed = this.facultySubjectNames();
    return this.qpService.questions().filter(q => allowed.has(q.subjectName.toLowerCase()));
  });

  protected readonly facultyPapers = computed(() => {
    const allowed = this.facultySubjectNames();
    return this.qpService.papers().filter(p => allowed.has(p.subjectName.toLowerCase()));
  });

  protected readonly filteredPapers = computed(() => {
    const q = this.paperSearch().trim().toLowerCase();
    const sub = this.paperSubjectFilter().toLowerCase();
    return this.facultyPapers().filter(p => {
      if (sub && p.subjectName.toLowerCase() !== sub) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.subjectName.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected readonly filteredQuestions = computed(() => {
    const q = this.questionSearch().trim().toLowerCase();
    const sub = this.questionSubjectFilter().toLowerCase();
    const qType = this.questionTypeFilter();
    return this.facultyQuestions().filter(item => {
      if (sub && item.subjectName.toLowerCase() !== sub) return false;
      if (qType && item.type !== qType) return false;
      if (q && !item.prompt.toLowerCase().includes(q) && !item.topic.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected readonly availableQuestionsForPaper = computed(() => {
    const subId = this.paperForm.controls.subjectId.value;
    if (!subId) return this.facultyQuestions();
    const sub = this.mySubjects().find(s => s.subjectId === subId);
    if (!sub) return this.facultyQuestions();
    return this.facultyQuestions().filter(
      q => q.subjectId === subId || q.subjectName.toLowerCase() === sub.subjectName.toLowerCase()
    );
  });

  protected readonly draftPaperQuestionCount = computed(() => {
    const ids = new Set<string>();
    for (const sec of this.draftSections()) {
      for (const id of sec.questionIds) ids.add(id);
    }
    return ids.size;
  });

  protected readonly draftPaperMarks = computed(() => {
    const qMap = new Map(this.qpService.questions().map(q => [q.id, q]));
    let sum = 0;
    for (const sec of this.draftSections()) {
      for (const id of sec.questionIds) {
        sum += Number(qMap.get(id)?.marks) || 0;
      }
    }
    return sum;
  });

  protected readonly questionForm = new FormGroup({
    subjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<QuestionType>('MCQ', { nonNullable: true }),
    difficulty: new FormControl<QuestionDifficulty>('Medium', { nonNullable: true }),
    marks: new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    topic: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    prompt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    optionA: new FormControl('', { nonNullable: true }),
    optionB: new FormControl('', { nonNullable: true }),
    optionC: new FormControl('', { nonNullable: true }),
    optionD: new FormControl('', { nonNullable: true }),
    correctOptionKey: new FormControl<'A' | 'B' | 'C' | 'D'>('A', { nonNullable: true }),
    correctAnswer: new FormControl('', { nonNullable: true }),
    rubricHint: new FormControl('', { nonNullable: true })
  });

  protected readonly paperForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subjectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    examId: new FormControl('', { nonNullable: true }),
    durationMinutes: new FormControl(60, { nonNullable: true, validators: [Validators.required, Validators.min(10)] }),
    targetMaxMarks: new FormControl(20, { nonNullable: true, validators: [Validators.required, Validators.min(5)] }),
    status: new FormControl<'Draft' | 'Finalized'>('Draft', { nonNullable: true }),
    generalInstructions: new FormControl('All questions are compulsory. Support answers with clear reasoning.', {
      nonNullable: true
    })
  });

  protected readonly stats = computed<StatItem[]>(() => {
    const papers = this.facultyPapers();
    const finalized = papers.filter(p => p.status === 'Finalized').length;
    return [
      {
        label: 'Bank Questions',
        value: this.facultyQuestions().length,
        icon: 'quiz',
        iconColorClass: 'text-[#6D42E8]',
        iconBgClass: 'bg-purple-50 border-purple-100'
      },
      {
        label: 'Question Papers',
        value: papers.length,
        icon: 'description',
        iconColorClass: 'text-indigo-600',
        iconBgClass: 'bg-indigo-50 border-indigo-100'
      },
      {
        label: 'Finalized Blueprints',
        value: finalized,
        icon: 'verified',
        iconColorClass: 'text-emerald-600',
        iconBgClass: 'bg-emerald-50 border-emerald-100'
      }
    ];
  });

  protected onPaperSearchInput(event: Event): void {
    this.paperSearch.set((event.target as HTMLInputElement).value);
  }
  protected onPaperSubjectFilter(event: Event): void {
    this.paperSubjectFilter.set((event.target as HTMLSelectElement).value);
  }
  protected onQuestionSearchInput(event: Event): void {
    this.questionSearch.set((event.target as HTMLInputElement).value);
  }
  protected onQuestionSubjectFilter(event: Event): void {
    this.questionSubjectFilter.set((event.target as HTMLSelectElement).value);
  }
  protected onQuestionTypeFilter(event: Event): void {
    this.questionTypeFilter.set((event.target as HTMLSelectElement).value);
  }

  protected openCreateQuestion(): void {
    this.editingQuestionId.set(null);
    this.questionError.set('');
    this.questionForm.reset({
      subjectId: this.mySubjects()[0]?.subjectId || '',
      type: 'MCQ',
      difficulty: 'Medium',
      marks: 2,
      topic: '',
      prompt: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOptionKey: 'A',
      correctAnswer: '',
      rubricHint: ''
    });
    this.isQuestionDrawerOpen.set(true);
  }

  protected openEditQuestion(q: QuestionBankItem): void {
    this.editingQuestionId.set(q.id);
    this.questionError.set('');
    const opts = q.options ?? [];
    const correctIdx = opts.findIndex(o => o === q.correctAnswer);
    const key = (['A', 'B', 'C', 'D'][correctIdx] as 'A' | 'B' | 'C' | 'D') || 'A';

    this.questionForm.patchValue({
      subjectId: q.subjectId,
      type: q.type,
      difficulty: q.difficulty,
      marks: q.marks,
      topic: q.topic,
      prompt: q.prompt,
      optionA: opts[0] || '',
      optionB: opts[1] || '',
      optionC: opts[2] || '',
      optionD: opts[3] || '',
      correctOptionKey: key,
      correctAnswer: q.correctAnswer || '',
      rubricHint: q.rubricHint || ''
    });
    this.isQuestionDrawerOpen.set(true);
  }

  protected saveQuestion(): void {
    if (this.questionForm.invalid) {
      this.questionError.set('Please complete Subject, Topic, Marks, and Question Statement.');
      return;
    }
    const val = this.questionForm.getRawValue();
    const sub =
      this.mySubjects().find(s => s.subjectId === val.subjectId) ||
      this.academicService.subjects().find(s => s.id === val.subjectId);

    const subjectName = sub
      ? 'subjectName' in sub
        ? sub.subjectName
        : sub.name
      : 'Allocated Subject';

    let options: string[] | undefined;
    let correctAnswer = val.correctAnswer.trim();

    if (val.type === 'MCQ') {
      options = [val.optionA, val.optionB, val.optionC, val.optionD]
        .map(o => o.trim())
        .filter(Boolean);
      if (options.length < 2) {
        this.questionError.set('Please enter at least 2 MCQ options.');
        return;
      }
      const keyMap: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 1, C: 2, D: 3 };
      const chosen = [val.optionA, val.optionB, val.optionC, val.optionD][keyMap[val.correctOptionKey]]?.trim();
      correctAnswer = chosen || options[0];
    }

    const payload = {
      subjectId: val.subjectId,
      subjectName,
      topic: val.topic.trim(),
      type: val.type,
      difficulty: val.difficulty,
      marks: Number(val.marks),
      prompt: val.prompt.trim(),
      options,
      correctAnswer: correctAnswer || undefined,
      rubricHint: val.rubricHint.trim() || undefined,
      createdBy: this.facade.currentFaculty().name
    };

    if (this.editingQuestionId()) {
      this.qpService.updateQuestion(this.editingQuestionId()!, payload);
    } else {
      this.qpService.addQuestion(payload);
    }
    this.isQuestionDrawerOpen.set(false);
  }

  protected openCreatePaper(): void {
    this.editingPaperId.set(null);
    this.paperError.set('');
    const defaultSub = this.mySubjects()[0];
    this.paperForm.reset({
      title: '',
      subjectId: defaultSub?.subjectId || '',
      examId: '',
      durationMinutes: 60,
      targetMaxMarks: 20,
      status: 'Draft',
      generalInstructions: 'All questions are compulsory. Write clear step-by-step justifications.'
    });
    this.draftSections.set([
      {
        id: `sec-${Date.now()}-1`,
        name: 'Section A — Objective Questions',
        instructions: 'Attempt all multiple-choice questions.',
        questionIds: []
      },
      {
        id: `sec-${Date.now()}-2`,
        name: 'Section B — Analytical & Descriptive',
        instructions: 'Answer with supporting diagrams or derivations.',
        questionIds: []
      }
    ]);
    this.isPaperDrawerOpen.set(true);
  }

  protected openEditPaper(paper: QuestionPaper): void {
    this.editingPaperId.set(paper.id);
    this.paperError.set('');
    this.paperForm.patchValue({
      title: paper.title,
      subjectId: paper.subjectId,
      examId: paper.examId || '',
      durationMinutes: paper.durationMinutes,
      targetMaxMarks: paper.targetMaxMarks,
      status: paper.status,
      generalInstructions: paper.generalInstructions
    });
    this.draftSections.set(
      paper.sections.map(s => ({
        ...s,
        questionIds: [...s.questionIds]
      }))
    );
    this.isPaperDrawerOpen.set(true);
  }

  protected onPaperSubjectChanged(): void {
    this.draftSections.update(secs => secs.map(s => ({ ...s, questionIds: [] })));
  }

  protected onLinkedExamChanged(): void {
    const examId = this.paperForm.controls.examId.value;
    const exam = this.facultyExams().find(e => e.id === examId);
    if (!exam) return;
    this.paperForm.patchValue({
      subjectId: exam.subjectId,
      durationMinutes: exam.duration,
      targetMaxMarks: exam.maxMarks,
      title: this.paperForm.controls.title.value || `${exam.title} — ${exam.subjectName}`
    });
  }

  protected addPaperSection(): void {
    this.draftSections.update(list => [
      ...list,
      {
        id: `sec-${Date.now()}`,
        name: `Section ${String.fromCharCode(65 + list.length)}`,
        instructions: 'Answer all questions in this section.',
        questionIds: []
      }
    ]);
  }

  protected removePaperSection(sectionId: string): void {
    this.draftSections.update(list => list.filter(s => s.id !== sectionId));
  }

  protected updateSectionField(sectionId: string, field: 'name' | 'instructions', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.draftSections.update(list =>
      list.map(s => (s.id === sectionId ? { ...s, [field]: val } : s))
    );
  }

  protected toggleQuestionInSection(sectionId: string, questionId: string): void {
    this.draftSections.update(list =>
      list.map(sec => {
        if (sec.id !== sectionId) return sec;
        const exists = sec.questionIds.includes(questionId);
        return {
          ...sec,
          questionIds: exists
            ? sec.questionIds.filter(id => id !== questionId)
            : [...sec.questionIds, questionId]
        };
      })
    );
  }

  protected savePaper(): void {
    if (this.paperForm.invalid) {
      this.paperError.set('Please enter Question Paper Title, Subject, Duration, and Target Marks.');
      return;
    }

    if (this.draftPaperQuestionCount() === 0) {
      this.paperError.set('Select at least one question into a paper section.');
      return;
    }

    const val = this.paperForm.getRawValue();
    const sub = this.mySubjects().find(s => s.subjectId === val.subjectId);
    const linkedExam = this.facultyExams().find(e => e.id === val.examId);

    const payload: Omit<QuestionPaper, 'id' | 'updatedAt'> = {
      title: val.title.trim(),
      examId: linkedExam?.id,
      examTitle: linkedExam?.title,
      subjectId: val.subjectId,
      subjectName: sub?.subjectName || linkedExam?.subjectName || 'Subject',
      courseName: sub?.course || linkedExam?.courseName || 'Master of Computer Applications',
      semester: sub?.semester || linkedExam?.semester || 'Semester 2',
      durationMinutes: Number(val.durationMinutes),
      targetMaxMarks: Number(val.targetMaxMarks),
      generalInstructions: val.generalInstructions.trim(),
      sections: this.draftSections().map(s => ({
        ...s,
        name: s.name.trim() || 'Section',
        instructions: s.instructions.trim()
      })),
      status: val.status,
      createdBy: this.facade.currentFaculty().name
    };

    if (this.editingPaperId()) {
      this.qpService.updatePaper(this.editingPaperId()!, payload);
    } else {
      this.qpService.createPaper(payload);
    }
    this.isPaperDrawerOpen.set(false);
  }

  protected findQuestion(id: string): QuestionBankItem | undefined {
    return this.qpService.questions().find(q => q.id === id);
  }

  protected optionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  protected confirmDeleteQuestion(q: QuestionBankItem): void {
    this.deleteTarget.set({ kind: 'question', id: q.id });
  }

  protected confirmDeletePaper(paper: QuestionPaper): void {
    this.deleteTarget.set({ kind: 'paper', id: paper.id });
  }

  protected executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    if (target.kind === 'question') {
      this.qpService.deleteQuestion(target.id);
    } else {
      this.qpService.deletePaper(target.id);
    }
    this.deleteTarget.set(null);
  }

  protected downloadPaperPdf(paper: QuestionPaper, includeKey: boolean): void {
    const rows: (string | number)[][] = [];
    for (const sec of paper.sections) {
      sec.questionIds.forEach((qId, idx) => {
        const q = this.findQuestion(qId);
        if (!q) return;
        const optsText =
          q.options && q.options.length > 0
            ? '\n' + q.options.map((o, i) => `(${this.optionLetter(i)}) ${o}`).join('  |  ')
            : '';
        if (includeKey) {
          rows.push([
            sec.name,
            `Q${idx + 1}`,
            q.type,
            q.prompt + optsText,
            q.marks,
            q.correctAnswer || q.rubricHint || 'Evaluate per rubric'
          ]);
        } else {
          rows.push([sec.name, `Q${idx + 1}`, q.type, q.topic, q.prompt + optsText, q.marks]);
        }
      });
    }

    const cols = includeKey
      ? ['Section', 'Q#', 'Type', 'Question', 'Marks', 'Model Answer / Key']
      : ['Section', 'Q#', 'Type', 'Topic', 'Question', 'Marks'];

    exportToPdf(
      `${includeKey ? 'ANSWER KEY — ' : ''}${paper.title}`,
      cols,
      rows,
      `${paper.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${includeKey ? '-answer-key' : '-question-paper'}`,
      [
        `Subject: ${paper.subjectName} | Program: ${paper.courseName} · ${paper.semester}`,
        `Prepared By: ${paper.createdBy} | Max Marks: ${this.qpService.getPaperTotalMarks(paper)} | Duration: ${paper.durationMinutes} mins`,
        `Instructions: ${paper.generalInstructions}`
      ]
    );
  }
}
