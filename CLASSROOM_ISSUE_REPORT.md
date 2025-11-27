# Google Classroom Creation Issue - RESOLVED

## Root Causes Found

1. **Expired Google Calendar Token** (Critical)
   - Token expired: November 7, 2025
   - Current date: November 27, 2025
   - Status: 20 days expired
   - All Google Meet and Classroom creation fails due to invalid credentials

2. **Service Account Permission Issue**
   - Error: "Client is unauthorized to retrieve access tokens using this method"
   - Google Service Account needs domain-wide delegation with proper scopes

## Immediate Fix Required

**Reconnect Central Calendar:**
1. Go to: `/setup-central-calendar` 
2. Complete OAuth flow to refresh token
3. This will enable both Google Meet and Google Classroom creation

## Code Fixes Deployed

✅ Fixed `create-booking-with-meet` function - was querying wrong tutor field
✅ Deployed updated edge function

## What Happens After Reconnecting

- **New bookings**: Will automatically get classrooms and meeting links
- **Existing bookings**: Remain without classrooms (can be backfilled if needed)

## Test After Reconnecting

Book a new session and verify:
- Meeting link appears in student dashboard
- Classroom link appears in student dashboard "Classrooms" tab
