import crypto from 'node:crypto';
import { Request, Response } from 'express';

interface StudyTodo {
  id: string;
  text: string;
  done: boolean;
}

interface WorkspaceState {
  targetGpa: number;
  todos: StudyTodo[];
}

function normalizeStudentKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().slice(0, 160);
}

const DEFAULT_STARTER_TASKS: readonly { text: string; done: boolean }[] = [
  { text: 'Complete Advanced Algorithms assignment draft', done: true },
  { text: 'Revise Software Architecture notes for Unit 3', done: false },
  { text: 'Verify biometrics attendance sync for current week', done: false }
];

const workspaceStore = new Map<string, WorkspaceState>();

function getOrCreateWorkspace(studentKey: string): WorkspaceState {
  let state = workspaceStore.get(studentKey);
  if (!state) {
    state = {
      targetGpa: 8.5,
      todos: DEFAULT_STARTER_TASKS.map(t => ({
        id: `todo-${crypto.randomUUID().slice(0, 10)}`,
        text: t.text,
        done: t.done
      }))
    };
    workspaceStore.set(studentKey, state);
  }
  return state;
}

export const getWorkspaceState = async (req: Request, res: Response): Promise<void> => {
  const studentKey = normalizeStudentKey(req.query['studentKey']);
  if (!studentKey) {
    res.status(400).json({ success: false, message: 'studentKey query parameter is required.' });
    return;
  }

  const state = getOrCreateWorkspace(studentKey);
  res.json({
    success: true,
    data: {
      studentKey,
      targetGpa: state.targetGpa,
      todos: state.todos
    }
  });
};

export const createStudyTask = async (req: Request, res: Response): Promise<void> => {
  const body = (req.body ?? {}) as { studentKey?: unknown; text?: unknown };
  const studentKey = normalizeStudentKey(body.studentKey);
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 240) : '';

  if (!studentKey || !text) {
    res.status(400).json({ success: false, message: 'studentKey and non-empty text are required.' });
    return;
  }

  const state = getOrCreateWorkspace(studentKey);
  const item: StudyTodo = {
    id: `todo-${crypto.randomUUID().slice(0, 10)}`,
    text,
    done: false
  };
  state.todos.unshift(item);
  res.status(201).json({ success: true, data: item });
};

export const updateStudyTask = async (req: Request, res: Response): Promise<void> => {
  const id = typeof req.params['id'] === 'string' ? req.params['id'].trim() : '';
  const body = (req.body ?? {}) as { studentKey?: unknown; done?: unknown };
  const studentKey = normalizeStudentKey(body.studentKey);

  if (!id || !studentKey || typeof body.done !== 'boolean') {
    res.status(400).json({ success: false, message: 'Task id, studentKey, and boolean done flag are required.' });
    return;
  }

  const state = getOrCreateWorkspace(studentKey);
  const target = state.todos.find(t => t.id === id);
  if (!target) {
    res.status(404).json({ success: false, message: 'Study task not found.' });
    return;
  }

  target.done = body.done;
  res.json({ success: true, data: target });
};

export const deleteStudyTask = async (req: Request, res: Response): Promise<void> => {
  const id = typeof req.params['id'] === 'string' ? req.params['id'].trim() : '';
  const studentKey = normalizeStudentKey(req.query['studentKey']);

  if (!id || !studentKey) {
    res.status(400).json({ success: false, message: 'Task id and studentKey query parameter are required.' });
    return;
  }

  const state = getOrCreateWorkspace(studentKey);
  const idx = state.todos.findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Study task not found.' });
    return;
  }

  state.todos.splice(idx, 1);
  res.json({ success: true, id });
};

export const updateAcademicGoal = async (req: Request, res: Response): Promise<void> => {
  const body = (req.body ?? {}) as { studentKey?: unknown; targetGpa?: unknown };
  const studentKey = normalizeStudentKey(body.studentKey);
  const rawGpa = Number(body.targetGpa);

  if (!studentKey || Number.isNaN(rawGpa)) {
    res.status(400).json({ success: false, message: 'studentKey and numeric targetGpa are required.' });
    return;
  }

  const targetGpa = Math.round(Math.min(10.0, Math.max(6.0, rawGpa)) * 10) / 10;
  const state = getOrCreateWorkspace(studentKey);
  state.targetGpa = targetGpa;

  res.json({
    success: true,
    data: {
      studentKey,
      targetGpa: state.targetGpa
    }
  });
};
