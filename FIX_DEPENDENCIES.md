# Fix Supabase Dependencies

Run these commands:

```bash
cd c:\Users\darre\HackSheffield

# Clean install
.\.venv\Scripts\pip.exe uninstall supabase -y
.\.venv\Scripts\pip.exe install supabase --no-deps
.\.venv\Scripts\pip.exe install -r requirements.txt
```

If you still get errors, use this simpler approach:

```bash
# Using conda/poetry instead
pip install supabase-py
```

Or accept the warnings - they often don't affect functionality.
