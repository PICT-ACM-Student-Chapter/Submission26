# Pulzion 2026 - Submission Backend API Documentation

> **Base URL**: `http://localhost:3001`  
> **Production Base URL**: `https://submission.pulzion.pictacm.in`  
> **Integrated EMS Base URL**: `https://api.pulzion.pictacm.in`

---

## 📑 Table of Contents
1. [Authentication & Architecture Overview](#authentication--architecture-overview)
2. [Health Check](#health-check)
3. [User & Authentication Routes](#user--authentication-routes)
4. [Competition Submission Routes (4 Target Events)](#competition-submission-routes)
   - [Event 1: Freeze The Second (EMS ID: 10)](#event-1-freeze-the-second-ems-id-10)
   - [Event 2: Innowave (EMS ID: 12)](#event-2-innowave-ems-id-12)
   - [Event 3: HackNova (EMS ID: 20)](#event-3-hacknova-ems-id-20)
   - [Event 4: Root Cause (EMS ID: 21)](#event-4-root-cause-ems-id-21)
5. [Submission Portal Configuration Routes](#submission-portal-configuration-routes)
6. [Catalog & EMS Sync Routes](#catalog--ems-sync-routes)
7. [Admin Management Routes](#admin-management-routes)
8. [Summary of Endpoints Quick Reference](#summary-of-endpoints-quick-reference)

---

## 🔐 Authentication & Architecture Overview

The Submission Backend delegates user authentication to the EMS API via `POST https://api.pulzion.pictacm.in/user/app/signin` (which bypasses reCAPTCHA):

1. **Sign In**: Send participant credentials (`email` and `password`) to `POST /user/signin`.
2. **Auto-Sync**: The server automatically:
   - Upserts the participant in the local `users` table.
   - Fetches registered events from EMS (`GET /user_events/`).
   - Syncs matching active events (`10`, `12`, `20`, `21`) into `user_events`.
   - Generates a Submission JWT session token (valid for 1 Day / 24 hours).
3. **Protected Requests**: For all user endpoints, pass:
   ```http
   Authorization: Bearer <token>
   ```
   Tokens remain valid for 24 hours from issuance.
4. **Admin Requests**: For admin management & CSV export, pass:
   ```http
   Authorization: Bearer <adminToken>
   ```
   Admin session tokens also remain valid for 24 hours from issuance.

---

## 🟢 Health Check

### `GET /`
Check if the service is online.

- **Auth**: None
- **Response**: `200 OK`
  ```text
  pong
  ```

---

## 👤 User & Authentication Routes

### 1. `POST /user/signin`
Authenticate participant using their EMS credentials.

- **Auth**: None
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "participant@pulzion.co.in",
    "password": "<user_password>"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": 1,
      "first_name": "Test",
      "last_name": "Participant",
      "email": "participant@pulzion.co.in",
      "mobile_number": "9876543210",
      "college": "PICT",
      "year": "TE",
      "ems_id": 105
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "ems_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### 2. `GET /user/me`
Retrieve the currently logged-in participant's profile.

- **Auth**: `Authorization: Bearer {{token}}`
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": 1,
      "first_name": "Test",
      "last_name": "Participant",
      "email": "participant@pulzion.co.in",
      "mobile_number": "9876543210",
      "college": "PICT",
      "year": "TE"
    }
  }
  ```

---

### 3. `GET /user/user_events`
Retrieve all Pulzion events the logged-in participant is registered for.

- **Auth**: `Authorization: Bearer {{token}}`
- **Response**: `200 OK`
  ```json
  {
    "events": [
      {
        "id": 1,
        "fk_user": 1,
        "fk_event": 10,
        "name": "FREEZE THE SECOND",
        "description": "Photography event...",
        "type": "Non Technical",
        "mode": "Online"
      },
      {
        "id": 2,
        "fk_user": 1,
        "fk_event": 20,
        "name": "HACKNOVA",
        "description": "Hackathon...",
        "type": "Technical",
        "mode": "Blended"
      }
    ]
  }
  ```

---

### 4. `DELETE /user/signout`
Invalidate the current participant's session token.

- **Auth**: `Authorization: Bearer {{token}}`
- **Response**: `200 OK`
  ```json
  {
    "message": "User Logged Out Successfully!!"
  }
  ```

---

## 🏆 Competition Submission Routes

### Quick Event Submission Matrix

| # | Event | Submission Requirements | Format & Inputs Accepted | Status |
|---|---|---|---|---|
| **1** | **ROOT CAUSE** | GitHub repository/fork and relevant branch or Pull Request (PR) links | `github_repo_url` (repo/fork link), `github_pr_url` (branch or PR link), optional patch upload | **Provided** |
| **2** | **HACKNOVA** | PPTX or PDF presentation, GitHub repository link, Project ZIP archive | `presentation_file` (PPTX/PDF), `github_url`, `project_file` (ZIP), `live_demo_url` | **Provided** |
| **3** | **FREEZE THE SECOND** | One photograph per participant (strictly JPG, JPEG, or PNG) | `file` (JPG/JPEG/PNG image), `photo_title`, `camera_device`, `description` | **Strict 1 Photo** |
| **4** | **INNOWAVE** | Presentation pitch deck (strictly PPTX or PDF) | `deck_file` (PPTX or PDF), `track`, `team_name`, `video_pitch_url` | **Provided** |

---

### Event 1: Root Cause (EMS ID: 21)
> **Theme**: PICT OSS Bugathon  
> **Submission Format**: GitHub repository/fork link and relevant branch or Pull Request (PR) links. Optional patch archive (`.patch`, `.diff`, `.zip`).

#### A. Submit via JSON (Links)
- **Method & Path**: `POST /rootcause/` (or `POST /rootcause/post`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "team_name": "RootBusters",
    "github_repo_url": "https://github.com/myusername/rootcause-bugathon-fork",
    "github_pr_url": "https://github.com/pict-oss/bugathon/pull/101",
    "notes": "Fixed thread concurrency race condition in the event dispatcher loop"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Root Cause fix submitted successfully!",
    "submission": {
      "id": 1,
      "team_name": "RootBusters",
      "github_repo_url": "https://github.com/myusername/rootcause-bugathon-fork",
      "github_pr_url": "https://github.com/pict-oss/bugathon/pull/101",
      "notes": "Fixed thread concurrency race condition in the event dispatcher loop",
      "active_submission": true,
      "fk_user": 1
    }
  }
  ```

#### B. Submit via Multipart Form (Links + Optional Patch File)
- **Method & Path**: `POST /rootcause/`
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  | Field | Type | Description |
  |---|---|---|
  | `github_repo_url` | Text | Link to your GitHub repository or fork. |
  | `github_pr_url` | Text | Link to the relevant branch or Pull Request (PR). |
  | `team_name` | Text | Solo or duo team name. |
  | `notes` | Text | Detailed explanation of root cause and performance improvements. |
  | `patch_file` | File | Optional `.patch`, `.diff`, or `.zip` file uploaded to S3. |

#### C. Get My Root Cause Submission
- **Method & Path**: `GET /rootcause/` (or `GET /rootcause/get`)
- **Auth**: `Authorization: Bearer {{token}}`

---

### Event 2: HackNova (EMS ID: 20)
> **Theme**: 24-Hour Hackathon  
> **Submission Format**: PPTX or PDF presentation deck, GitHub repository link, and Project ZIP archive.

#### A. Submit via Multipart Form (Upload Deck + ZIP directly)
- **Method & Path**: `POST /hacknova/` (or `POST /hacknova/post`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  | Field | Type | Description |
  |---|---|---|
  | `presentation_file` | File | Presentation pitch deck (`.pptx` or `.pdf`) uploaded to S3. |
  | `project_file` | File | Complete project source code archive (`.zip`) uploaded to S3. |
  | `github_url` | Text | Public GitHub / GitLab repository URL. |
  | `project_title` | Text | Title of the hackathon project. |
  | `team_name` | Text | Participating team name. |
  | `live_demo_url` | Text | Optional live deployment link (Vercel, Netlify, Render). |
  | `notes` | Text | Architecture overview and tech stack used. |

- **Sample Response**: `200 OK`
  ```json
  {
    "message": "HackNova project submitted successfully!",
    "submission": {
      "id": 1,
      "project_title": "AI Disaster Dispatcher",
      "github_url": "https://github.com/pict/hacknova-team-alpha",
      "presentation_url": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/hacknova/1-1718000000000-deck.pptx",
      "project_zip_url": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/hacknova/1-1718000000000-project.zip",
      "live_demo_url": "https://hacknova-alpha.vercel.app",
      "team_name": "Team Alpha",
      "active_submission": true,
      "fk_user": 1
    }
  }
  ```

#### B. Direct S3 Upload Helper Endpoint
Upload a PPTX, PDF, or ZIP file to S3 first to obtain its URL:
- **Method & Path**: `POST /hacknova/upload-file`
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `multipart/form-data`
- **Body**: Attach file in form data
- **Response**: `200 OK`
  ```json
  {
    "message": "File uploaded successfully to S3",
    "url": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/hacknova/1-1718000000000-deck.pdf",
    "original_name": "pitch_deck.pdf",
    "mime_type": "application/pdf",
    "size": 4518290
  }
  ```

#### C. Submit via JSON (Using S3 URLs)
- **Method & Path**: `POST /hacknova/`
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "project_title": "AI Disaster Dispatcher",
    "team_name": "Team Alpha",
    "github_url": "https://github.com/pict/hacknova-team-alpha",
    "presentation_url": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/hacknova/1-1718000000000-deck.pptx",
    "project_zip_url": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/hacknova/1-1718000000000-project.zip",
    "live_demo_url": "https://hacknova-alpha.vercel.app",
    "notes": "Next.js, Node.js, Neon PostgreSQL"
  }
  ```

#### D. Get My HackNova Submission
- **Method & Path**: `GET /hacknova/` (or `GET /hacknova/get`)
- **Auth**: `Authorization: Bearer {{token}}`

---

### 👥 HackNova Team Registration (2–4 Members)

The HackNova Team Registration endpoints automatically fetch the authenticated team leader's verified profile and permanently lock the team roster upon submission.

#### 1. Fetch Leader Details & Registration Status
- **Method & Path**: `GET /hacknova/team/me` (or `GET /api/hacknova/team/me`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Response**: `200 OK`
  ```json
  {
    "leader": {
      "user_id": 1,
      "name": "Jane Leader",
      "email": "jane@example.com",
      "phone": "9876543210",
      "college": "PICT",
      "year": "TE",
      "ems_id": 105
    },
    "is_registered_for_event": true,
    "is_team_registered": false,
    "is_locked": false,
    "submission_active": true,
    "team": null
  }
  ```

#### 2. Submit Team Registration
- **Method & Path**: `POST /hacknova/team` (or `POST /api/hacknova/team`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `application/json`
- **Rules**:
  - `team_name`: Mandatory (2–255 characters).
  - Member 1 (Leader): Automatically bound to authenticated user.
  - Member 2: Mandatory (`name`, `email`, `phone`).
  - Member 3: Optional (`name`, `email`, `phone`).
  - Member 4: Optional (`name`, `email`, `phone` — cannot be added without Member 3).
  - All member emails and phone numbers must be unique within the team.
  - Team leader can register only once (permanently locked on success).
- **Request Body**:
  ```json
  {
    "team_name": "CyberKnights",
    "members": [
      {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "9876543211"
      },
      {
        "name": "Alice Smith",
        "email": "alice.smith@example.com",
        "phone": "9876543212"
      }
    ]
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "HackNova team registered successfully!",
    "is_locked": true,
    "team": {
      "id": 1,
      "team_name": "CyberKnights",
      "leader_user_id": 1,
      "created_at": "2026-10-18T12:30:00.000Z",
      "members": [
        { "id": 1, "user_name": "Jane Leader", "email": "jane@example.com", "phone": "9876543210", "role": "leader" },
        { "id": 2, "user_name": "John Doe", "email": "john.doe@example.com", "phone": "9876543211", "role": "member" },
        { "id": 3, "user_name": "Alice Smith", "email": "alice.smith@example.com", "phone": "9876543212", "role": "member" }
      ]
    }
  }
  ```

#### 3. Check Team Lock Status
- **Method & Path**: `GET /hacknova/team/status` (or `GET /api/hacknova/team/status`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Response**: `200 OK`
  ```json
  {
    "isRegistered": true,
    "is_locked": true,
    "team": { ... }
  }
  ```

---

### Event 3: Freeze The Second (EMS ID: 10)
> **Theme**: Photography Contest  
> **Accepted Files**: Strictly **JPG, JPEG, PNG** images, max size **35 MB**.  
> **Constraint**: Strictly **ONE photograph per participant** is permitted.

#### A. Submit via File Upload (AWS S3)
- **Method & Path**: `POST /freeze/` (or `POST /freeze/upload` / `POST /freeze/post`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  | Field | Type | Description |
  |---|---|---|
  | `file` (or `photo`) | File | Photograph image (`.jpg`, `.jpeg`, `.png`) uploaded directly to AWS S3. |
  | `photo_title` | Text | Title or caption for the photo. |
  | `camera_device` | Text | Camera device used (e.g., `Sony A7 IV - 35mm f/1.8`, `iPhone 15 Pro`). |
  | `description` | Text | Perspective, story, or camera settings (ISO, Shutter speed, Aperture). |

- **Sample Response**: `200 OK`
  ```json
  {
    "message": "Photo submitted successfully!",
    "submission": {
      "id": 1,
      "submission": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/freeze/1-1718000000000-photo.jpg",
      "photo_title": "Monochrome Reflections",
      "camera_device": "Sony A7 IV - 35mm f/1.8",
      "description": "Natural ambient lighting capturing geometric symmetry",
      "active_submission": true,
      "fk_user": 1,
      "created_at": "2026-10-16T17:40:00.000Z"
    }
  }
  ```

#### B. Duplicate Submission Protection
If a participant tries to upload a second photo, the backend rejects it with `400 Bad Request`:
```json
{
  "error": "Only one photograph per participant is permitted for Freeze the Second. You have already submitted your photograph."
}
```

#### C. Get My Freeze Submission
- **Method & Path**: `GET /freeze/` (or `GET /freeze/get`)
- **Auth**: `Authorization: Bearer {{token}}`

---

### Event 4: Innowave (EMS ID: 12)
> **Theme**: Ideathon & Pitch Contest  
> **Accepted Files**: Strictly **PPTX or PDF** presentation decks, max size **50 MB**.

#### A. Submit Round 1 Deck (AWS S3)
- **Method & Path**: `POST /innowave/` (or `POST /innowave/upload` / `POST /innowave/post`)
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  | Field | Type | Description |
  |---|---|---|
  | `deck_file` (or `file`) | File | Presentation pitch deck (`.pptx` or `.pdf`) uploaded directly to AWS S3. |
  | `track` | Text | Track / Problem Domain (e.g., `FinTech`, `Healthcare AI`, `Sustainability`). |
  | `team_name` | Text | Name of the participating team. |
  | `video_pitch_url` | Text | Optional unlisted video link (YouTube, Loom, Google Drive). |

- **Sample Response**: `200 OK`
  ```json
  {
    "message": "Innowave submission uploaded successfully!",
    "submission": {
      "id": 1,
      "innowave_type": "FinTech",
      "submission": "https://pulzion-submissions-bucket.s3.ap-south-1.amazonaws.com/innowave/1-1718000000000-deck.pptx",
      "video_pitch_url": "https://youtu.be/pitch_demo_video",
      "team_name": "FinWave",
      "active_submission": true,
      "fk_user": 1
    }
  }
  ```

#### B. Update Round 2 Changelog
- **Method & Path**: `PATCH /innowave/changelog`
- **Auth**: `Authorization: Bearer {{token}}`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "changelog": "Round 2 updates: Integrated live prototype demo link, refined user acquisition CAC/LTV unit economics on slide 10."
  }
  ```
- **Response**: `200 OK`

#### C. Get My Innowave Submission
- **Method & Path**: `GET /innowave/` (or `GET /innowave/get`)
- **Auth**: `Authorization: Bearer {{token}}`

---

## ⚙️ Submission Portal Configuration Routes

### 1. `GET /submission/:route`
Public check to see if an event's submission portal is currently open/active.

- **Auth**: None
- **URL Param**: `route` (`freeze`, `innowave`, `hacknova`, `rootcause`)
- **Example**: `GET /submission/freeze`
- **Response**: `200 OK`
  ```json
  {
    "status": true
  }
  ```

---

### 2. `GET /submission/get`
Admin view of all configured submission portals and their status.

- **Auth**: `Authorization: Bearer {{adminToken}}`
- **Response**: `200 OK`
  ```json
  [
    { "event_id": 10, "event_name": "FREEZE THE SECOND", "event_route": "/freeze", "event_status": true },
    { "event_id": 12, "event_name": "INNOWAVE", "event_route": "/innowave", "event_status": true },
    { "event_id": 20, "event_name": "HACKNOVA", "event_route": "/hacknova", "event_status": true },
    { "event_id": 21, "event_name": "ROOT CAUSE", "event_route": "/rootcause", "event_status": true }
  ]
  ```

---

### 3. `PATCH /submission/update/:id` (or `POST /admin/submission-status/:id`)
Toggle submission acceptance active or inactive for a specific event.

- **Auth**: `Authorization: Bearer {{adminToken}}`
- **URL Param**: `id` (`10`, `12`, `20`, `21` or event aliases like `freeze`, `hacknova`)
- **Body**:
  ```json
  {
    "status": false
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Submissions for FREEZE THE SECOND are now INACTIVE (Closed).",
    "event_id": 10,
    "event_status": false
  }
  ```

> When `event_status` is `false`, any submission attempts for this event will be immediately rejected with `403 Forbidden` (`{"error": "Submissions for <Event> are currently closed."}`).

---

### 4. `PATCH /submission/update-all` (or `POST /admin/submission-status/toggle-all`)
Batch update all event submission statuses in one click.

- **Auth**: `Authorization: Bearer {{adminToken}}`
- **Body**:
  ```json
  {
    "status": true
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "All event submissions set to ACTIVE (Accepting submissions).",
    "event_status": true
  }
  ```

---

## 🌐 Catalog & EMS Sync Routes

### 1. `GET /allevents/events`
Proxies and fetches live event records from the central EMS API.

- **Auth**: None
- **Response**: `200 OK` (Array of events from EMS)

### 2. `GET /allevents/addevents`
Fetches all events from the local database `event` table.

- **Auth**: None
- **Response**: `200 OK`

---

## 🛡️ Admin Management Routes

### 1. `POST /admin/signin`
Authenticate event managers and leads.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "username": "submissionbackend",
    "password": "<admin_password>"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "admin": { "id": 2, "username": "submissionbackend" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### 2. `POST /admin/signup`
Create a new admin account via API.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "username": "newEventLead",
    "password": "<new_admin_password>"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "admin": { "id": 3, "username": "newEventLead" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### 3. CLI Script: Provision Admin
You can also provision or reset an admin account via CLI:
```bash
npm run create-admin <username> <password>
```
Example:
```bash
npm run create-admin submissionbackend <admin_password>
```

---

### 4. `GET /admin/csv/:event` (or direct: `/:event/csv`)
Export all submissions for an event as a downloadable CSV spreadsheet with full participant details (Name, Email, Mobile, College, Year, EMS ID), submission files/links, and timestamps.

- **Auth**: Admin (`Authorization: Bearer {{adminToken}}` or `?token={{adminToken}}`)
- **URL Param**: `event` (`hacknova`, `freeze`, `innowave`, `rootcause`, or EMS IDs `20`, `10`, `12`, `21`)
- **Direct Event Routes**:
  - `GET /hacknova/csv`
  - `GET /freeze/csv`
  - `GET /innowave/csv`
  - `GET /rootcause/csv`
- **Response**: UTF-8 CSV attachment with Excel BOM: `<Event>_submissions_<YYYY-MM-DD>.csv`

---

### 5. `GET /admin/csv/all` (Master Combined CSV)
Export all participant submissions across all 4 competition events in a unified CSV spreadsheet.

- **Auth**: Admin (`Authorization: Bearer {{adminToken}}` or `?token={{adminToken}}`)
- **Endpoint**: `GET /admin/csv/all` or `GET /admin/submissions/csv`
- **Response**: `Pulzion2026_All_Events_Submissions_<YYYY-MM-DD>.csv`

---

### 6. `GET /admin/csv/summary`
JSON list of all competition events with current submission counts and download links.

- **Auth**: Admin (`Authorization: Bearer {{adminToken}}` or `?token={{adminToken}}`)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "totalEvents": 4,
    "events": [
      {
        "key": "hacknova",
        "name": "HackNova",
        "emsId": 20,
        "table": "hacknova",
        "submissionsCount": 1,
        "downloadPath": "/admin/csv/hacknova",
        "directPath": "/hacknova/csv"
      }
    ],
    "allEventsDownload": "/admin/csv/all"
  }
  ```

---

### 7. `GET /admin/portal`
Visual Web Portal for Event Leads to check submission counts and download event CSVs with one click.

- **Auth**: Admin (`?token={{adminToken}}` or `Authorization: Bearer {{adminToken}}`)
- **Response**: Interactive HTML web dashboard with authenticated download buttons.

---

## 📋 Summary of Endpoints Quick Reference

| Module | Method | Endpoint | Auth | Purpose |
|---|---|---|---|---|
| **Health** | `GET` | `/` | None | Service ping |
| **Auth** | `POST` | `/user/signin` | None | Authenticate via EMS & sync user events |
| **Auth** | `GET` | `/user/me` | User | Get logged-in user profile |
| **Auth** | `GET` | `/user/user_events` | User | Get registered events |
| **Auth** | `DELETE` | `/user/signout` | User | Invalidate session |
| **Freeze** | `POST` | `/freeze/` | User | Upload photo to S3 / submit photo URL |
| **Freeze** | `GET` | `/freeze/` | User | View own photo submission |
| **Freeze** | `GET` | `/freeze/getresult` | Admin | View all participants' photos |
| **Freeze** | `GET` | `/freeze/csv` | Admin | Download Freeze the Second CSV |
| **Innowave** | `POST` | `/innowave/` | User | Upload pitch deck PDF/PPT to S3 |
| **Innowave** | `PATCH` | `/innowave/changelog` | User | Update Round 2 changelog notes |
| **Innowave** | `GET` | `/innowave/` | User | View own deck submission |
| **Innowave** | `GET` | `/innowave/getresult`| Admin | View all participants' decks |
| **Innowave** | `GET` | `/innowave/csv` | Admin | Download InnoWave CSV |
| **HackNova** | `POST` | `/hacknova/` | User | Submit code ZIP to S3 + GitHub link |
| **HackNova** | `GET` | `/hacknova/` | User | View own HackNova submission |
| **HackNova** | `GET` | `/hacknova/getresult`| Admin | View all HackNova submissions |
| **HackNova** | `GET` | `/hacknova/csv` | Admin | Download HackNova CSV |
| **Root Cause**| `POST`| `/rootcause/` | User | Submit patch ZIP to S3 + Bug PR link |
| **Root Cause**| `GET` | `/rootcause/` | User | View own Root Cause submission |
| **Root Cause**| `GET` | `/rootcause/getresult`| Admin | View all Root Cause submissions |
| **Root Cause**| `GET` | `/rootcause/csv` | Admin | Download Root Cause CSV |
| **Admin CSV** | `GET` | `/admin/csv/:event` | Admin | Download specific event CSV by name/ID |
| **Admin CSV** | `GET` | `/admin/csv/all` | Admin | Download Master CSV for all events |
| **Admin CSV** | `GET` | `/admin/csv/summary`| Admin | JSON list of event submission stats |
| **Admin CSV** | `GET` | `/admin/portal` | Admin | Web dashboard for one-click downloads |
| **Portal** | `GET` | `/submission/:route` | None | Check if submission portal is active |
| **Admin** | `POST` | `/admin/signin` | None | Admin login |
| **Admin** | `POST` | `/admin/signup` | Admin | Create new admin account |
| **Admin** | `GET` | `/admin/me` | Admin | View logged-in admin profile |
| **Admin** | `POST` | `/admin/signout` | Admin | Invalidate admin token |
