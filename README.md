
# 🎨 AI Scribble

> **An interactive, real-time drawing and guessing game powered by AI.**

Welcome to **AI Scribble**! This project combines the fun of Pictionary with the power of Artificial Intelligence. Challenge your friends or play against the AI in real-time. The game features a robust backend for managing game state and a sleek, responsive frontend for an immersive drawing experience.

---

## ✨ Features

- **Real-Time Multiplayer**: Seamless interaction using Socket.IO.
- **AI Integration**: AI powered drawing generation and guessing capabilities utilizing the Vercel AI Gateway.
- **Interactive Canvas**: Smooth drawing experience for players.
- **Responsive Design**: Built with Next.js and Tailwind CSS for mobile and desktop compatibility.
- **Efficient State Management**: Powered by Zustand for a snappy user experience.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Real-time**: Socket.IO Client

### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Real-time**: Socket.IO
- **Image Processing**: Sharp

---

## 🚀 Getting Started

Follow these steps to get the project running locally on your machine.

### **Prerequisites**
- **Node.js**: v18 or higher recommended using nvm to manage versions.
- **Package Manager**: npm or yarn.

### **1. Clone the Repository**
```bash
git clone <your-repo-url>
cd AISCRIBBLE
```

### **2. Backend Setup**
Navigate to the backend directory, install dependencies, and start the server.

```bash
cd backend
npm install

# Create a .env file if needed and add your keys (e.g., VERCEL_AI_GATEWAY_TOKEN)
# echo "VERCEL_AI_GATEWAY_TOKEN=your_token_here" > .env

# Run in development mode
npm run dev
```
*The backend server will typically start on port `3001` or `10000` (check logs).*

### **3. Frontend Setup**
Open a new terminal window, navigate to the root directory (frontend), and install dependencies.

```bash
# From the project root (AISCRIBBLE/)
npm install

# Run the development server
npm run dev
```
*The frontend application will start at [http://localhost:3000](http://localhost:3000).*

---

## 📦 Deployment

### **Backend (Render)**
The backend is configured for deployment on [Render](https://render.com/) via the `render.yaml` file.
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm run start`

### **Frontend (Vercel)**
The Next.js frontend is optimized for deployment on [Vercel](https://vercel.com/).
1. Push your code to a Git repository.
2. Import the project into Vercel.
3. Use the default Next.js build settings.
4. Configure environment variables to point to your deployed backend URL.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to verify functionality, submit issues, or open Pull Requests.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.
