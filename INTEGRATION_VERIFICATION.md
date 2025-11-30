# ✅ COMPLETE SYSTEM VERIFICATION CHECKLIST

## Before You Start

- [ ] Virtual environment activated
- [ ] `.venv` folder exists at `c:\Users\darre\HackSheffield\.venv`
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `ReplyChallenge/.env` has Supabase credentials
- [ ] `ReplyChallenge/.env` has OpenAI API key
- [ ] Supabase table "requests" is created
- [ ] Node.js installed and npm available

---

## Terminal 1: Backend Server

```bash
cd c:\Users\darre\HackSheffield
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe -m uvicorn ReplyChallenge.main:app --reload --port 8000 --host 0.0.0.0
```

**Expected Output:**

```
✓ OpenAI client initialized
INFO:     Application startup complete.
✓ Database connection verified. Total requests: X
```

**✅ Verification:**

- [ ] Server started without errors
- [ ] Port 8000 is being used
- [ ] Database connection verified
- [ ] Can access http://localhost:8000/ in browser

---

## Terminal 2: Frontend Dev Server

```bash
cd c:\Users\darre\HackSheffield\hack-sheffield
npm run dev
```

**Expected Output:**

```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**✅ Verification:**

- [ ] Frontend dev server running
- [ ] No build errors
- [ ] URL shows http://localhost:5173

---

## Browser: Test Integration

1. **Open Browser**

   - Navigate to: http://localhost:5173
   - [ ] Odyssey Chat interface loads

2. **Check Connection Status**

   - [ ] Status shows "connected" (green text)
   - If red/gray: Check browser console for errors

3. **Send Test Message**

   - [ ] Type a message (e.g., "Hello")
   - [ ] Click "Send" button
   - [ ] Button should be enabled (not grayed out)

4. **Verify Response**

   - [ ] Message appears in chat (blue, right side)
   - [ ] AI response appears below (green, left side)
   - [ ] Both messages show in chat history

5. **Check Browser Console**
   - [ ] Right-click → Inspect → Console tab
   - [ ] No red errors
   - [ ] See "✓ WebSocket connected" message
   - [ ] See "📤 Message sent: ..." message
   - [ ] See "📨 Message received: ..." message

---

## Supabase: Verify Data Storage

1. **Go to Supabase Dashboard**

   - https://app.supabase.com/projects

2. **Navigate to Table**

   - Select your project
   - Click "Table Editor" (left sidebar)
   - Click "requests" table

3. **Verify Records**
   - [ ] New rows appear when you send messages
   - [ ] "prompt" column has your message
   - [ ] "response" column has AI response
   - [ ] "created_at" has current timestamp
   - [ ] "tokens_used" has a number
   - [ ] "session_id" is consistent for session

---

## Expected Data in Supabase

For each message sent:

```
Columns:
├─ id: [UUID]
├─ session_id: [Same for all messages in session]
├─ prompt: [Your message text]
├─ response: [AI's response text]
├─ tokens_used: [Number like 42, 53, etc]
├─ metadata: [JSON blob with full API response]
├─ username: WebUser
├─ user_id: [Empty/null for now]
├─ created_at: [Current timestamp]
└─ updated_at: [Same as created_at]
```

---

## Terminal 3: Run Integration Tests (Optional)

```bash
cd c:\Users\darre\HackSheffield
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe ReplyChallenge/test_integration.py
```

**Expected Output:**

```
████████████████████████████████████████████████████████████
█                SUPABASE & OPENAI INTEGRATION TESTS        █
████████████████████████████████████████████████████████████

✓ PASS - test_1_db_connection
✓ PASS - test_2_openai_api
✓ PASS - test_3_save_single
✓ PASS - test_4_retrieve
✓ PASS - test_5_conversation

Total: 5/5 tests passed
🎉 ALL TESTS PASSED! Your integration is working correctly!
```

---

## Complete Verification Matrix

| Component            | Status | Verification                    |
| -------------------- | ------ | ------------------------------- |
| Backend Server       | ✅     | Running on port 8000            |
| Frontend App         | ✅     | Running on port 5173            |
| WebSocket Connection | ✅     | Status = "connected"            |
| OpenAI Integration   | ✅     | Gets response to messages       |
| Supabase Connection  | ✅     | Data appears in table           |
| Message Storage      | ✅     | Both prompt and response saved  |
| Timestamps           | ✅     | created_at populated            |
| Token Tracking       | ✅     | tokens_used has value           |
| Error Handling       | ✅     | Graceful errors if disconnected |
| Auto-Reconnect       | ✅     | Reconnects after disconnect     |

---

## 🎯 Success Indicators

All of these should be ✅:

1. **Backend** - Server starts without errors
2. **Frontend** - App loads at localhost:5173
3. **Connection** - Status shows green "connected"
4. **Chat** - Can send and receive messages
5. **UI** - Messages display correctly formatted
6. **Database** - Data appears in Supabase
7. **Timestamps** - created_at field populated
8. **Console** - No errors in browser console
9. **Tokens** - tokens_used tracked
10. **Session** - Same session_id for all messages

---

## 🐛 If Something Fails

### Backend won't start

- Check: `pip install -r requirements.txt` completed
- Check: `.env` file exists in `ReplyChallenge/` folder
- Check: Python virtual environment activated
- Check: Port 8000 not in use: `netstat -ano | findstr 8000`

### Frontend won't load

- Check: Node.js installed: `node --version`
- Check: npm installed: `npm --version`
- Check: Dependencies: `npm install` in hack-sheffield folder
- Check: Port 5173 not in use: `netstat -ano | findstr 5173`

### Messages not sending

- Check: Backend server is running
- Check: Connection status is "connected" (green)
- Check: Browser console has no errors
- Check: OpenAI API key is valid in `.env`

### Data not in Supabase

- Check: Supabase credentials correct in `.env`
- Check: Table "requests" created in Supabase
- Check: Row Level Security allows public access
- Check: Backend test passes: `python ReplyChallenge/test_db_quick.py`

---

## 📞 Quick Debug Commands

```bash
# Test backend health
curl http://localhost:8000/health

# Test database connection
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe ReplyChallenge/test_db_quick.py

# Test full integration
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe ReplyChallenge/test_integration.py

# Check ports
netstat -ano | findstr "8000"
netstat -ano | findstr "5173"
```

---

## 🎉 When Everything Works

You'll see:

1. ✅ Odyssey Chat interface with blue gradient
2. ✅ Green "connected" status
3. ✅ Can type and send messages
4. ✅ AI responses appear immediately
5. ✅ Data in Supabase dashboard
6. ✅ No errors in any console

**🚀 YOU'RE READY FOR PRODUCTION!**

---

**Created**: November 29, 2025
**Status**: Complete integration verification guide
