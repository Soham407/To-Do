-- ============================================
-- Goal Coach App - Supabase Database Schema
-- ============================================
-- This file contains all SQL queries needed to set up the database
-- including tables, enums, RLS policies, and indexes.

-- ============================================
-- 1. CREATE ENUMS
-- ============================================

-- Agenda Type Enum
CREATE TYPE agenda_type AS ENUM ('NUMERIC', 'BOOLEAN');

-- Task Status Enum
CREATE TYPE task_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'PARTIAL',
  'SKIPPED_WITH_BUFFER',
  'FAILED'
);

-- Failure Tag Enum
CREATE TYPE failure_tag AS ENUM (
  'Sick',
  'Work Overload',
  'Tired',
  'Distracted',
  'Other',
  'NONE'
);

-- Agenda Status Enum
CREATE TYPE agenda_status AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'FAILED'
);

-- Note: Mood is stored as TEXT to support emoji values
-- Valid values: '😢', '😕', '😐', '🙂', '🤩'

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Agendas Table (Goals)
CREATE TABLE agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type agenda_type NOT NULL,
  buffer_tokens INTEGER NOT NULL DEFAULT 3,
  total_target INTEGER, -- For numeric goals (e.g., "Read 500 pages")
  unit TEXT, -- e.g., "pages", "minutes", "hours"
  target_val INTEGER, -- Daily target value
  frequency TEXT NOT NULL DEFAULT 'daily', -- MVP assumes daily
  start_date DATE NOT NULL,
  status agenda_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily Tasks Table
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  target_val INTEGER NOT NULL, -- 1 for boolean, N for numeric
  actual_val INTEGER NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'PENDING',
  failure_tag failure_tag,
  note TEXT,
  mood TEXT CHECK (mood IN ('😢', '😕', '😐', '🙂', '🤩') OR mood IS NULL),
  was_recalculated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one task per agenda per date
  UNIQUE(agenda_id, scheduled_date)
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

-- Indexes for agendas table
CREATE INDEX idx_agendas_user_id ON agendas(user_id);
CREATE INDEX idx_agendas_status ON agendas(status);
CREATE INDEX idx_agendas_user_status ON agendas(user_id, status);

-- Indexes for daily_tasks table
CREATE INDEX idx_daily_tasks_agenda_id ON daily_tasks(agenda_id);
CREATE INDEX idx_daily_tasks_scheduled_date ON daily_tasks(scheduled_date);
CREATE INDEX idx_daily_tasks_status ON daily_tasks(status);
CREATE INDEX idx_daily_tasks_agenda_date ON daily_tasks(agenda_id, scheduled_date);
CREATE INDEX idx_daily_tasks_failure_tag ON daily_tasks(failure_tag) WHERE failure_tag IS NOT NULL;

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agendas table
CREATE TRIGGER update_agendas_updated_at
  BEFORE UPDATE ON agendas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for daily_tasks table
CREATE TRIGGER update_daily_tasks_updated_at
  BEFORE UPDATE ON daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on agendas table
ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;

-- Enable RLS on daily_tasks table
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for Agendas
-- ============================================

-- Users can view their own agendas
CREATE POLICY "Users can view their own agendas"
  ON agendas
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own agendas
CREATE POLICY "Users can insert their own agendas"
  ON agendas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own agendas
CREATE POLICY "Users can update their own agendas"
  ON agendas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own agendas
CREATE POLICY "Users can delete their own agendas"
  ON agendas
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies for Daily Tasks
-- ============================================

-- Users can view their own daily tasks (via agenda ownership)
CREATE POLICY "Users can view their own daily tasks"
  ON daily_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agendas
      WHERE agendas.id = daily_tasks.agenda_id
      AND agendas.user_id = auth.uid()
    )
  );

-- Users can insert their own daily tasks (via agenda ownership)
CREATE POLICY "Users can insert their own daily tasks"
  ON daily_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agendas
      WHERE agendas.id = daily_tasks.agenda_id
      AND agendas.user_id = auth.uid()
    )
  );

-- Users can update their own daily tasks (via agenda ownership)
CREATE POLICY "Users can update their own daily tasks"
  ON daily_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agendas
      WHERE agendas.id = daily_tasks.agenda_id
      AND agendas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agendas
      WHERE agendas.id = daily_tasks.agenda_id
      AND agendas.user_id = auth.uid()
    )
  );

-- Users can delete their own daily tasks (via agenda ownership)
CREATE POLICY "Users can delete their own daily tasks"
  ON daily_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agendas
      WHERE agendas.id = daily_tasks.agenda_id
      AND agendas.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. HELPER FUNCTIONS (Optional but useful)
-- ============================================

-- Function to get user's active agendas
CREATE OR REPLACE FUNCTION get_user_active_agendas()
RETURNS TABLE (
  id UUID,
  title TEXT,
  type agenda_type,
  buffer_tokens INTEGER,
  total_target INTEGER,
  unit TEXT,
  target_val INTEGER,
  frequency TEXT,
  start_date DATE,
  status agenda_status,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.type,
    a.buffer_tokens,
    a.total_target,
    a.unit,
    a.target_val,
    a.frequency,
    a.start_date,
    a.status,
    a.created_at,
    a.updated_at
  FROM agendas a
  WHERE a.user_id = auth.uid()
    AND a.status = 'ACTIVE'
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tasks for a specific date range
CREATE OR REPLACE FUNCTION get_tasks_by_date_range(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  agenda_id UUID,
  scheduled_date DATE,
  target_val INTEGER,
  actual_val INTEGER,
  status task_status,
  failure_tag failure_tag,
  note TEXT,
  mood TEXT,
  was_recalculated BOOLEAN,
  agenda_title TEXT,
  agenda_type agenda_type
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.agenda_id,
    dt.scheduled_date,
    dt.target_val,
    dt.actual_val,
    dt.status,
    dt.failure_tag,
    dt.note,
    dt.mood,
    dt.was_recalculated,
    a.title AS agenda_title,
    a.type AS agenda_type
  FROM daily_tasks dt
  INNER JOIN agendas a ON dt.agenda_id = a.id
  WHERE a.user_id = auth.uid()
    AND dt.scheduled_date BETWEEN p_start_date AND p_end_date
  ORDER BY dt.scheduled_date ASC, a.title ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update buffer tokens when a task is skipped with buffer
CREATE OR REPLACE FUNCTION update_buffer_tokens_on_skip()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if status changed to SKIPPED_WITH_BUFFER
  IF NEW.status = 'SKIPPED_WITH_BUFFER' AND 
     (OLD.status IS NULL OR OLD.status != 'SKIPPED_WITH_BUFFER') THEN
    UPDATE agendas
    SET buffer_tokens = GREATEST(0, buffer_tokens - 1)
    WHERE id = NEW.agenda_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update buffer tokens
CREATE TRIGGER trigger_update_buffer_tokens
  AFTER INSERT OR UPDATE ON daily_tasks
  FOR EACH ROW
  WHEN (NEW.status = 'SKIPPED_WITH_BUFFER')
  EXECUTE FUNCTION update_buffer_tokens_on_skip();

-- ============================================
-- 7. COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE agendas IS 'Stores user goals/agendas. Can be numeric (e.g., read 500 pages) or boolean (e.g., go to gym daily)';
COMMENT ON TABLE daily_tasks IS 'Stores daily tasks for each agenda. Tracks completion status, failure tags, and recalculation status';

COMMENT ON COLUMN agendas.buffer_tokens IS 'Number of "life happens" tokens remaining. Used for boolean habits to allow skipping without breaking streak';
COMMENT ON COLUMN agendas.total_target IS 'Total target for numeric goals (e.g., 500 pages total)';
COMMENT ON COLUMN agendas.target_val IS 'Daily target value (calculated from total_target or set directly)';
COMMENT ON COLUMN daily_tasks.was_recalculated IS 'Indicates if this task was modified due to recalculation logic for numeric goals';
COMMENT ON COLUMN daily_tasks.failure_tag IS 'Quick tag explaining why a task was failed/skipped';

-- ============================================
-- END OF SCHEMA
-- ============================================

