# Staff Authentication System - Implementation Summary

## Overview

Successfully implemented JWT-based username/password authentication for staff members to protect all `/admin/*` routes. Client routes (`/check/:orderId`, `/`, menu items) remain publicly accessible.

---

## What Was Implemented

### Backend Changes

#### New Files Created:
- `backend/auth.go` - Authentication handlers and JWT middleware
- `backend/models.go` - Data models (StaffUser, QRSession, Order)
- `backend/migrations/002_add_users_table.sql` - Users table migration
- `backend/scripts/create-admin-user.sh` - Script to create admin user with bcrypt hash

#### Modified Files:
- `backend/main.go` - Added auth routes, applied middleware to protected routes
- `backend/config/config.go` - Added JWT secret configuration
- `backend/env.example` - Added JWT_SECRET and DEFAULT_ADMIN_PASSWORD
- `backend/go.mod` - Added JWT and bcrypt dependencies

#### Key Features:
- **JWT token generation** with 24-hour expiration
- **bcrypt password hashing** (10 rounds)
- **Auth middleware** protecting admin endpoints
- **Login endpoint**: `POST /api/auth/login`
- **Logout endpoint**: `POST /api/auth/logout`
- **Validate endpoint**: `GET /api/auth/validate`

#### Protected Routes:
- `POST /api/qr/create`
- `POST /api/orders`
- `POST /api/pos/order`
- `PUT /api/orders/update`
- `GET /api/admin/sessions`

#### Public Routes (no auth required):
- `GET /api/qr/:qrId` - Clients need this
- `GET /api/orders/:id` - Clients need this
- `GET /api/menu/items` - Clients need this
- `/ws/session` - WebSocket for real-time updates

---

### Frontend Changes

#### New Files Created:
- `frontend/src/contexts/AuthContext.tsx` - Global auth state management
- `frontend/src/services/auth.ts` - Auth API functions
- `frontend/src/components/LoginPage.tsx` - Login UI
- `frontend/src/components/ProtectedRoute.tsx` - Route protection wrapper

#### Modified Files:
- `frontend/src/App.tsx` - Wrapped with AuthProvider, added login route, protected admin routes
- `frontend/src/services/api.ts` - Inject JWT token in all authenticated requests
- `frontend/src/config/environment.ts` - Added base() method for auth endpoints
- `frontend/src/components/AdminDashboard.tsx` - Added logout button and username display
- `frontend/src/components/LandingPage.tsx` - Added "Acceso de Personal" button

#### Key Features:
- **Session persistence** via localStorage
- **Auto-login** if valid token exists
- **Token validation** on app initialization
- **Protected routes** redirect to `/login` if not authenticated
- **Logout functionality** with clean state management
- **BottomNavBar** remains visible for clients (Menu + Cuenta)

---

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
go mod tidy
```

#### Run Database Migration
```bash
# Make sure PostgreSQL is running
# Apply the new migration
psql -h localhost -U munch_user -d munch_app_dev -f migrations/002_add_users_table.sql
```

#### Create Admin User
```bash
cd backend
chmod +x scripts/create-admin-user.sh
./scripts/create-admin-user.sh
```

This creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change this password in production!

#### Start Backend Server
```bash
cd backend
go run .
```

---

### 2. Frontend Setup

No additional dependencies needed (React already includes what we need).

#### Start Frontend Server
```bash
cd frontend
npm start
```

---

## Testing Guide

### Test 1: Staff Login Flow

1. Navigate to `http://localhost:3000`
2. Click "Acceso de Personal" button
3. Login with:
   - Username: `admin`
   - Password: `admin123`
4. You should be redirected to `/admin` dashboard
5. Verify you can access:
   - `/admin` - Dashboard
   - `/admin/qr` - QR Generator
   - `/admin/pos` - POS System

### Test 2: Protected Routes

1. Open new incognito/private window
2. Try to access `http://localhost:3000/admin` directly
3. You should be redirected to `/login`
4. After login, you should be redirected back to `/admin`

### Test 3: Client Flow (No Auth Required)

1. Open new browser window (don't login)
2. Scan QR code or navigate to `/check/:orderId`
3. Verify you can:
   - View the check
   - See menu items
   - Use bottom navigation (Menu & Cuenta tabs)
4. Client functionality should work WITHOUT authentication

### Test 4: Logout

1. While logged in as staff, go to `/admin`
2. Click "Cerrar Sesión" button
3. You should be redirected to `/login`
4. Try accessing `/admin` - should redirect to login

### Test 5: Session Persistence

1. Login as admin
2. Refresh the page
3. You should remain logged in
4. Close browser and reopen
5. Navigate to `/admin` - should still be logged in
6. Logout explicitly to clear session

### Test 6: API Protection

```bash
# Try accessing protected endpoint without token (should get 401)
curl http://localhost:8080/api/admin/sessions

# Login and get token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# Access protected endpoint with token (should work)
curl http://localhost:8080/api/admin/sessions \
  -H "Authorization: Bearer $TOKEN"
```

---

## Environment Variables

### Backend (.env)
```bash
JWT_SECRET=munch-app-secret-change-in-production
DEFAULT_ADMIN_PASSWORD=admin123
DATABASE_URL=postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable
```

### Frontend (.env)
No additional env vars needed for auth.

---

## Security Considerations

### ✅ Implemented
- bcrypt password hashing (10 rounds)
- JWT token with expiration (24 hours)
- Authorization header validation
- Protected route middleware
- Client-side token validation

### 🔄 Recommended for Production
- Add rate limiting to login endpoint (e.g., 5 attempts per minute)
- Implement token refresh mechanism
- Use HTTPS in production
- Store JWT secret in secure vault
- Add account lockout after failed attempts
- Implement password complexity requirements
- Add 2FA for additional security

---

## Troubleshooting

### Issue: "could not import github.com/golang-jwt/jwt/v5"
**Solution**: Run `cd backend && go mod tidy`

### Issue: Login returns 401 even with correct credentials
**Solution**: Check that admin user was created with `./scripts/create-admin-user.sh`

### Issue: "Authorization header required" on admin routes
**Solution**: Clear localStorage and login again. Token may be expired or invalid.

### Issue: Frontend shows "Verification..." indefinitely
**Solution**: 
1. Check backend is running on port 8080
2. Check browser console for CORS errors
3. Verify `/api/auth/validate` endpoint is accessible

### Issue: Can't create admin user with script
**Solution**: 
1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in .env is correct
3. Check that migrations ran successfully

---

## Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    {username, password}
       ▼
┌─────────────────────────────┐
│     Backend (Go/Gin)        │
│                             │
│  ┌──────────────────────┐   │
│  │   Auth Handler       │   │
│  │  - Validate creds    │   │
│  │  - Generate JWT      │   │
│  └──────────────────────┘   │
└──────────┬──────────────────┘
           │
           │ 2. Returns JWT token
           ▼
┌─────────────────────────────┐
│   Client (React)            │
│  ┌──────────────────────┐   │
│  │  AuthContext         │   │
│  │  - Stores token      │   │
│  │  - Validates on init │   │
│  └──────────────────────┘   │
└──────────┬──────────────────┘
           │
           │ 3. All API requests include
           │    Authorization: Bearer <token>
           ▼
┌─────────────────────────────┐
│     Backend Middleware      │
│  ┌──────────────────────┐   │
│  │  authMiddleware()    │   │
│  │  - Validates token   │   │
│  │  - Checks expiry     │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

---

## Success Criteria

- ✅ Staff must login with username/password to access admin routes
- ✅ Clients can access `/check/:orderId` without authentication
- ✅ Sessions persist until explicit logout
- ✅ Invalid credentials are rejected (401)
- ✅ Protected routes return 401 without valid token
- ✅ UI shows/hides appropriately based on auth state
- ✅ BottomNavBar visible for all users (Menu + Cuenta)

---

## Next Steps (Optional Enhancements)

1. **User Management UI** - Allow admins to create/delete staff users
2. **Password Reset** - Implement password reset flow
3. **Audit Logging** - Log all authentication events
4. **Token Refresh** - Auto-refresh tokens before expiration
5. **Rate Limiting** - Protect against brute force attacks
6. **2FA** - Add two-factor authentication for enhanced security
7. **Role-Based Permissions** - Distinguish between Admin and Waitstaff roles

---

## Files Changed Summary

### Backend (10 files)
- ✅ auth.go (new)
- ✅ models.go (new)
- ✅ migrations/002_add_users_table.sql (new)
- ✅ scripts/create-admin-user.sh (new)
- ✅ main.go (modified)
- ✅ config/config.go (modified)
- ✅ env.example (modified)
- ✅ go.mod (modified)

### Frontend (9 files)
- ✅ contexts/AuthContext.tsx (new)
- ✅ services/auth.ts (new)
- ✅ components/LoginPage.tsx (new)
- ✅ components/ProtectedRoute.tsx (new)
- ✅ App.tsx (modified)
- ✅ services/api.ts (modified)
- ✅ config/environment.ts (modified)
- ✅ components/AdminDashboard.tsx (modified)
- ✅ components/LandingPage.tsx (modified)

---

## Support

If you encounter any issues:
1. Check this document's Troubleshooting section
2. Review browser console for frontend errors
3. Check backend logs for auth errors
4. Verify database migrations ran successfully
5. Ensure all dependencies are installed (`go mod tidy`, `npm install`)

---

**Implementation Date**: October 14, 2025  
**Implementation Status**: ✅ Complete and Ready for Testing

