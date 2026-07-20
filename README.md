# Collaborative Kanban Board

A full-stack, real-time collaborative Kanban board with workspace management, role-based access control, file attachments via Supabase Storage, team chat, and activity logging.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Setup & Installation](#setup--installation)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Features](#features)
- [Deployment](#deployment)

---

## Tech Stack

| Layer        | Technology                                                  |
|--------------|-------------------------------------------------------------|
| Frontend     | React 18, React Router v6, Socket.io-client, Axios          |
| Backend      | Node.js, Express 4, Socket.io                               |
| Database     | MongoDB Atlas (Mongoose ODM)                                |
| Auth         | JWT (access + refresh tokens), bcryptjs                     |
| File Storage | Supabase Storage                                            |
| Email        | Nodemailer                                                  |
| Drag & Drop  | @hello-pangea/dnd                                           |
| API Docs     | Swagger UI (`/api-docs`)                                    |
| Deployment   | Frontend → Vercel, Backend → Render                         |

---

## Architecture Overview

```
Browser (React)
      │
      │  HTTP / REST (Axios)
      │  WebSocket (Socket.io-client)
      ▼
Express API Server  ──────────────▶  MongoDB Atlas
      │
      │  File upload
      ▼
Supabase Storage
      │
      │  Returns public URL
      ▼
URL stored in MongoDB ──────────▶  React displays file
```

### Request flow

1. React sends an authenticated REST request (JWT in `Authorization` header).
2. Express validates the token, checks RBAC, and calls the relevant service.
3. Services interact with MongoDB via Mongoose models.
4. File uploads go directly from the server buffer to Supabase Storage; the returned public URL is stored in MongoDB.
5. Real-time events (task moved, member joined, chat message, attachment uploaded) are broadcast over Socket.io to every client in the same workspace room.

---

## Project Structure

```
Collaborative_Kanban_Board/
└── kanban-board/
    ├── backend/
    │   ├── src/
    │   │   ├── app.js                  # Express app setup (middleware, routes)
    │   │   ├── server.js               # HTTP server + Socket.io boot
    │   │   ├── config/
    │   │   │   ├── database.js         # MongoDB connection
    │   │   │   ├── jwt.js              # JWT helpers
    │   │   │   └── socket.js           # Socket.io init & room logic
    │   │   ├── controllers/
    │   │   │   ├── authController.js
    │   │   │   ├── workspaceController.js
    │   │   │   ├── taskController.js
    │   │   │   ├── invitationController.js
    │   │   │   ├── attachmentController.js
    │   │   │   ├── commentController.js
    │   │   │   ├── chatController.js
    │   │   │   ├── activityController.js
    │   │   │   └── dashboardController.js
    │   │   ├── services/
    │   │   │   ├── authService.js
    │   │   │   ├── workspaceService.js
    │   │   │   ├── taskService.js
    │   │   │   ├── invitationService.js
    │   │   │   ├── attachmentService.js
    │   │   │   ├── storageService.js   # Pluggable storage (local/supabase/cloudinary)
    │   │   │   ├── commentService.js
    │   │   │   ├── emailService.js
    │   │   │   ├── activityLogService.js
    │   │   │   └── dashboardService.js
    │   │   ├── models/
    │   │   │   ├── User.js
    │   │   │   ├── Workspace.js
    │   │   │   ├── Task.js
    │   │   │   ├── Invitation.js
    │   │   │   ├── Attachment.js
    │   │   │   ├── Comment.js
    │   │   │   ├── ChatMessage.js
    │   │   │   └── ActivityLog.js
    │   │   ├── routes/
    │   │   │   ├── authRoutes.js
    │   │   │   ├── workspaceRoutes.js
    │   │   │   ├── taskRoutes.js
    │   │   │   ├── invitationRoutes.js
    │   │   │   ├── attachmentRoutes.js
    │   │   │   ├── commentRoutes.js
    │   │   │   ├── chatRoutes.js
    │   │   │   ├── activityRoutes.js
    │   │   │   └── dashboardRoutes.js
    │   │   ├── middleware/
    │   │   │   ├── auth.js             # JWT protect middleware
    │   │   │   ├── rbac.js             # Role-based access control
    │   │   │   ├── upload.js           # Multer (memory/disk based on UPLOAD_STORAGE)
    │   │   │   ├── validate.js         # express-validator error formatter
    │   │   │   ├── rateLimiter.js
    │   │   │   └── errorMiddleware.js
    │   │   ├── validators/
    │   │   │   └── workspaceValidators.js
    │   │   ├── swagger/
    │   │   │   └── swaggerConfig.js
    │   │   └── utils/
    │   │       ├── apiResponse.js      # Unified success/error response helpers
    │   │       ├── errorHandler.js
    │   │       └── generateToken.js
    │   ├── .env                        # Local environment variables (never commit)
    │   ├── .env.example                # Template — copy to .env
    │   ├── package.json
    │   └── render.yaml                 # Render deployment config
    │
    └── frontend/
        ├── public/
        │   ├── index.html
        │   └── Kanban login logo.png   # App logo (used in Navbar & Login)
        ├── src/
        │   ├── App.js                  # Router setup
        │   ├── index.js                # React entry point
        │   ├── pages/
        │   │   ├── LoginPage.js
        │   │   ├── RegisterPage.js
        │   │   ├── WorkspacesPage.js
        │   │   ├── BoardPage.js
        │   │   ├── DashboardPage.js
        │   │   ├── AcceptInvitePage.js
        │   │   └── NotFoundPage.js
        │   ├── components/
        │   │   ├── common/             # Layout, Navbar, Modal, Button, Input, Spinner…
        │   │   ├── board/              # TaskCard, TaskModal, KanbanColumn, AttachmentSection…
        │   │   ├── workspace/          # WorkspaceCard, InviteModal, CreateWorkspaceModal…
        │   │   └── dashboard/          # Charts and stats widgets
        │   ├── context/
        │   │   ├── AuthContext.js      # User session + token refresh
        │   │   ├── WorkspaceContext.js # Active workspace + members
        │   │   ├── SocketContext.js    # Socket.io connection + subscribe helper
        │   │   ├── ThemeContext.js     # Light / dark mode
        │   │   ├── ToastContext.js     # Global toast notifications
        │   │   └── DashboardContext.js
        │   ├── services/               # Axios wrappers for every API domain
        │   │   ├── api.js              # Axios instance + JWT interceptor
        │   │   ├── authService.js
        │   │   ├── workspaceService.js
        │   │   ├── taskService.js
        │   │   ├── invitationService.js
        │   │   ├── attachmentService.js
        │   │   ├── commentService.js
        │   │   ├── chatService.js
        │   │   ├── activityService.js
        │   │   └── dashboardService.js
        │   ├── routes/
        │   │   └── PublicRoute.js      # Redirect to /workspaces if already logged in
        │   ├── hooks/
        │   │   └── useModal.js
        │   ├── utils/
        │   │   ├── constants.js        # STATUSES, PRIORITIES
        │   │   └── formatters.js       # formatDate, getInitials, isOverdue
        │   └── styles/
        │       └── global.css
        ├── .env                        # Local environment variables (never commit)
        └── package.json
```

---

## Prerequisites

Make sure the following are installed before you begin:

- **Node.js** v18 or later — https://nodejs.org
- **npm** v9 or later (comes with Node)
- **MongoDB Atlas** account — https://cloud.mongodb.com
- **Supabase** account — https://supabase.com

---

## Environment Variables

### Backend — `kanban-board/backend/.env`

Copy `.env.example` to `.env` and fill in every value.

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/kanban_board?retryWrites=true&w=majority

# JWT
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:3000

# URLs
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Supabase (project URL + service-role key from Supabase → Settings → API)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...   # service_role key — keep secret

# File storage backend: local | supabase | cloudinary
UPLOAD_STORAGE=supabase

# Name of the Supabase Storage bucket (must be PUBLIC)
SUPABASE_BUCKET=attachments

# Max upload size in bytes (default 10 MB)
MAX_FILE_SIZE=10485760

# Email (Nodemailer SMTP — used for invitation emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=yourpassword
EMAIL_FROM=no-reply@example.com
```

### Frontend — `kanban-board/frontend/.env`

```env
# Backend API base URL
REACT_APP_API_URL=http://localhost:5000

# App display name
REACT_APP_NAME=Kanban Board
```

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/collaborative-kanban-board.git
cd collaborative-kanban-board/kanban-board
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Open .env and fill in all values (MongoDB URI, JWT secret, Supabase keys…)
npm install
```

### 3. Set up the frontend

```bash
cd ../frontend
# Edit .env — set REACT_APP_API_URL=http://localhost:5000
npm install
```

### 4. Set up Supabase Storage

1. Open your Supabase project → **Storage** → **New bucket**
2. Name it `attachments` (must match `SUPABASE_BUCKET` in `.env`)
3. Toggle **Public bucket** → ON
4. No additional policies needed for a public bucket

---

## Running the App

Open two terminals — one for the backend, one for the frontend.

### Backend

```bash
cd kanban-board/backend

# Development (auto-restarts on file change via nodemon)
npm run dev

# Production
npm start
```

The API starts at **http://localhost:5000**
Swagger docs at **http://localhost:5000/api-docs**

### Frontend

```bash
cd kanban-board/frontend

# Development server
npm start
```

The app opens at **http://localhost:3000**

### Run tests (backend)

```bash
cd kanban-board/backend

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

---

## API Reference

Interactive docs are available at `/api-docs` when the backend is running.

| Method   | Endpoint                                  | Description                        | Auth  |
|----------|-------------------------------------------|------------------------------------|-------|
| POST     | `/auth/register`                          | Register a new user                | No    |
| POST     | `/auth/login`                             | Login, returns JWT                 | No    |
| GET      | `/auth/me`                                | Get current user                   | Yes   |
| GET      | `/workspaces`                             | List user's workspaces             | Yes   |
| POST     | `/workspaces`                             | Create workspace                   | Yes   |
| POST     | `/workspaces/join`                        | Join via invite code               | Yes   |
| GET      | `/workspaces/:id/members`                 | List members with emails & roles   | Yes   |
| PATCH    | `/workspaces/:id/members/:memberId`       | Update member role (owner only)    | Yes   |
| DELETE   | `/workspaces/:id/leave`                   | Leave a workspace                  | Yes   |
| GET      | `/tasks?workspaceId=`                     | List tasks for a workspace         | Yes   |
| POST     | `/tasks`                                  | Create task                        | Yes   |
| PATCH    | `/tasks/:id`                              | Update task                        | Yes   |
| DELETE   | `/tasks/:id`                              | Delete task                        | Yes   |
| POST     | `/invitations`                            | Send invitation email              | Yes   |
| GET      | `/invitations/:workspaceId`               | List invitations                   | Yes   |
| POST     | `/invitations/accept`                     | Accept via token from email link   | Yes   |
| POST     | `/invitations/:id/resend`                 | Resend invitation                  | Yes   |
| DELETE   | `/invitations/:id`                        | Cancel invitation                  | Yes   |
| GET      | `/attachments/task/:taskId`               | List task attachments              | Yes   |
| POST     | `/attachments/task/:taskId`               | Upload file → Supabase Storage     | Yes   |
| GET      | `/attachments/:id/download`               | Download / redirect to file URL    | Yes   |
| DELETE   | `/attachments/:id`                        | Delete attachment                  | Yes   |
| GET      | `/comments/:taskId`                       | List task comments                 | Yes   |
| POST     | `/comments/:taskId`                       | Add comment                        | Yes   |
| GET      | `/chat/:workspaceId`                      | List workspace chat messages       | Yes   |
| POST     | `/chat/:workspaceId`                      | Send chat message                  | Yes   |
| GET      | `/activity/:taskId`                       | Task activity log                  | Yes   |
| GET      | `/dashboard`                              | Workspace stats & charts           | Yes   |
| GET      | `/health`                                 | Server health check                | No    |

---

## Features

- **Kanban Board** — drag-and-drop task cards across status columns (To Do / In Progress / In Review / Done) powered by `@hello-pangea/dnd`
- **Real-time Collaboration** — task updates, member joins, chat messages, and attachment events broadcast instantly via Socket.io
- **Workspaces** — create multiple workspaces, join by invite code, manage members
- **Role-based Access Control** — five roles: `owner → admin → manager → member → viewer` with per-action enforcement on both frontend and backend
- **Invitations** — owner/manager sends email invite link; status changes from `pending` to `accepted` when the user clicks the link and joins
- **Member Management** — owner can view all member emails and change any member's role from within the Invite & Members modal
- **File Attachments** — upload images, PDFs, Word, Excel, ZIP (up to 10 MB); stored in Supabase Storage; inline preview lightbox for images and PDFs
- **Comments** — threaded comments per task with real-time updates
- **Team Chat** — per-workspace chat panel
- **Activity Log** — automatic audit trail for every task change, upload, and member event
- **Dashboard** — charts showing task distribution by status/priority, overdue tasks, member activity
- **Dark Mode** — system-aware theme with manual toggle persisted to localStorage
- **Responsive UI** — mobile-first navbar with slide-in drawer, works on all screen sizes

---

## Deployment

### Backend → Render

1. Push the repo to GitHub.
2. Create a new **Web Service** on Render, point it to the `kanban-board/backend` directory.
3. Set **Build command**: `npm install`
4. Set **Start command**: `npm start`
5. Add all environment variables from `.env.example` in the Render dashboard.
6. Update `ALLOWED_ORIGINS` to your Vercel frontend URL.

### Frontend → Vercel

1. Import the repo in Vercel, set **Root directory** to `kanban-board/frontend`.
2. Framework preset: **Create React App**.
3. Add environment variable: `REACT_APP_API_URL=https://your-render-backend.onrender.com`
4. Deploy.

> After deploying, update `FRONTEND_URL` and `ALLOWED_ORIGINS` in the Render environment variables to match your Vercel URL, then redeploy the backend.
