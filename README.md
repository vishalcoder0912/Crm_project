# Digital Order & Operations Management System

Production-ready operational management platform for curtain/blind/customized furnishing businesses.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Frontend:** React + Vite + TypeScript
- **Auth:** JWT (bcrypt + refresh tokens)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Default Login

- **Admin:** admin@furnishops.com / Admin@123
- **Sales:** sales@furnishops.com / Sales@123

## Project Structure

```
backend/   — Express API server
frontend/  — React SPA
```
