-- AI Usage Tracking Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
-- Allow users to insert their own logs
CREATE POLICY "Users can insert their own AI logs" ON ai_usage_logs FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Allow users to see their own logs (needed for counting)
CREATE POLICY "Users can see their own AI logs" ON ai_usage_logs FOR
SELECT USING (auth.uid() = user_id);
-- Optional: Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs (user_id, created_at);