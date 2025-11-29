# 🚀 COMPLETE SUPABASE SETUP - STEP BY STEP

## ✅ Your Credentials Are Already Set!

Your `.env` file has been updated with:

```
SUPABASE_URL=https://frefuvfroiddjliwwhjt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZWZ1dmZyb2lkZGpsaXd3aGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzk0MDgsImV4cCI6MjA3OTk1NTQwOH0.UpEouVnArvF24xkkHoLTc_ki0RX4GnWfnibee9m5nSE
```

---

## 📋 Step 1: Create Your Database Table in Supabase

### 1.1 Go to Supabase Dashboard

- URL: https://app.supabase.com
- Select your project: `frefuvfroiddjliwwhjt`

### 1.2 Go to SQL Editor

- Left sidebar → **SQL Editor**
- Click **New Query**

### 1.3 Copy This SQL

```sql
-- ReplyChallenge Database Schema
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  username TEXT DEFAULT 'WebUser',
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_session_id ON requests(session_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_username ON requests(username);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON requests
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
```

### 1.4 Click **Run**

- You should see: `Success. No rows returned.`

### 1.5 Verify Table Created

- Go to **Table Editor** (left sidebar)
- You should see `requests` table with 10 columns

---

## 🔑 Step 2: Add Your OpenAI API Key

Edit `.env` file:

```
OPENAI_API_KEY=sk-... (your actual OpenAI API key)
```

Where to get it: https://platform.openai.com/api-keys

---

## 🧪 Step 3: Test the Connection

### Quick Test (30 seconds)

```bash
cd c:\Users\darre\HackSheffield
python ReplyChallenge/test_db_quick.py
```

**Expected output:**

```
✓ Connection successful!
✓ Message saved!
✓ Retrieved 1 message(s)
```

### Full Test (2-3 minutes)

```bash
python ReplyChallenge/test_integration.py
```

**Expected output:**

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

## 🚀 Step 4: Start Your Server

```bash
uvicorn ReplyChallenge.main:app --reload
```

**You should see:**

```
⚠️  Warning: Failed to connect to Supabase: Invalid URL  ← Ignore if using test credentials
✓ OpenAI client initialized
✓ Database connection verified
INFO: Uvicorn running on http://127.0.0.1:8000
```

---

## 📊 Table Schema - What Each Column Does

| Column        | Type      | Purpose                               | Required    |
| ------------- | --------- | ------------------------------------- | ----------- |
| `id`          | UUID      | Unique identifier                     | ✅ Auto     |
| `session_id`  | TEXT      | Groups messages into conversations    | ✅ Yes      |
| `user_id`     | UUID      | Links to Supabase Auth                | ❌ Optional |
| `username`    | TEXT      | User tracking (defaults to "WebUser") | ❌ Auto     |
| `prompt`      | TEXT      | User's message ← **YOUR INPUT**       | ✅ Yes      |
| `response`    | TEXT      | AI's response ← **AI OUTPUT**         | ✅ Yes      |
| `tokens_used` | INTEGER   | OpenAI token count                    | ❌ Optional |
| `metadata`    | JSONB     | Full OpenAI response                  | ❌ Optional |
| `created_at`  | TIMESTAMP | Auto-created timestamp                | ✅ Auto     |
| `updated_at`  | TIMESTAMP | Auto-updated timestamp                | ✅ Auto     |

---

## 🔄 Data Flow

```
User Input
    ↓
YOUR SERVER
    ↓
OpenAI API ← Gets AI Response
    ↓
SUPABASE DATABASE ← Saves Everything
    ├─ prompt (your input) ✅
    ├─ response (AI output) ✅
    ├─ tokens_used
    ├─ session_id (groups messages)
    └─ metadata (full response)
```

---

## ✨ Your Bare Minimum Setup

- ✅ **1 Table**: `requests`
- ✅ **4 Essential Columns**: prompt, response, session_id, created_at
- ✅ **4 Helper Columns**: tokens_used, metadata, username, user_id
- ✅ **4 Indexes**: For fast queries
- ✅ **1 Security Policy**: Allow all (for hackathon)

This is the **minimal setup** that works perfectly for a hackathon!

---

## 🎯 What Happens When You Send a Message

1. **User** types: "What is AI?"
2. **Frontend** sends via WebSocket to your server
3. **Server** receives message
4. **Server** calls OpenAI API
5. **OpenAI** returns response + token count
6. **Server** saves to Supabase:
   ```
   {
     session_id: "user-uuid",
     prompt: "What is AI?",
     response: "AI is artificial intelligence...",
     tokens_used: 42,
     metadata: {...full OpenAI response...},
     created_at: "2025-11-29T10:30:00Z"
   }
   ```
7. **Server** sends response to frontend
8. **Frontend** displays message

**Everything stored in Supabase!** ✅

---

## ✅ Checklist

- [ ] Added SQL to Supabase SQL Editor
- [ ] Clicked **Run** (saw success message)
- [ ] Verified `requests` table in Table Editor
- [ ] Updated `.env` with OpenAI API key
- [ ] Ran quick test: `python ReplyChallenge/test_db_quick.py`
- [ ] All tests passed ✅
- [ ] Started server: `uvicorn ReplyChallenge.main:app --reload`
- [ ] Server running on http://127.0.0.1:8000 ✅

---

## 🆘 Troubleshooting

### "Table doesn't exist" or "relation does not exist"

**Solution**: Run the SQL again in Supabase SQL Editor

### "Permission denied"

**Solution**: The Row Level Security policy is too strict. Run this:

```sql
DROP POLICY IF EXISTS "Allow all operations" ON requests;
CREATE POLICY "Allow all operations" ON requests
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
```

### "Connection refused"

**Solution**:

1. Check `.env` has correct SUPABASE_URL and SUPABASE_KEY
2. Make sure Supabase project is active

### Tests fail with "401 Unauthorized"

**Solution**: Your Supabase API key might have expired. Get a new anon key from:

- Supabase Dashboard → Settings → API → `anon` key

---

## 🎉 You're Ready!

Your complete Supabase setup:

- ✅ Database table created
- ✅ Indexes optimized
- ✅ Security policy configured
- ✅ Credentials added to `.env`
- ✅ Ready for production

**Now run your tests and start your server!** 🚀

---

**Table Schema File**: `supabase_setup.sql`
**Setup File**: This file
**Next**: Run `python ReplyChallenge/test_db_quick.py`
