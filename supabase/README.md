# Supabase Database Setup

This directory contains the SQL schema and setup files for the Goal Coach app's Supabase database.

## Files

- `schema.sql` - Complete database schema with tables, enums, RLS policies, indexes, triggers, and helper functions

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `schema.sql`
4. Click **Run** to execute the SQL

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Create a new migration
supabase migration new initial_schema

# Copy schema.sql content to the new migration file
# Then apply migrations
supabase db push
```

### Option 3: Using psql

```bash
psql -h your-db-host -U postgres -d postgres -f schema.sql
```

## What's Included

### Tables
- **agendas** - Stores user goals/agendas (numeric or boolean types)
- **daily_tasks** - Stores daily tasks for each agenda with completion tracking

### Enums
- `agenda_type` - NUMERIC or BOOLEAN
- `task_status` - PENDING, COMPLETED, PARTIAL, SKIPPED_WITH_BUFFER, FAILED
- `failure_tag` - Sick, Work Overload, Tired, Distracted, Other, NONE
- `agenda_status` - ACTIVE, COMPLETED, FAILED

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- Policies ensure users can only access their own data
- Anonymous auth support (users can link accounts later)

### Helper Functions
- `get_user_active_agendas()` - Get all active agendas for the current user
- `get_tasks_by_date_range(start_date, end_date)` - Get tasks within a date range

### Automatic Features
- Auto-updating `updated_at` timestamps
- Automatic buffer token deduction when tasks are skipped with buffer

## Example Queries

### Get all active agendas for current user
```sql
SELECT * FROM get_user_active_agendas();
```

### Get tasks for this week
```sql
SELECT * FROM get_tasks_by_date_range(
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days'
);
```

### Create a new agenda
```sql
INSERT INTO agendas (user_id, title, type, total_target, unit, target_val, start_date)
VALUES (
  auth.uid(),
  'Read 500 pages',
  'NUMERIC',
  500,
  'pages',
  20,
  CURRENT_DATE
);
```

### Create a daily task
```sql
INSERT INTO daily_tasks (agenda_id, scheduled_date, target_val, actual_val, status)
VALUES (
  'your-agenda-id',
  CURRENT_DATE,
  20,
  0,
  'PENDING'
);
```

### Update task completion
```sql
UPDATE daily_tasks
SET 
  actual_val = 25,
  status = 'COMPLETED',
  mood = '🙂'
WHERE id = 'your-task-id';
```

### Use buffer token for a skipped task
```sql
UPDATE daily_tasks
SET 
  status = 'SKIPPED_WITH_BUFFER',
  failure_tag = 'Tired'
WHERE id = 'your-task-id';
-- Buffer tokens will be automatically decremented by trigger
```

## Next Steps

1. Install Supabase client in your React Native app:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Set up environment variables for your Supabase URL and anon key

3. Configure anonymous authentication in your Supabase dashboard:
   - Go to Authentication > Providers
   - Enable Anonymous sign-ins

4. Update your app code to sync with Supabase instead of AsyncStorage

## Notes

- The schema supports both anonymous and authenticated users
- Buffer tokens are automatically managed via database triggers
- All timestamps are stored in UTC (TIMESTAMPTZ)
- The mood field stores emoji values as TEXT

