# Production Deployment Guide

This project is structured as a full-stack application with a React (Vite) frontend and a Node.js (Express) backend.

## 1. Prerequisites
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and a cluster.
- [Render](https://render.com/) account (for backend).
- [Vercel](https://vercel.com/) account (for frontend).

---

## 2. Backend Deployment (Render)

1. **Create a Web Service** on Render.
2. **Connect your Repository**.
3. **Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (or whatever you prefer)
4. **Build & Start Commands**:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Note down your backend URL (e.g., `https://your-app-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

1. **Create a New Project** on Vercel.
2. **Root Directory**: Select the `frontend` folder (or select the root and configure output).
   - If deploying from root:
     - Framework Preset: `Vite`
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `dist`
3. **Environment Variables**:
   - `VITE_API_URL`: `https://your-app-backend.onrender.com/api` (The URL from step 2).
4. **vercel.json**: Included in the `frontend` folder to handle SPA routing.

---

## 4. MongoDB Atlas Setup

1. Log in to MongoDB Atlas.
2. Create a new Cluster.
3. In **Network Access**, add `0.0.0.0/0` (Allow access from anywhere) or specific IP addresses.
4. In **Database Access**, create a user with read/write permissions.
5. Click **Connect** -> **Connect your application** and copy the string.
6. Replace `<password>` in the connection string with your database user's password.

---

## 5. Local Build Verification

To test the production build locally:

```bash
# Build the frontend
npm run build

# Set environment variables
export NODE_ENV=production
export MONGODB_URI=your_mongodb_uri

# Start the server
npm start
```

Your app should now be available at `http://localhost:3000`.
