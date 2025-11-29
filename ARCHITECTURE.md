# Architecture & Data Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                            │
│               (To be connected later)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket (ws://)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               FastAPI Backend (main.py)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Receive user message via WebSocket                      │ │
│  │ 2. Validate OpenAI API key ✓ NEW                           │ │
│  │ 3. Call OpenAI API with user prompt                        │ │
│  │ 4. Get AI response + token count                           │ │
│  │ 5. Save to database (async, non-blocking) ✓ FIXED         │ │
│  │ 6. Send response back to client                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────┬──────────────────────────┘
                   │                  │
                   │ HTTP API         │ WebSocket
                   │ (OpenAI)         │
                   │                  │
        ┌──────────▼────────┐    ┌────▼──────────────┐
        │   OpenAI API      │    │  Supabase (DB)   │
        │ (gpt-3.5-turbo)   │    │  ┌──────────────┐ │
        │                  │    │  │ requests     │ │
        │ Returns:         │    │  │ ──────────── │ │
        │ - response text  │    │  │ id (PK)      │ │
        │ - token count    │    │  │ session_id   │ │
        │ - metadata       │    │  │ prompt ✓     │ │
        │                  │    │  │ response ✓   │ │
        └──────────────────┘    │  │ tokens_used  │ │
                                │  │ created_at ✓ │ │
                                │  │ metadata     │ │
                                │  │ username     │ │
                                │  └──────────────┘ │
                                └──────────────────┘
```

## Data Flow - Detailed

```
USER INPUT
   │
   ▼
┌─────────────────────────────────────┐
│ WebSocket Message Received          │
│ - Session ID generated (UUID)       │
│ - User prompt: "What is 2+2?"       │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Error Validation Layer ✓ FIXED      │
│ ✓ OpenAI key exists?                │
│ ✓ Supabase connected?               │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ OpenAI API Call                     │
│ POST /v1/chat/completions           │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ OpenAI Response                     │
│ {                                   │
│   "content": "2 + 2 = 4",           │
│   "usage": {                        │
│     "total_tokens": 42              │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Database Save ✓ ASYNC (Non-blocking)│
│ ThreadPoolExecutor                  │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ INSERT into Supabase                │
│ ────────────────────────────────    │
│ prompt: "What is 2+2?" ✓ STORED    │
│ response: "2 + 2 = 4" ✓ STORED    │
│ tokens_used: 42 ✓ STORED           │
│ session_id: "uuid-xxx"              │
│ created_at: "2025-11-29..." ✓ NEW  │
│ username: "WebUser"                 │
│ metadata: {...}                     │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Send Response to Client             │
│ "2 + 2 = 4"                         │
└─────────────────────────────────────┘
   │
   ▼
USER SEES RESPONSE
```

## Database Schema

```
Table: requests
┌────────────────────────────────────────────────────────────────┐
│ Column Name    │ Type      │ Constraints      │ Purpose        │
├────────────────────────────────────────────────────────────────┤
│ id             │ uuid      │ PRIMARY KEY      │ Unique record  │
│ session_id     │ text      │ NOT NULL, INDEX  │ Group chats    │
│ prompt         │ text      │ NOT NULL         │ User input ✓   │
│ response       │ text      │ NOT NULL         │ AI output ✓    │
│ tokens_used    │ integer   │ NULL             │ API usage      │
│ metadata       │ jsonb     │ NULL             │ Full API resp  │
│ username       │ text      │ DEFAULT 'Web...' │ User tracking  │
│ user_id        │ text      │ NULL             │ Auth (future)  │
│ created_at     │ timestamp │ DEFAULT now() ✓  │ Audit trail ✓  │
│ updated_at     │ timestamp │ DEFAULT now()    │ Modification   │
└────────────────────────────────────────────────────────────────┘

Indexes:
- idx_requests_session_id (for fast session lookup)
- idx_requests_created_at (for time-based queries)
- idx_requests_username (for user tracking)
```

## Test Coverage

```
TEST SUITE: test_integration.py
├─ Test 1: Database Connection
│  └─ Verifies Supabase is reachable
│
├─ Test 2: OpenAI API
│  └─ Verifies API credentials work
│
├─ Test 3: Save Single Message
│  ├─ Creates user prompt
│  ├─ Gets OpenAI response
│  └─ Saves to database ✓
│
├─ Test 4: Retrieve Messages
│  └─ Verifies we can read saved data ✓
│
└─ Test 5: Full Conversation (3 messages)
   ├─ Message 1: "Tell me a short joke"
   ├─ Message 2: "What's the capital of France?"
   ├─ Message 3: "Explain quantum computing..."
   └─ Verifies all stored and retrieved ✓

Quick Test: test_db_quick.py
└─ Fast verification without OpenAI
   ├─ Connection test
   ├─ Save test message
   └─ Retrieve test message
```

## State Transitions

```
┌─────────────────────────────────────────┐
│          User Connects                  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Session Created      │
        │ session_id = UUID    │
        └──────────┬───────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
Message 1     Message 2     Message 3
   │              │              │
   ▼              ▼              ▼
OpenAI      OpenAI         OpenAI
   │              │              │
   ▼              ▼              ▼
Save DB      Save DB        Save DB
   │              │              │
   └──────────────┼──────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │ All messages in DB   │
        │ Ready for query:     │
        │ SELECT * WHERE       │
        │ session_id = "UUID"  │
        └──────────────────────┘
```

## Error Handling Flow

```
Request comes in
│
▼
┌─────────────────────────────┐
│ Check OpenAI Key            │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    │             │
   ✓             ✗
   │             │
   ▼             ▼
Continue    Error message:
to API      "OpenAI client
            not initialized"
            (sent to client)
            │
            └─→ Log error
                Exit gracefully

Similar flow for:
- Supabase connection errors
- API timeout errors
- JSON parsing errors
- WebSocket disconnect
```

## Performance Improvements

```
BEFORE (Blocking):                AFTER (Non-blocking):
│                                 │
├─ Receive message                ├─ Receive message
├─ Call OpenAI (wait...)          ├─ Call OpenAI (wait...)
├─ Get response                   ├─ Get response
├─ Database call (BLOCKS!) ⚠️      ├─ Queue database write
├─  ...waiting...                 ├─ Immediately send response
├─  ...waiting...                 │  (database saves in background)
├─ Send response (DELAYED)        └─ Client receives instantly ✓
└─ Ready for next message
   (LATE)                         Database saves in thread pool
                                  (doesn't block connection)
```

## Integration Checklist

```
✅ Environment Setup
   ├─ SUPABASE_URL in .env
   ├─ SUPABASE_KEY in .env
   └─ OPENAI_API_KEY in .env

✅ Database Setup
   ├─ Table "requests" created
   ├─ All columns defined
   └─ Indexes created

✅ Code Quality
   ├─ Error handling
   ├─ Async operations
   ├─ Logging
   └─ Type hints

✅ Testing
   ├─ Connection test passes
   ├─ API test passes
   ├─ Save test passes
   ├─ Retrieve test passes
   └─ Full flow test passes

✅ Documentation
   ├─ SETUP.md
   ├─ FIXES_SUMMARY.md
   ├─ TESTING_GUIDE.md
   └─ This document
```
