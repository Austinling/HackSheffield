# Setup Instructions

## 1. Install Dependencies

```bash
pip install -r requirements.txt
```

## 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon public key
- `OPENAI_API_KEY`: Your OpenAI API key

## 3. Create Supabase Table

In your Supabase dashboard, create a table named `requests` with the following schema:

```sql
CREATE TABLE requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  tokens_used integer,
  metadata jsonb,
  username text DEFAULT 'WebUser',
  user_id text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_requests_session_id ON requests(session_id);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX idx_requests_username ON requests(username);
```

## 4. Run Integration Tests

```bash
python ReplyChallenge/test_integration.py
```

This will verify:

- ✓ Database connection to Supabase
- ✓ OpenAI API connectivity
- ✓ Saving user prompts to database
- ✓ Saving AI responses to database
- ✓ Retrieving messages from database
- ✓ Full conversation flow

## 5. Start the Server

```bash
uvicorn ReplyChallenge.main:app --reload
```

The server will be available at `http://localhost:8000`

## 6. Test WebSocket Connection

You can use any WebSocket client to test the connection. The endpoint is:

```
ws://localhost:8000/ws
```

Or use the frontend when you connect it.

## Debugging

If tests fail, check:

1. `.env` file has correct credentials
2. Supabase project is active and table `requests` exists
3. OpenAI API key is valid and has remaining credits
4. Your network allows connections to Supabase and OpenAI APIs
