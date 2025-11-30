import json
from datetime import datetime
from .client import supabase

def log_chat_to_db(user_prompt: str | None,
                   ai_response: str | None,
                   tokens: int | None,
                   session_id: str,
                   metadata: dict,
                   username: str | None = None,
                   event_type: str = "message"):
    """
    Saves the chat interaction to Supabase.
    
    Table 'requests' should have columns:
    - id (uuid, primary key)
    - session_id (text)
    - prompt (text)
    - response (text)
    - tokens_used (integer)
    - metadata (jsonb)
    - username (text)
    - user_id (text, nullable)
    - created_at (timestamp)
    """
    if supabase is None:
        print(f"⚠️  Database not connected. Set SUPABASE_URL and SUPABASE_KEY in .env file")
        try:
            preview = (user_prompt or ai_response or "")[:50]
        except Exception:
            preview = "<unavailable>"
        print(f"   Message would have been saved: {preview}...")
        return None
    
    try:
        data_payload = {
            "prompt": user_prompt,
            "response": ai_response,
            "tokens_used": tokens,
            "session_id": session_id,
            "metadata": metadata or {},
            "username": username or "anonymous",
            "event_type": event_type,
            "user_id": None,
            "created_at": datetime.utcnow().isoformat()
        }

        # Execute the insert
        result = supabase.table("requests").insert(data_payload).execute()
        print(f"✓ Logged to Supabase (Session: {session_id})")
        return result
        
    except Exception as e:
        print(f"✗ Database Error: {e}")
        raise


def get_session_history(session_id: str):
    """
    Retrieves all chat messages for a specific session.
    """
    if supabase is None:
        print(f"⚠️  Database not connected. Set SUPABASE_URL and SUPABASE_KEY in .env file")
        return []
    
    try:
        result = supabase.table("requests").select("*").eq("session_id", session_id).execute()
        print(f"✓ Retrieved {len(result.data)} messages from session {session_id}")
        return result.data
    except Exception as e:
        print(f"✗ Database Error retrieving history: {e}")
        raise


def verify_database_connection():
    """
    Test if Supabase connection is working.
    """
    if supabase is None:
        print(f"⚠️  Database not connected. Set SUPABASE_URL and SUPABASE_KEY in .env file")
        return False
    
    try:
        result = supabase.table("requests").select("count", count="exact").execute()
        count = result.count if hasattr(result, 'count') else len(result.data)
        print(f"✓ Database connection verified. Total requests: {count}")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False