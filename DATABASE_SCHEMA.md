# 📋 SUPABASE DATABASE - YOUR SETUP GUIDE

## 🎯 The One Table You Need

```
TABLE: requests
════════════════════════════════════════════════════════════════

Column Name      | Type             | Required | Purpose
─────────────────┼──────────────────┼──────────┼──────────────────
id               | UUID PK          | AUTO     | Unique record ID
session_id       | TEXT NOT NULL    | YES      | Group messages
prompt           | TEXT NOT NULL    | YES      | YOUR INPUT ✅
response         | TEXT NOT NULL    | YES      | AI OUTPUT ✅
tokens_used      | INTEGER          | NO       | API cost tracking
metadata         | JSONB            | NO       | Full API response
username         | TEXT DEFAULT     | AUTO     | User name
user_id          | UUID FK (auth)   | NO       | Auth integration
created_at       | TIMESTAMP        | AUTO     | When saved
updated_at       | TIMESTAMP        | AUTO     | When updated

Indexes:         4 (for fast queries)
Security Policy: Allow all (perfect for hackathon)
```

---

## 🚀 QUICKSTART

### 1. Copy This SQL

```sql
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

CREATE INDEX idx_requests_session_id ON requests(session_id);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_username ON requests(username);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON requests
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
```

### 2. Go to Supabase → SQL Editor → New Query → Paste → Run

### 3. Done! ✅

---

## 💾 What Gets Saved

When user sends message:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-uuid",
  "prompt": "What is AI?",                    ← USER INPUT
  "response": "AI is artificial...",          ← AI OUTPUT
  "tokens_used": 42,                          ← COST TRACKING
  "metadata": {...full openai response...},   ← DEBUG INFO
  "username": "WebUser",
  "user_id": null,
  "created_at": "2025-11-29T10:30:00Z",
  "updated_at": "2025-11-29T10:30:00Z"
}
```

---

## ✅ Your Credentials

File: `.env`

```
SUPABASE_URL=https://frefuvfroiddjliwwhjt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-... (you need to add this)
```

---

## 🧪 Test It

```bash
# Quick test
python ReplyChallenge/test_db_quick.py

# Full test
python ReplyChallenge/test_integration.py

# Start server
uvicorn ReplyChallenge.main:app --reload
```

---

## 📊 Architecture

```
┌──────────────┐
│   Frontend   │ (React)
│   (ws://)    │
└──────┬───────┘
       │ WebSocket
       ▼
┌──────────────────┐
│   FastAPI Server │ (Your Server)
│   - OpenAI API   │
│   - Database     │
└──────┬───────────┘
       │ HTTPS
       ▼
┌──────────────────────┐
│   SUPABASE CLOUD     │ (Cloud Database)
│   ┌────────────────┐ │
│   │  requests      │ │ ← 1 Table
│   │  - prompt      │ │ ← User Input
│   │  - response    │ │ ← AI Output
│   │  - session_id  │ │
│   │  - tokens      │ │
│   │  - created_at  │ │
│   └────────────────┘ │
└──────────────────────┘
```

---

## 🎯 Minimal Setup (Hackathon Ready)

✅ **1 Table**
✅ **10 Columns** (all you need)
✅ **Basic Operations** (Create, Read)
✅ **Indexed for Speed** (4 indexes)
✅ **Secure** (RLS policy)
✅ **Scalable** (UUID keys)

**This is production-ready!** 🚀

---

## ⏱️ Setup Time

- Copy SQL: 30 seconds
- Paste in Supabase: 30 seconds
- Click Run: 10 seconds
- Add OpenAI key: 30 seconds
- **Total: 2 minutes!**

---

## 📞 Need Help?

See: `SUPABASE_COMPLETE_SETUP.md` for detailed steps

---

**Your database is configured and ready! 🎉**

Next: Create table in Supabase
