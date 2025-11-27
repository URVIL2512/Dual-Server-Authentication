# Quick Start Guide - Run Commands

## Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** - Install and start MongoDB service
   - Windows: Install MongoDB Community Server and ensure the service is running
   - Or use MongoDB Atlas (cloud) and update the connection string

## Step-by-Step Setup

### 1. Start MongoDB

**Windows (if installed locally):**
```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# If not running, start it:
Start-Service MongoDB
```

**Or use MongoDB Atlas:**
- Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Get your connection string (replace `<password>` and `<dbname>`)

### 2. Setup Backend

```powershell
# Navigate to backend directory
cd backend

# Copy environment file
Copy-Item env.sample .env

# Edit .env file if needed (optional - defaults work for local MongoDB)
# PORT=5000
# MONGO_URI=mongodb://127.0.0.1:27017/dual-server-iot
# HONEY_MAX=10

# Install dependencies (if not already done)
npm install

# Start backend server
npm run dev
```

**Expected output:**
```
Backend running on port 5000
```

**Note:** First startup may take ~10 seconds to generate Paillier keys.

### 3. Setup Frontend (New Terminal)

Open a **new terminal/PowerShell window** and run:

```powershell
# Navigate to frontend directory
cd frontend

# Copy environment file (optional - defaults work)
Copy-Item env.sample .env

# Install dependencies (if not already done)
npm install

# Start frontend dev server
npm run dev
```

**Expected output:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4. Access the Application

1. Open your browser
2. Navigate to: `http://localhost:5173`
3. You should see the Dual-Server IoT Authentication interface

## Quick Test Flow

1. **View System Parameters** - Should load automatically on page load
2. **Register a Device:**
   - Go to "Registration" tab
   - Enter:
     - Identifier: `device001`
     - Password: `MySecurePass123`
     - Device Nonce nᵢ: `1234567890abcdef`
   - Click "Register IoT Device"
3. **Authenticate:**
   - Go to "Authentication" tab
   - Enter the same credentials
   - Click "Begin Session"
   - You should see a session key in the output
4. **Change Password:**
   - Go to "Password Change" tab
   - Enter credentials with new password
   - Click "Rotate Password"

## Alternative: Production Build

### Backend (Production)
```powershell
cd backend
npm start
```

### Frontend (Production Build)
```powershell
cd frontend
npm run build
npm run preview
```

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running:
```powershell
# Check MongoDB service
Get-Service MongoDB

# Or use MongoDB Atlas connection string in .env
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in `backend/.env` or kill the process using port 5000

### Frontend Can't Connect to Backend
**Solution:** 
1. Ensure backend is running on port 5000
2. Check `frontend/.env` has: `VITE_API_BASE_URL=http://localhost:5000/api`

### Module Not Found Errors
**Solution:** Reinstall dependencies:
```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules
npm install

# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```

## All Commands Summary

**Terminal 1 - Backend:**
```powershell
cd backend
Copy-Item env.sample .env
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
Copy-Item env.sample .env
npm install
npm run dev
```

**Browser:**
- Open: `http://localhost:5173`

