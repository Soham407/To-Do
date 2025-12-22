# Goal Coach App

## Environment Setup

This project uses Supabase. You must configure your environment variables.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Supabase credentials in `.env`:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase Anon Key.

**Security Note:** Never commit your real `.env` file to version control. The `.env` file is ignored by git.

## Scripts

- `npm start`: Run the app
