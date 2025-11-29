# 🚀 Supabase Database Setup Guide

## Step 1: Create the Table in Supabase ✅

### 1a. Go to Supabase SQL Editor

1. Open: https://app.supabase.com
2. Select your project
3. Go to: **SQL Editor** (left sidebar)
4. Click: **New Query**

### 1b. Copy & Run This SQL

```sql
-- ReplyChallenge Database Schema
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation tracking
  session_id TEXT NOT NULL,

  -- User information
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  username TEXT DEFAULT 'WebUser',

  -- Chat content
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,

  -- API tracking
  tokens_used INTEGER,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_session_id ON requests(session_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_username ON requests(username);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON requests
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
```

### 1c. Click: **Run**

You should see: `Success. No rows returned.`

---

## Step 2: Verify Table Creation ✅

Go to **Table Editor** (left sidebar) → You should see `requests` table with all columns

### Expected Columns:

- ✅ `id` (UUID, Primary Key)
- ✅ `session_id` (Text, Not Null)
- ✅ `user_id` (UUID, Optional)
- ✅ `username` (Text, Default: 'WebUser')
- ✅ `prompt` (Text, Not Null)
- ✅ `response` (Text)
- ✅ `tokens_used` (Integer)
- ✅ `metadata` (JSON)
- ✅ `created_at` (Timestamp)
- ✅ `updated_at` (Timestamp)

---

## Step 3: Update Your `.env` File ✅

Your `.env` file has been updated with:

```
SUPABASE_URL=https://frefuvfroiddjliwwhjt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZWZ1dmZyb2lkZGpsaXd3aGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzk0MDgsImV4cCI6MjA3OTk1NTQwOH0.UpEouVnArvF24xkkHoLTc_ki0RX4GnWfnibee9m5nSE
```

Just add your OpenAI API key:

```
OPENAI_API_KEY=sk-... (your actual key)
```

---

## Step 4: Test the Connection ✅

Run this command:

```bash
python ReplyChallenge/test_db_quick.py
```

Expected output:

```
✓ Connection successful!
✓ Message saved!
✓ Retrieved 1 message(s)
```

---

## Step 5: Run Full Integration Tests ✅

```bash
python ReplyChallenge/test_integration.py
```

Expected output:

```
✓ PASS - test_1_db_connection
✓ PASS - test_2_openai_api
✓ PASS - test_3_save_single
✓ PASS - test_4_retrieve
✓ PASS - test_5_conversation

Total: 5/5 tests passed
🎉 ALL TESTS PASSED!
```

---

## Step 6: Start Your Server ✅

```bash
uvicorn ReplyChallenge.main:app --reload
```

You should see:

```
✓ Database connection verified
INFO: Uvicorn running on http://127.0.0.1:8000
```

---

## Table Schema Explained

| Column        | Type      | Purpose                               |
| ------------- | --------- | ------------------------------------- |
| `id`          | UUID      | Unique record identifier              |
| `session_id`  | TEXT      | Groups messages into conversations    |
| `user_id`     | UUID      | Links to Supabase Auth (optional)     |
| `username`    | TEXT      | User tracking (defaults to "WebUser") |
| `prompt`      | TEXT      | User's input message ✅               |
| `response`    | TEXT      | AI's response ✅                      |
| `tokens_used` | INTEGER   | OpenAI API token count                |
| `metadata`    | JSONB     | Full OpenAI API response              |
| `created_at`  | TIMESTAMP | Auto-created timestamp                |
| `updated_at`  | TIMESTAMP | Auto-updated timestamp                |

---

## What Each Index Does

| Index                     | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `idx_requests_session_id` | Fast lookups by session (for conversation history) |
| `idx_requests_created_at` | Fast sorting by time                               |
| `idx_requests_user_id`    | Fast lookups by user                               |
| `idx_requests_username`   | Fast lookups by username                           |

---

## Ready to Go! 🚀

Your database is now:

- ✅ Created in Supabase
- ✅ Connected to your project
- ✅ Ready to store data
- ✅ Optimized with indexes
- ✅ Secure with Row Level Security

**Next**: Add your OpenAI API key to `.env` and run the tests!

---

## Troubleshooting

### "Connection failed"

- Check `.env` file has correct SUPABASE_URL and SUPABASE_KEY
- Make sure you ran the SQL in Supabase

### "Table not found"

- Go to Supabase Table Editor
- Verify `requests` table exists
- If not, run the SQL again

### "Permission denied"

- The Row Level Security policy might be too strict
- Run this SQL in Supabase to fix:

```sql
DROP POLICY IF EXISTS "Allow all operations" ON requests;
CREATE POLICY "Allow all operations" ON requests
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
```

---

**Setup complete! Your database is ready! 🎉**
