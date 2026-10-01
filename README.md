# FunctionSheetV1

A browser-based Function & Events Operations Portal for creating, distributing, following up and archiving hotel Function Sheets.

## Included in V1

- Dashboard for current/upcoming functions
- Function Sheet creation and editing
- Same operational sections as the existing sheet: F&B, Kitchen, Housekeeping, HR, Engineering & IT, Accounts
- Editable recipient settings (TO/CC/BCC, enabled/disabled)
- Submit/distribute workflow using the user's default email client
- Revision and cancellation history
- Full searchable archive/history
- Department follow-up tasks
  - Not Started
  - In Progress
  - Ready
  - N/A
  - Blocked
  - Cancelled
  - ETA, assignment and comments
- Overall readiness indicator
- Permanent activity timeline
- Post-event feedback / remarks / lessons learned
- File/photo/video attachment support
- Event close/reopen flow
- Printing
- Responsive mobile layout
- Export/import backup

## Running locally

No build system is required. Open `index.html` in a browser or serve the repository with any static web server.

Example:

```bash
python -m http.server 8080
```

Then browse to `http://localhost:8080`.

## GitHub Pages

This repository is intentionally static so it can be hosted directly with GitHub Pages.

Enable Pages in repository **Settings → Pages**, select **Deploy from a branch**, then use the `main` branch and root folder.

## Important production note

V1 is a functional front-end prototype and stores records in browser `localStorage`. Attachments up to 2 MB are persisted inline; larger files are recorded as metadata only.

For hotel production / multi-user operation, the next phase should add:

- Server database (PostgreSQL)
- Microsoft Entra ID / Active Directory authentication
- Role-based permissions (Sales, Department User, Department Head, GM/Operations, Admin)
- Microsoft Graph / Microsoft 365 email delivery instead of `mailto:`
- Server-side attachment storage
- Immutable audit log and revision snapshots
- Notifications/reminders/escalations
- Real-time multi-user updates
- QR code per Function Sheet
- Venue/equipment conflict detection
- Calendar view and management reporting

## Sample record

The initial demo includes the United Arab Emirates Football Association event from 2–3 October 2026 so the system can be reviewed immediately.