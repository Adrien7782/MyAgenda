import type { Attachment, SubTask, Task, TaskPatch } from '../../domain/task/task';
import type { TaskRepository } from '../../services/ports';
import { getDb, nullsToUndefined } from './database';

const PATCHABLE = ['title', 'comment', 'deadline', 'status', 'priority', 'tags', 'recurrence', 'recurrence_interval', 'event_id', 'reminder_offset_min', 'reminder_at'] as const;
const TASK_COLUMNS = 'id, title, comment, deadline, status, priority, tags, recurrence, recurrence_interval, event_id, reminder_offset_min, reminder_at, is_deleted, created_at, updated_at';
const taskValues = (t: Task) => [t.id, t.title, t.comment ?? null, t.deadline ?? null, t.status, t.priority ?? null, t.tags ?? null,
  t.recurrence ?? 'none', t.recurrence_interval ?? 1, t.event_id ?? null, t.reminder_offset_min ?? null, t.reminder_at ?? null, t.is_deleted, t.created_at, t.updated_at];

export class SqliteTaskRepository implements TaskRepository {
  async listAll(): Promise<Task[]> {
    return this.query('SELECT * FROM tasks WHERE is_deleted < 2 ORDER BY created_at DESC');
  }

  async listChangedSince(since: string): Promise<Task[]> {
    return this.query('SELECT * FROM tasks WHERE updated_at > ? ORDER BY updated_at ASC', [since]);
  }

  private async query(sql: string, params: unknown[] = []): Promise<Task[]> {
    const db = await getDb();
    const tasks = await db.select<Task[]>(sql, params);
    const subtasks = await db.select<SubTask[]>('SELECT * FROM subtasks ORDER BY position ASC');
    const byTask = new Map<string, SubTask[]>();
    for (const st of subtasks) {
      if (!byTask.has(st.task_id)) byTask.set(st.task_id, []);
      byTask.get(st.task_id)!.push(st);
    }
    return tasks.map((t) => ({ ...nullsToUndefined(t), subtasks: byTask.get(t.id) ?? [] }));
  }

  async insert(t: Task): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT INTO tasks (${TASK_COLUMNS}) VALUES (${TASK_COLUMNS.split(',').map(() => '?').join(', ')})`,
      taskValues(t),
    );
  }

  async update(id: string, patch: TaskPatch, updatedAt: string): Promise<void> {
    const fields = PATCHABLE.filter((k) => k in patch);
    if (fields.length === 0) return;
    const db = await getDb();
    const sets = [...fields.map((f) => `${f} = ?`), 'updated_at = ?'].join(', ');
    const values = [...fields.map((f) => patch[f] ?? null), updatedAt, id];
    await db.execute(`UPDATE tasks SET ${sets} WHERE id = ?`, values);
  }

  async setDeleted(id: string, deleted: boolean, updatedAt: string): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE tasks SET is_deleted = ?, updated_at = ? WHERE id = ?', [deleted ? 1 : 0, updatedAt, id]);
  }

  async purge(id: string, updatedAt: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM subtasks WHERE task_id = ?', [id]);
    await db.execute('DELETE FROM attachments WHERE task_id = ?', [id]);
    // Pierre tombale : le titre est vidé, seule la trace de suppression est conservée.
    await db.execute("UPDATE tasks SET is_deleted = 2, title = '', comment = NULL, updated_at = ? WHERE id = ?", [updatedAt, id]);
  }

  async upsert(t: Task): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO tasks (${TASK_COLUMNS}) VALUES (${TASK_COLUMNS.split(',').map(() => '?').join(', ')})`,
      taskValues(t),
    );
    if (t.subtasks) {
      await db.execute('DELETE FROM subtasks WHERE task_id = ?', [t.id]);
      for (const st of t.subtasks) await this.insertSubtask({ ...st, task_id: t.id });
    }
  }

  async insertSubtask(st: SubTask): Promise<void> {
    const db = await getDb();
    await db.execute(
      'INSERT OR REPLACE INTO subtasks (id, task_id, title, is_done, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [st.id, st.task_id, st.title, st.is_done, st.position, st.created_at],
    );
  }

  async updateSubtask(id: string, patch: Partial<Pick<SubTask, 'title' | 'is_done' | 'position'>>): Promise<void> {
    const fields = (['title', 'is_done', 'position'] as const).filter((k) => k in patch);
    if (fields.length === 0) return;
    const db = await getDb();
    await db.execute(
      `UPDATE subtasks SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
      [...fields.map((f) => patch[f]), id],
    );
  }

  async deleteSubtask(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM subtasks WHERE id = ?', [id]);
  }

  async listAttachments(taskId: string): Promise<Attachment[]> {
    const db = await getDb();
    return db.select<Attachment[]>('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at ASC', [taskId]);
  }

  async insertAttachment(a: Attachment): Promise<void> {
    const db = await getDb();
    await db.execute(
      'INSERT INTO attachments (id, task_id, file_name, file_type, file_size, storage_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.task_id, a.file_name, a.file_type, a.file_size, a.storage_path, a.created_at],
    );
  }

  async deleteAttachment(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM attachments WHERE id = ?', [id]);
  }
}
