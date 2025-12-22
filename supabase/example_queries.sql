-- ============================================
-- Goal Coach App - Example SQL Queries
-- ============================================
-- This file contains example queries for common operations
-- These can be used as reference or executed directly in Supabase SQL Editor

-- ============================================
-- AGENDA QUERIES
-- ============================================

-- Create a numeric goal (e.g., "Read 500 pages in 25 days")
INSERT INTO agendas (
  user_id,
  title,
  type,
  total_target,
  unit,
  target_val,
  start_date,
  status
) VALUES (
  auth.uid(),
  'Read 500 pages',
  'NUMERIC',
  500,
  'pages',
  20, -- 500 pages / 25 days = 20 pages per day
  CURRENT_DATE,
  'ACTIVE'
);

-- Create a boolean habit (e.g., "Go to gym daily")
INSERT INTO agendas (
  user_id,
  title,
  type,
  buffer_tokens,
  target_val,
  start_date,
  status
) VALUES (
  auth.uid(),
  'Go to gym',
  'BOOLEAN',
  3, -- 3 "life happens" tokens per month
  1, -- Boolean = 1
  CURRENT_DATE,
  'ACTIVE'
);

-- Get all agendas for current user
SELECT * FROM agendas
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Get only active agendas
SELECT * FROM agendas
WHERE user_id = auth.uid()
  AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- Update agenda status to completed
UPDATE agendas
SET status = 'COMPLETED'
WHERE id = 'your-agenda-id'
  AND user_id = auth.uid();

-- ============================================
-- DAILY TASK QUERIES
-- ============================================

-- Create a daily task for today
INSERT INTO daily_tasks (
  agenda_id,
  scheduled_date,
  target_val,
  actual_val,
  status
) VALUES (
  'your-agenda-id',
  CURRENT_DATE,
  20, -- target value
  0,  -- actual value (start at 0)
  'PENDING'
);

-- Mark task as completed
UPDATE daily_tasks
SET 
  actual_val = 25,
  status = 'COMPLETED',
  mood = '🙂'
WHERE id = 'your-task-id';

-- Mark task as partial completion (for numeric goals)
UPDATE daily_tasks
SET 
  actual_val = 15,
  status = 'PARTIAL',
  note = 'Read 15 out of 20 pages today'
WHERE id = 'your-task-id';

-- Use buffer token for a skipped task
UPDATE daily_tasks
SET 
  status = 'SKIPPED_WITH_BUFFER',
  failure_tag = 'Tired',
  note = 'Too tired to go to gym'
WHERE id = 'your-task-id';
-- Note: Buffer tokens will be automatically decremented by trigger

-- Mark task as failed (no buffer token used)
UPDATE daily_tasks
SET 
  status = 'FAILED',
  failure_tag = 'Work Overload',
  note = 'Had to work late'
WHERE id = 'your-task-id';

-- Get all tasks for today
SELECT 
  dt.*,
  a.title AS agenda_title,
  a.type AS agenda_type
FROM daily_tasks dt
INNER JOIN agendas a ON dt.agenda_id = a.id
WHERE a.user_id = auth.uid()
  AND dt.scheduled_date = CURRENT_DATE
ORDER BY a.title;

-- Get tasks for a specific date range
SELECT 
  dt.*,
  a.title AS agenda_title,
  a.type AS agenda_type
FROM daily_tasks dt
INNER JOIN agendas a ON dt.agenda_id = a.id
WHERE a.user_id = auth.uid()
  AND dt.scheduled_date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY dt.scheduled_date ASC, a.title ASC;

-- Get tasks by status
SELECT 
  dt.*,
  a.title AS agenda_title
FROM daily_tasks dt
INNER JOIN agendas a ON dt.agenda_id = a.id
WHERE a.user_id = auth.uid()
  AND dt.status = 'COMPLETED'
ORDER BY dt.scheduled_date DESC;

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- Get completion rate for an agenda
SELECT 
  a.title,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE dt.status = 'COMPLETED') AS completed_tasks,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE dt.status = 'COMPLETED') / COUNT(*),
    2
  ) AS completion_rate
FROM agendas a
LEFT JOIN daily_tasks dt ON a.id = dt.agenda_id
WHERE a.user_id = auth.uid()
  AND a.id = 'your-agenda-id'
GROUP BY a.id, a.title;

-- Get failure tag statistics
SELECT 
  failure_tag,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM daily_tasks dt
INNER JOIN agendas a ON dt.agenda_id = a.id
WHERE a.user_id = auth.uid()
  AND dt.failure_tag IS NOT NULL
  AND dt.failure_tag != 'NONE'
GROUP BY failure_tag
ORDER BY count DESC;

-- Get mood distribution
SELECT 
  mood,
  COUNT(*) AS count
FROM daily_tasks dt
INNER JOIN agendas a ON dt.agenda_id = a.id
WHERE a.user_id = auth.uid()
  AND dt.mood IS NOT NULL
GROUP BY mood
ORDER BY count DESC;

-- Get buffer token usage
SELECT 
  a.title,
  a.buffer_tokens AS remaining_tokens,
  COUNT(*) FILTER (WHERE dt.status = 'SKIPPED_WITH_BUFFER') AS tokens_used
FROM agendas a
LEFT JOIN daily_tasks dt ON a.id = dt.agenda_id
WHERE a.user_id = auth.uid()
  AND a.type = 'BOOLEAN'
GROUP BY a.id, a.title, a.buffer_tokens;

-- Get tasks that were recalculated (for numeric goals)
SELECT 
  dt.*,
  a.title AS agenda_title
FROM daily_tasks dt
INNER JOIN agendas a ON dt.agenda_id = a.id
WHERE a.user_id = auth.uid()
  AND dt.was_recalculated = TRUE
ORDER BY dt.scheduled_date DESC;

-- ============================================
-- HELPER FUNCTION USAGE
-- ============================================

-- Use helper function to get active agendas
SELECT * FROM get_user_active_agendas();

-- Use helper function to get tasks by date range
SELECT * FROM get_tasks_by_date_range(
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '7 days'
);

-- ============================================
-- CLEANUP QUERIES (Use with caution!)
-- ============================================

-- Delete a specific agenda (will cascade delete all tasks)
DELETE FROM agendas
WHERE id = 'your-agenda-id'
  AND user_id = auth.uid();

-- Delete tasks older than 90 days
DELETE FROM daily_tasks
WHERE scheduled_date < CURRENT_DATE - INTERVAL '90 days'
  AND EXISTS (
    SELECT 1 FROM agendas
    WHERE agendas.id = daily_tasks.agenda_id
      AND agendas.user_id = auth.uid()
  );

