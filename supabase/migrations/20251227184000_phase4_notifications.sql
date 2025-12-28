-- ============================================
-- Phase 4: Notifications & Polish Migration
-- ============================================
-- 1. Update Agendas Table for Notifications
-- Adding reminder_time to store when the notification should fire.
-- For One-Off: Specific timestamp.
-- For Recurring: Used to extract the time-of-day (HH:MM) component.
ALTER TABLE agendas
ADD COLUMN reminder_time TIMESTAMPTZ;
-- Note: We assume the client handles the timezone conversion logic
-- storing UTC or local time as appropriate for the reminder.