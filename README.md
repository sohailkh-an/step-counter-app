# Step Counter App

This project is a simple 3-part system that collects step counter data from a mobile app, sends it to an API with a database, and visualizes it on a web dashboard.

## Project Structure

```
.
├── api         # Node.js + Express backend
├── mobile-app  # Expo (React Native) mobile app
├── web-app     # React web dashboard
└── .gitignore
```

---

## 🔹 1. API (Backend)

### Requirements

- Node.js (>=16)
- npm or yarn
- MongoDB Atlas

### Setup

```bash
cd api
npm install
```

### Run locally

```bash
npm start
```

Default port: `5000`  
(Base URL: `http://localhost:5000`)


👉 Note: The API uses Mongodb Atlas as a database. First create a Mongodb Atlas account, then copy the database URL and then paste it into the MONGO_URI variable in the .env file in the root of the API directory.

---

## 🔹 2. Mobile App (Expo)

### Requirements

- Node.js (>=16)
- Expo Go app (Android/iOS)

### Setup

```bash
cd mobile-app
npm install
```

### Run

```bash
npx expo start
```

- A QR code will appear in the terminal
- Install **Expo Go app** on your phone and scan the QR code
- The app will launch and display footsteps data

👉 Note: First, check your PC’s IP address using ipconfig. Then update the API_BASE in the use-pedometer.ts file inside the mobile-app directory. It should look something like: http://192.168.100.xx:5000. Also, make sure both your phone and the backend server are connected to the same WiFi/LAN network.

---

## 🔹 3. Web App (React)

### Requirements

- Node.js (>=16)

### Setup

```bash
cd web-app
npm install
```

### Run

```bash
npm run dev
```

Default URL: `http://localhost:5173`

---

## 🚀 Tech Stack

- **API:** Node.js, Express, MongoDB
- **Mobile:** React Native (Expo)
- **Web:** React, Chart.js

---
