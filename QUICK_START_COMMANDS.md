# 🚀 QUICK START - RUN THESE COMMANDS NOW

## 📋 Prerequisites Check

Before running, verify:

- [ ] Virtual environment exists: `.venv` folder
- [ ] Dependencies installed (run `pip install -r requirements.txt` if not)
- [ ] `ReplyChallenge/.env` has credentials
- [ ] Node.js installed (`node --version`)

---

## 🎬 START HERE (3 Steps)

### Step 1️⃣: Open Terminal and Run Backend

```bash
cd c:\Users\darre\HackSheffield
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe -m uvicorn ReplyChallenge.main:app --reload --port 8000 --host 0.0.0.0
```

**Wait for this output:**

```
✓ OpenAI client initialized
INFO:     Application startup complete.
✓ Database connection verified. Total requests: X
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ Leave this terminal running! Don't close it.

---

### Step 2️⃣: Open NEW Terminal and Run Frontend

```bash
cd c:\Users\darre\HackSheffield\hack-sheffield
npm run dev
```

**Wait for this output:**

```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ Leave this terminal running! Don't close it.

---

### Step 3️⃣: Open Browser

Click this link or paste in address bar:

```
http://localhost:5173
```

You should see:

- Odyssey Chat interface
- Black header with boat image
- Input box at bottom
- Status: **connected** (green)

---

## ✅ Test It Works

1. **Type a message** in the input box

   ```
   What is 2+2?
   ```

2. **Click "Send"** button

3. **Wait for response** (2-5 seconds)

4. **You should see**:
   - Your message in blue (right side)
   - AI response in green (left side)
   - Both in chat history

---

## 📊 Verify Data in Supabase

1. Open https://app.supabase.com
2. Select your project
3. Click "Table Editor"
4. Click "requests" table
5. **You should see new rows** with:
   - Your prompt text
   - AI response text
   - created_at timestamp
   - tokens_used number

---

## 🧪 Run Tests (Optional)

Open ANOTHER terminal:

```bash
cd c:\Users\darre\HackSheffield
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe ReplyChallenge/test_integration.py
```

You should see:

```
✓ PASS - test_1_db_connection
✓ PASS - test_2_openai_api
✓ PASS - test_3_save_single
✓ PASS - test_4_retrieve
✓ PASS - test_5_conversation

🎉 ALL TESTS PASSED!
```

---

## 🐛 If Something Goes Wrong

### Backend won't start

**Error**: `ModuleNotFoundError: No module named ...`

**Fix**:

```bash
cd c:\Users\darre\HackSheffield
C:/Users/darre/HackSheffield/.venv/Scripts/pip.exe install -r requirements.txt
```

Then try backend command again.

---

### Frontend won't load

**Error**: `Cannot find module 'react'` or npm errors

**Fix**:

```bash
cd c:\Users\darre\HackSheffield\hack-sheffield
npm install
npm run dev
```

---

### Messages aren't connecting

**Symptom**: Status shows "disconnected" (gray)

**Check**:

1. Is backend running? Look for "Application startup complete"
2. Check port: Is 8000 in use?
   ```bash
   netstat -ano | findstr 8000
   ```
3. Open browser console (F12) and check for WebSocket errors

---

### Data not appearing in Supabase

**Check**:

1. Supabase credentials in `ReplyChallenge/.env` are correct
2. Run quick test:
   ```bash
   python ReplyChallenge/test_db_quick.py
   ```
3. Check Supabase dashboard - table exists?
4. Check browser console - any errors?

---

## 🚨 Common Issues & Fixes

| Issue                      | Symptom                        | Fix                                            |
| -------------------------- | ------------------------------ | ---------------------------------------------- |
| Port 8000 in use           | "Address already in use"       | Close other Python apps, or use different port |
| Port 5173 in use           | "EADDRINUSE"                   | Close other npm servers or Vite instances      |
| .env not found             | "SUPABASE_URL not found"       | Create `ReplyChallenge/.env` with credentials  |
| API key invalid            | "OpenAI initialization failed" | Check `OPENAI_API_KEY` in `.env`               |
| Can't connect to Supabase  | Database connection error      | Check `SUPABASE_URL` and `SUPABASE_KEY`        |
| WebSocket connection fails | "Failed to create WebSocket"   | Ensure backend is running on port 8000         |

---

## 📞 Debug Commands

```bash
# Test backend is running
curl http://localhost:8000/

# Test health check
curl http://localhost:8000/health

# Test database connection
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe ReplyChallenge/test_db_quick.py

# Test full integration
C:/Users/darre/HackSheffield/.venv/Scripts/python.exe ReplyChallenge/test_integration.py

# Check if port 8000 is in use
netstat -ano | findstr 8000

# Check if port 5173 is in use
netstat -ano | findstr 5173
```

---

## 🎯 Success Indicators

All of these should be ✅:

✅ Backend terminal shows "Application startup complete"
✅ Frontend terminal shows "VITE vX.X.X ready"
✅ Browser shows Odyssey Chat interface
✅ Status in UI shows green "connected"
✅ Can type and send messages
✅ AI responds within 5 seconds
✅ Browser console shows no red errors
✅ Supabase shows new records in "requests" table

---

## 📝 Terminal 1 Output Should Look Like:

```
✓ OpenAI client initialized
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Waiting for application startup.

==================================================
APPLICATION STARTUP
==================================================
✓ Database connection verified. Total requests: 5
==================================================

INFO:     Application startup complete.
```

---

## 📝 Terminal 2 Output Should Look Like:

```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🎬 Browser Console (F12) Should Show:

```
✓ WebSocket connected
📤 Message sent: What is 2+2?
📨 Message received: 2 + 2 = 4
```

---

## 🎉 When Everything Works

You'll see:

1. ✅ Chat interface loads
2. ✅ Status says "connected"
3. ✅ Send button is enabled
4. ✅ Messages appear in chat
5. ✅ AI responds
6. ✅ Data in Supabase dashboard
7. ✅ No errors anywhere

---

## 🚀 You're Done!

The entire system is now:

- ✅ Connected
- ✅ Working
- ✅ Storing data
- ✅ Production-ready

**Celebrate! 🎉**

---

**Last Updated**: November 29, 2025
**Time to Run**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready!
