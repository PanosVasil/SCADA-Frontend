# SCADA Frontend

React + TypeScript UI for the SCADA Monitoring System.  
Provides real‑time dashboards, park control panels, live telemetry views, admin management, and a full authentication interface.

---

## Features

### 📊 Real‑Time Dashboard
- Live metrics for each park  
- Automatic UI updates via WebSocket  
- Customizable labels & park names  
- Status badges, setpoint commands, and instant cutoff control (permissions required)

### 🛰 Live Telemetry Viewer
- Expandable PLC node viewer  
- Real‑time updates with animated “changed value” highlights  
- Node & park search filters

### 🔐 Authentication
- Login / logout system  
- JWT stored securely  
- Auto WebSocket authentication  
- User roles (admin vs normal user)

### 🧑‍💼 Admin Tools
- User management  
- Park access permissions  
- Label editor (rename metrics & park display names)

---

## Tech Stack

- **React 18**  
- **TypeScript**  
- **Vite**  
- **TailwindCSS**  
- **ShadCN UI**  
- **Lucide Icons**  
- **Sonner** (notifications)

---

## Project Structure

```text
SCADA-Frontend/
│
├── src/
│   ├── components/         # UI components (ParkCard, tables, inputs…)
│   ├── pages/              # Dashboard, LiveTelemetry, Profile, Auth…
│   ├── services/           # API + WebSocket handlers
│   ├── contexts/           # AuthContext provider
│   ├── lib/                # Telemetry transformer
│   ├── hooks/              # Custom hooks
│   ├── styles/             # Tailwind setup
│   ├── App.tsx             # Router + layout
│   └── main.tsx            # App entrypoint
│
├── public/                 # Static files
├── index.html
├── package.json
└── tsconfig.json
```

---

## Setup Instructions (Copy & Paste)

### **1. Install dependencies**
```bash
npm install
```

### **2. Configure environment variables**
Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### **3. Start development server**
```bash
npm run dev
```

Open:  
**http://localhost:5173**

---

## Build for Production

```bash
npm run build
```

Output will be generated in the **/dist** folder.

To preview the production build locally:

```bash
npm run preview
```

---

## Important Notes

```
• Ensure API URL + WebSocket URL match your backend deployment.
• If backend uses HTTPS, WebSockets must use wss://
• Do not commit .env files with production secrets.
• For production, serve /dist using Nginx, Apache, Traefik, or a cloud host.
```
