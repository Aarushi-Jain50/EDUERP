import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { studentAcademicGoals, studentStudyTasks } from '../../../src/db/schema.ts';

function normalizeStudentKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().slice(0, 160);
}

const DEFAULT_STARTER_TASKS: readonly { text: string; done: boolean }[] = [
  { text: 'Complete Advanced Algorithms assignment draft', done: true },
  { text: 'Revise Software Architecture notes for Unit 3', done: false },
  { text: 'Verify biometrics attendance sync for current week', done: false }
];

export const getWorkspaceState = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentKey = normalizeStudentKey(req.query['studentKey']);
    if (!studentKey) {
      res.status(400).json({ success: false, message: 'studentKey query parameter is required.' });
      return;
    }

    let goals = await db
      .select()
      .from(studentAcademicGoals)
      .where(eq(studentAcademicGoals.studentKey, studentKey))
      .limit(1);

    if (goals.length === 0) {
      await db
        .insert(studentAcademicGoals)
        .values({ studentKey, targetGpa: 8.5 })
        .onConflictDoNothing({ target: studentAcademicGoals.studentKey });

      const existingTasks = await db
        .select({ id: studentStudyTasks.id })
        .from(studentStudyTasks)
        .where(eq(studentStudyTasks.studentKey, studentKey))
        .limit(1);

      if (existingTasks.length === 0) {
        const now = Date.now();
        await db.insert(studentStudyTasks).values(
          DEFAULT_STARTER_TASKS.map((task, idx) => ({
            id: `todo-${crypto.randomUUID().slice(0, 10)}`,
            studentKey,
            text: task.text,
            done: task.done,
            createdAt: new Date(now - idx * 1000)
          }))
        );
      }

      goals = await db
        .select()
        .from(studentAcademicGoals)
        .where(eq(studentAcademicGoals.studentKey, studentKey))
        .limit(1);
    }

    const todos = await db
      .select({
        id: studentStudyTasks.id,
        text: studentStudyTasks.text,
        done: studentStudyTasks.done
      })
      .from(studentStudyTasks)
      .where(eq(studentStudyTasks.studentKey, studentKey))
      .orderBy(desc(studentStudyTasks.createdAt));

    res.json({
      success: true,
      data: {
        studentKey,
        targetGpa: goals[0]?.targetGpa ?? 8.5,
        todos
      }
    });
  } catch (error) {
    console.error('Error loading student workspace from Cloud SQL:', error);
    res.status(500).json({ success: false, message: 'Failed to load student workspace from Cloud SQL.' });
  }
};

export const createStudyTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as { studentKey?: unknown; text?: unknown };
    const studentKey = normalizeStudentKey(body.studentKey);
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 240) : '';

    if (!studentKey || !text) {
      res.status(400).json({ success: false, message: 'studentKey and non-empty text are required.' });
      return;
    }

    const id = `todo-${crypto.randomUUID().slice(0, 10)}`;
    const inserted = await db
      .insert(studentStudyTasks)
      .values({
        id,
        studentKey,
        text,
        done: false
      })
      .returning({
        id: studentStudyTasks.id,
        text: studentStudyTasks.text,
        done: studentStudyTasks.done
      });

    res.status(201).json({ success: true, data: inserted[0] });
  } catch (error) {
    console.error('Error creating student task in Cloud SQL:', error);
    res.status(500).json({ success: false, message: 'Failed to save study task.' });
  }
};

export const updateStudyTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params['id'] === 'string' ? req.params['id'].trim() : '';
    const body = (req.body ?? {}) as { studentKey?: unknown; done?: unknown };
    const studentKey = normalizeStudentKey(body.studentKey);

    if (!id || !studentKey || typeof body.done !== 'boolean') {
      res.status(400).json({ success: false, message: 'Task id, studentKey, and boolean done flag are required.' });
      return;
    }

    const updated = await db
      .update(studentStudyTasks)
      .set({ done: body.done })
      .where(and(eq(studentStudyTasks.id, id), eq(studentStudyTasks.studentKey, studentKey)))
      .returning({
        id: studentStudyTasks.id,
        text: studentStudyTasks.text,
        done: studentStudyTasks.done
      });

    if (updated.length === 0) {
      res.status(404).json({ success: false, message: 'Study task not found.' });
      return;
    }

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Error updating student task in Cloud SQL:', error);
    res.status(500).json({ success: false, message: 'Failed to update study task.' });
  }
};

export const deleteStudyTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params['id'] === 'string' ? req.params['id'].trim() : '';
    const studentKey = normalizeStudentKey(req.query['studentKey']);

    if (!id || !studentKey) {
      res.status(400).json({ success: false, message: 'Task id and studentKey query parameter are required.' });
      return;
    }

    const deleted = await db
      .delete(studentStudyTasks)
      .where(and(eq(studentStudyTasks.id, id), eq(studentStudyTasks.studentKey, studentKey)))
      .returning({ id: studentStudyTasks.id });

    if (deleted.length === 0) {
      res.status(404).json({ success: false, message: 'Study task not found.' });
      return;
    }

    res.json({ success: true, id: deleted[0].id });
  } catch (error) {
    console.error('Error deleting student task from Cloud SQL:', error);
    res.status(500).json({ success: false, message: 'Failed to delete study task.' });
  }
};

export const updateAcademicGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as { studentKey?: unknown; targetGpa?: unknown };
    const studentKey = normalizeStudentKey(body.studentKey);
    const rawGpa = Number(body.targetGpa);

    if (!studentKey || Number.isNaN(rawGpa)) {
      res.status(400).json({ success: false, message: 'studentKey and numeric targetGpa are required.' });
      return;
    }

    const targetGpa = Math.round(Math.min(10.0, Math.max(6.0, rawGpa)) * 10) / 10;

    const saved = await db
      .insert(studentAcademicGoals)
      .values({ studentKey, targetGpa, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: studentAcademicGoals.studentKey,
        set: { targetGpa, updatedAt: new Date() }
      })
      .returning({
        studentKey: studentAcademicGoals.studentKey,
        targetGpa: studentAcademicGoals.targetGpa
      });

    res.json({ success: true, data: saved[0] });
  } catch (error) {
    console.error('Error saving GPA goal to Cloud SQL:', error);
    res.status(500).json({ success: false, message: 'Failed to save GPA target.' });
  }
};
