"""
Quick Google Calendar Re-Authentication Script
Run this to refresh your Google Calendar API token
"""

import os
import sys
import webbrowser

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
    except Exception:
        pass

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/calendar']
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "google_credentials.json")
TOKEN_PATH = os.path.join(os.path.dirname(__file__), "google_token.json")

print("="*80, flush=True)
print("🔐 GOOGLE CALENDAR RE-AUTHENTICATION", flush=True)
print("="*80, flush=True)
print(f"📁 Credentials: {CREDENTIALS_PATH}", flush=True)
print(f"💾 Token destination: {TOKEN_PATH}", flush=True)
print(flush=True)

# Delete expired token if exists
if os.path.exists(TOKEN_PATH):
    try:
        os.remove(TOKEN_PATH)
        print("🗑️ Removed expired token", flush=True)
    except Exception as e:
        print(f"⚠️ Could not delete old token: {e}", flush=True)

print("🌐 Starting local authentication server on port 8080...", flush=True)
print("👉 Your default browser will open automatically.", flush=True)
print("👉 Sign in with your Google Account and click 'Continue' / 'Allow'.", flush=True)
print("="*80, flush=True)

flow = InstalledAppFlow.from_client_secrets_file(
    CREDENTIALS_PATH,
    SCOPES
)

# run_local_server handles state, local HTTP server, and browser opening
creds = flow.run_local_server(
    port=8080,
    prompt='consent',
    access_type='offline'
)

# Save renewed token
with open(TOKEN_PATH, 'w') as token_file:
    token_file.write(creds.to_json())

print("="*80, flush=True)
print("✅ GOOGLE CALENDAR AUTHENTICATION SUCCESSFUL!", flush=True)
print(f"💾 Fresh token saved to: {TOKEN_PATH}", flush=True)
print("🚀 Official Google Meet link generation is now 100% active!", flush=True)
print("="*80, flush=True)
