<div align="center">
<img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/SQLite-Database-lightblue?style=for-the-badge&logo=sqlite" />
<img src="https://img.shields.io/badge/TailwindCSS-3-38bdf8?style=for-the-badge&logo=tailwindcss" />
# 📝 AI Notes Workspace
 
### *A collaborative, AI-powered notes workspace — built full-stack*
 
[Features](#-features) · [Demo](#-demo) · [Tech Stack](#-tech-stack) · [Setup](#-quick-start) · [API](#-api-reference)
 
</div>
---
 
## ✨ Features
 
| | Feature | Description |
|---|---|---|
| 🔐 | **Authentication** | Secure signup/login with JWT & bcrypt |
| 🗒️ | **Notes Workspace** | Create, edit, tag, categorise, archive notes |
| ✦ | **AI Integration** | Summaries, action items & title suggestions via Groq LLM |
| 🔍 | **Search & Filter** | Debounced search, tag filtering, sort by date |
| 🔗 | **Public Sharing** | One-click share links, clean public read view |
| 📊 | **Insights Dashboard** | Stats, weekly activity chart, top tags, AI usage |
| 💾 | **Auto-Save** | Changes saved automatically after 800ms of inactivity |
 
---
 
## 🎬 Demo
 
> **Authentication → Notes → AI Summary → Share → Dashboard**
 
| Login Page | Notes Workspace | AI Summary Panel |
|---|---|---|
| ![Login](screenshots/login.png) | ![Notes](screenshots/notes.png) | ![AI](screenshots/ai.png) |
 
| Note Editor | Public Share | Dashboard |
|---|---|---|
| ![Editor](screenshots/editor.png) | ![Share](screenshots/share.png) | ![Dashboard](screenshots/dashboard.png) |
 
---
 
## 🏗 Architecture
 
```
ai-notes-workspace/
├── app/
│   ├── api/                        # REST API (Next.js Route Handlers)
│   │   ├── auth/                   # signup · login · me/logout
│   │   ├── notes/                  # CRUD + AI summary generation
│   │   ├── shared/[shareId]/       # Public note endpoint
│   │   └── insights/               # Dashboard statistics
│   ├── (auth)/                     # Login & signup pages
│   ├── notes/                      # Notes list & editor
│   ├── dashboard/                  # Insights dashboard
│   └── shared/[shareId]/           # Public share page (SSR)
├── lib/
│   ├── db.ts                       # SQLite database layer
│   ├── auth.ts                     # JWT utilities
│   └── ai.ts                       # Groq AI integration
└── middleware.ts                   # Route protection
```
 
### Database Schema
 
```
users        → id · name · email · password_hash · created_at
notes        → id · user_id · title · content · is_archived · is_public · share_id · category · timestamps
tags         → id · name · user_id
note_tags    → note_id · tag_id  (junction table)
ai_summaries → id · note_id · user_id · summary · action_items (JSON) · suggested_title · created_at
```
 
---
 
## 🛠 Tech Stack
 
| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack in one repo, great DX |
| **Language** | TypeScript | Type safety across frontend & backend |
| **Database** | SQLite (better-sqlite3) | Zero setup, fast, production-ready for this scale |
| **Auth** | JWT (jose) + bcryptjs | Stateless, secure, simple |
| **AI** | Groq (llama-3.3-70b) | Fast inference, generous free tier |
| **Styling** | Tailwind CSS + CSS Variables | Rapid, consistent theming |
 
---
 
## 🚀 Quick Start
 
### 1. Clone & Install
 
```bash
git clone https://github.com/yourusername/ai-notes-workspace
cd ai-notes-workspace
npm install
```
 
### 2. Environment Setup
 
```bash
cp .env.example .env.local
```
 
Edit `.env.local`:
 
```env
DATABASE_URL=./data/peblo.db
JWT_SECRET=your-32-character-secret-here
GROQ_API_KEY=gsk_your-groq-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
 
> Get a free Groq API key at → **https://console.groq.com**
 
### 3. Run
 
```bash
npm run dev
```
 
Open **http://localhost:3000** — database is created automatically on first run ✅
 
### 4. Build for Production
 
```bash
npm run build
npm start
```
 
---
 
## 📡 API Reference
 
### Authentication
```
POST   /api/auth/signup     { name, email, password }
POST   /api/auth/login      { email, password }
GET    /api/auth/me         → current user
DELETE /api/auth/me         → logout
```
 
### Notes
```
GET    /api/notes                          → list (query: search, tag, archived, sort)
POST   /api/notes                          { title, content, tags[], category }
GET    /api/notes/:id                      → note + tags + latest AI summary
PATCH  /api/notes/:id                      { title?, content?, tags?, is_public?, is_archived? }
DELETE /api/notes/:id                      → permanent delete
POST   /api/notes/:id/generate-summary     → trigger AI generation
```
 
### Share & Insights
```
GET /api/shared/:shareId    → public note (no auth)
GET /api/insights           → dashboard stats
```
 
### Sample AI Response
```json
{
  "summary": "Sprint planning session covering UI mockups and API review deadlines.",
  "action_items": ["Prepare UI mockups by Friday", "Review API structure on Monday"],
  "suggested_title": "Sprint 12 Planning Notes"
}
```
 
---
 
## 🔒 Security
 
- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** tokens, 7-day expiry, signed with HS256
- **HttpOnly + SameSite** cookies — not accessible to JavaScript
- All note operations verify resource ownership
- Public notes accessed only via opaque **nanoid share tokens**
- No secrets committed — `.env.local` is gitignored
---
 
## 🌟 Highlights
 
- ✅ **Auto-save** — debounced 800ms saves while typing
- ✅ **Optimistic UI** — instant feedback on all actions
- ✅ **SSR public pages** — share pages render server-side for SEO
- ✅ **Zero-setup database** — SQLite creates itself on first run
- ✅ **Responsive design** — works on mobile & desktop
---
 
<div align="center">
Built with ❤️ as part of the **Peblo Full Stack Developer Challenge**
 
</div>
 