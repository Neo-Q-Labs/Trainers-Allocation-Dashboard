# QLabs · Trainer Capacity & Allocation Dashboard

A premium, state-of-the-art **Trainer Allocation & Capacity Planning Command Center** built with React 19 + Vite 6 + Tailwind 4 on the frontend, and FastAPI + MongoDB + Motor on the backend, styled with the stunning QLabs **"Neon Lab"** design system.

---

## 🚀 Technology Stack

### Frontend Component
- **Core:** React 19 + Vite 6 (ultra-fast, hot-reloading development)
- **Styling:** Tailwind 4 + Custom Premium Vanilla CSS (`_styles.css`) for high-fidelity glassmorphism, glowing borders, and smooth transitions.
- **State & Data Queries:** Redux Toolkit + RTK Query (automatic caching, background syncing, and coordinated Excel synchronization).

### Backend Component
- **Core:** FastAPI (high-performance Python API service).
- **Database:** MongoDB Atlas (handled asynchronously using `motor.motor_asyncio`).
- **Security:** JWT Token-Based Authentication with cryptographically hashed passwords (`bcrypt`) and Role-Based Access Control (RBAC).

---

## 🛠️ Environment Configuration

### Backend Setup (`backend/.env`)
Create a `.env` file inside the `backend/` directory with the following variables:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/timesheet?retryWrites=true&w=majority
JWT_SECRET_KEY=your_cryptographically_secure_hex_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```
*Note: Make sure to replace `<username>` and `<password>` with your actual MongoDB Atlas database credentials.*

### Frontend Setup
In production (Vercel/Render), configure the following environment variable to link the frontend to your hosted API:
```env
VITE_API_BASE_URL=https://your-backend-api-url.onrender.com
```
*During local development, the frontend automatically defaults to `http://localhost:8000`.*

---

## 💻 Local Development

### 1. Backend Service
Ensure you have Python 3.9+ installed, then run:
```bash
cd backend
python -m venv venv
# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
The FastAPI documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend React Application
Open a new terminal window in the root directory:
```bash
npm install
npm run dev      # Server runs at http://localhost:5173
```

---

## 🏗️ Production Deployment

### 1. Backend Deployment (Render)
1. Create a new **Web Service** on Render.
2. Link your Git repository.
3. Select **Python** runtime.
4. Set the **Build Command** to `pip install -r requirements.txt`.
5. Set the **Start Command** to `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add your environment variables (`MONGODB_URI`, `JWT_SECRET_KEY`, etc.) inside the service's Environment settings.

### 2. Frontend Deployment (Vercel)
1. Import your repository into **Vercel**.
2. Select **Vite** as the framework preset (it will automatically configure the build command as `npm run build` and output directory as `dist`).
3. Add the **Environment Variable** `VITE_API_BASE_URL` pointing to your hosted Render backend service (e.g., `https://your-app.onrender.com`).
4. Click **Deploy**.

---

## 📁 Directory Structure

```
.
├── backend/
│   ├── app/
│   │   ├── db.py               # Motor async MongoDB Atlas client
│   │   ├── auth_utils.py       # Password hashing & JWT secure checks
│   │   ├── config.py           # Environment variables configuration
│   │   ├── main.py             # FastAPI bootstrap & CORS settings
│   │   └── routers/
│   │       └── auth.py         # Login & JWT token issue router
│   ├── requirements.txt        # Backend python dependencies
│   └── Dockerfile              # Docker build configuration
├── src/
│   ├── App.jsx                 # Layout wrapper & session router
│   ├── _styles.css             # Neon Lab stylesheet (tooltips, topbars, buttons)
│   ├── components/
│   │   ├── Topbar.jsx          # Dynamic header titles & profile initials badge
│   │   ├── Sidebar.jsx         # Sidebar navigation & secure logout trigger
│   │   └── PanelState.jsx      # Unified API load / error states
│   ├── pages/
│   │   ├── Login.jsx           # Glassmorphic secure credentials login panel
│   │   ├── Overview.jsx        # Trainers allocation analytics dashboard
│   │   ├── Requirements.jsx    # Table & Gantt pipeline scheduler
│   │   └── Matrix.jsx          # Trainers capacity & skills matrix
│   └── store/
│       └── api.js              # Central RTK Query API slices
```
