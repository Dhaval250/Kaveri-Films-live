# Kaveri Metallising – Production Planning System

Full-stack Next.js app with:
- Production Planning (Add + List)
- Production Department (Assignment + Review)
- Operator Module (My Assignments, Start Work, Enter Production)
- Login + Profile + Change Password

## Tech
- Next.js 14 + TypeScript + Tailwind
- MySQL (phpMyAdmin) via **mysql2** (no Prisma)
- JWT auth

## Setup

1. **Import database** in phpMyAdmin:
   - File: `database/kaveri_production_planning.sql`
   - Database name: `kaveri_production`

2. **Env**
   ```bash
   cp .env.example .env
   ```
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=kaveri_production
   JWT_SECRET="kaveri-metallising-super-secret-key-change-in-production"
   NEXT_PUBLIC_APP_NAME="Kaveri Metallising"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Run**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000

## Default Logins (password: admin123)

| Role | Email |
|------|--------|
| Super Admin | admin@kaveri.com |
| Shift Manager | vijay@kaveri.com |
| Operator | operator@kaveri.com / vishal@kaveri.com |

## Modules

### Production Planning
- Add New Planning (empty form, live length calculation)
- Planning List

### Production Department
- Production List with status cards
- Assign Shift Manager / Shift / Machine / Operator
- Shift Change support
- Operator-wise production summary
- Manager Review → Submit Final Production

### Operator
- My Assignments (Start Work / Continue Work / View)
- Start Work (enter actual start time)
- Enter Production Details (live waste %, remaining weight/length)
- Work History

### Auth
- Login, Logout, Profile edit, Change password
