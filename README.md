# 🌱 AI Farmer Marketplace

A production-ready full-stack platform connecting farmers directly with buyers, powered by AI for crop price prediction, disease detection, demand forecasting, smart advisory, and multi-language support (English & Tamil).

---

## 🚀 Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | React 19 + Vite |
| **Backend** | Node.js + Express.js |
| **Database** | SQL|
| **Auth** | JWT |
| **AI Engine** | Google Gemini API + Gemini Vision + Smart Instant Engine |
| **Image Storage** | Cloudinary |
| **Maps & Location** | Google Maps JavaScript API|
| **Weather** | OpenWeather API |

---

## 📁 Project Structure

```
ai-farmer-marketplace/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components & layouts
│   │   ├── pages/           # Farmer, Buyer, Admin, Auth & Public pages
│   │   ├── store/           # Zustand state management
│   │   └── lib/             # API client & helpers
│   ├── .env.example
│   └── vite.config.js
├── server/                  # Express API backend
│   ├── prisma/
│   │   ├── schema.prisma    # Database models & relationships
│   │   └── seed.js          # Seed data script
│   ├── src/
│   │   ├── routes/          # Express route definitions
│   │   ├── controllers/     # API request handlers
│   │   ├── services/        # Gemini, Cloudinary, PDF services
│   │   ├── middleware/      # Auth, Rate Limiter, Error Handler
│   │   └── utils/           # Prisma client, Logger, API responses
│   └── .env.example
├── render.yaml              # Render Infrastructure-as-Code Blueprint
├── .gitignore
└── README.md
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites

- Node.js
- SQL
- npm

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Chelladurai33/AI-Farmer-Market.git
cd AI-Farmer-Market

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration

```bash
# Server environment variables
cp server/.env.example server/.env

# Client environment variables
cp client/.env.example client/.env
```

### 4. Database Initialization

```bash
cd server

# Push schema to database
npx prisma db push

# (Optional) Seed initial categories & users
npm run seed
```

### 5. Start Development Servers

```bash
# Terminal 1 - Backend (from /server)
npm run dev

# Terminal 2 - Frontend (from /client)
npm run dev
```

- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`
- **Health Check**: `http://localhost:5000/health`

---

## ☁️ Deployment Guide (Render + Vercel)

This project is optimized for a decoupled production architecture:
- **Backend API**: Hosted on **[Render](https://render.com)** (Node.js Web Service + SQL)
- **Frontend SPA**: Hosted on **[Vercel](https://vercel.com)** (React + Vite at the global Edge)

---

### Step 1: Deploy PostgreSQL Database & Backend to Render

#### Option A: 1-Click Blueprint (Recommended)
1. Push your code to GitHub.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml`.
4. Fill in your environment variables (or let Render generate JWT secrets automatically).

#### Option B: Manual Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `ai-farmer-marketplace-api`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. In **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: Your PostgreSQL connection string (Render Postgres, Neon, or Supabase)
   - `JWT_ACCESS_SECRET`: Long random 64-character secret
   - `JWT_REFRESH_SECRET`: Long random 64-character secret
   - `JWT_ACCESS_EXPIRES_IN`: `15m`
   - `JWT_REFRESH_EXPIRES_IN`: `7d`
   - `GEMINI_API_KEY`: Your Google Gemini API Key
   - `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Cloudinary API secret
   - `OPENWEATHER_API_KEY`: OpenWeather API key
   - `CLIENT_URL`: `https://<your-project>.vercel.app` (or comma-separated list of your Vercel domains)
5. Click **Create Web Service**. Once deployed, copy your service URL (e.g., `https://ai-farmer-marketplace-api.onrender.com`).

---

### Step 2: Deploy Frontend to Vercel

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
2. Import your GitHub repository (`Chelladurai33/AI-Farmer-Market`).
3. In **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client` (or leave as root, as root `vercel.json` will route to `client`)
4. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://<your-render-api-url>.onrender.com/api`
   - `VITE_GOOGLE_MAPS_API_KEY`: (Optional) Your Google Maps JavaScript API key
5. Click **Deploy**. Vercel will build and publish your frontend on a fast global CDN with automated SPA rewrites and asset caching.

---

### Step 3: Link Vercel Domain in Render

Once Vercel gives you your production domain (e.g. `https://ai-farmer-market.vercel.app`):
1. Open your Render Web Service dashboard.
2. Go to **Environment** tab.
3. Update `CLIENT_URL` to match your Vercel URL (e.g. `https://ai-farmer-market.vercel.app`).
4. Save changes (Render will automatically redeploy with the updated CORS origin).

---

## 👥 User Roles & Access

- **FARMER**: Crop management, AI price predictions, disease detection, weather dashboard, cold storage booking, solar drying plant reservation.
- **BUYER**: Direct marketplace browsing, wishlist management, cart checkout, order tracking.
- **ADMIN**: User verification, platform analytics, system-wide management.

---

## 🌐 Key API Routes

```
GET    /health                            # System health check
POST   /api/auth/register                 # User registration
POST   /api/auth/login                    # User authentication
GET    /api/products                      # Get marketplace products
POST   /api/products                      # Add new product
POST   /api/predictions/price             # Forecast crop prices
POST   /api/forecast/demand               # Regional demand analyzer
POST   /api/disease-detection/analyze     # AI crop disease analysis
GET    /api/cold-storage/nearby           # Find cold storage facilities
POST   /api/chatbot/message               # Instant AgroBot chat
```

---

## 📄 License

This project is licensed under the MIT License.
