-- ============================================
-- Phase 3: Advanced Organization Migration
-- ============================================
-- 1. Create Subtasks Table
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Enable RLS for subtasks
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
-- RLS Policies for subtasks (Users can only access subtasks of their own tasks)
-- Since subtasks link to daily_tasks, which link to agendas, which link to user...
-- We need to traverse: subtasks -> daily_tasks -> agendas -> user_id
CREATE POLICY "Users can view their own subtasks" ON subtasks FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM daily_tasks
                JOIN agendas ON daily_tasks.agenda_id = agendas.id
            WHERE daily_tasks.id = subtasks.task_id
                AND agendas.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert their own subtasks" ON subtasks FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM daily_tasks
                JOIN agendas ON daily_tasks.agenda_id = agendas.id
            WHERE daily_tasks.id = subtasks.task_id
                AND agendas.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update their own subtasks" ON subtasks FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM daily_tasks
                JOIN agendas ON daily_tasks.agenda_id = agendas.id
            WHERE daily_tasks.id = subtasks.task_id
                AND agendas.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM daily_tasks
                JOIN agendas ON daily_tasks.agenda_id = agendas.id
            WHERE daily_tasks.id = subtasks.task_id
                AND agendas.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete their own subtasks" ON subtasks FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM daily_tasks
            JOIN agendas ON daily_tasks.agenda_id = agendas.id
        WHERE daily_tasks.id = subtasks.task_id
            AND agendas.user_id = auth.uid()
    )
);
-- 2. Update Agendas Table for Custom Recurrence
-- Adding recurrence_pattern using a check constraint for enum-like behavior
ALTER TABLE agendas
ADD COLUMN recurrence_pattern TEXT CHECK (
        recurrence_pattern IN ('DAILY', 'WEEKLY', 'WEEKDAYS', 'CUSTOM')
    );
-- Defaulting existing rows to 'DAILY' to maintain backward compatibility
UPDATE agendas
SET recurrence_pattern = 'DAILY'
WHERE recurrence_pattern IS NULL;
-- Adding recurrence_days for custom days (stored as array of integers, 0=Sunday, 6=Saturday)
ALTER TABLE agendas
ADD COLUMN recurrence_days INTEGER [];