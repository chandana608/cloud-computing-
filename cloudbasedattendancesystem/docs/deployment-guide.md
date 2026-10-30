# Cloud Deployment Guide: Cloud-Based Attendance Management System

This guide explains how to deploy the Attendance System into genuine production cloud infrastructure using **MongoDB Atlas**, **Render** (Backend), and **Vercel** (Frontend).

---

## 1. Step 1: MongoDB Atlas Database Setup

1. **Create an Atlas Account**:
   Navigate to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register or log in.
2. **Build a Database Cluster**:
   - Create a free tier cluster (`M0 Sandbox` or dedicated `M10+`).
   - Select your preferred cloud region (e.g. AWS / GCP Mumbai `ap-south-1` or US East).
3. **Database Security & User Creation**:
   - Under **Database Access**, create a database user:
     - Username: `attendance_admin`
     - Password: `<SecureGeneratedPassword>`
     - Role: `Read and write to any database`
4. **Network Access**:
   - Under **Network Access**, click **Add IP Address**.
   - For initial deployment from cloud PaaS providers (Render/Railway), add `0.0.0.0/0` (Allow Access from Anywhere) or the specific static outbound IPs of your hosting provider.
5. **Get Connection String**:
   - Click **Connect** -> **Drivers** -> **Python (version 3.11+)**.
   - Copy the SRV connection URI:
     ```text
     mongodb+srv://attendance_admin:<password>@cluster0.abcde.mongodb.net/cloud_attendance?retryWrites=true&w=majority
     ```

---

## 2. Step 2: Backend Cloud Deployment (Render / Fly.io / Docker)

1. Push your project repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New Web Service** and link your GitHub repo.
3. Configure Service Settings:
   - **Root Directory**: `.`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 3 backend.run:app`
4. Set Environment Variables in Render:
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: `<Generate a random 32-character string>`
   - `JWT_SECRET_KEY`: `<Generate a different random 32-character string>`
   - `MONGODB_URI`: `<Your MongoDB Atlas SRV connection string>`
   - `MONGODB_DATABASE`: `cloud_attendance`
   - `CORS_ORIGINS`: `https://your-frontend-app.vercel.app`
   - `MIN_ATTENDANCE_PERCENTAGE`: `75.0`
5. Click **Deploy Web Service**.
6. Verify deployment by checking:
   `https://your-backend.onrender.com/api/v1/health` and `/api/v1/ready`.

---

## 3. Step 3: Frontend Deployment (Vercel / Netlify)

1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import the GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api/v1`
5. Click **Deploy**.
6. Verify that single-page routing and API calls work seamlessly.

---

## 4. Step 4: Seed Cloud Database (Optional Initial Demonstration)

Run the remote seeding script pointing at your cloud MongoDB Atlas cluster:

```bash
# On your machine or cloud shell with MONGODB_URI set to your Atlas cluster
export MONGODB_URI="mongodb+srv://..."
python backend/scripts/seed_demo_data.py
```
