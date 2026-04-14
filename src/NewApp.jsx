import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { auth, onAuthStateChanged } from "./firebase";
import { getRedirectResult } from "firebase/auth";
import Login from "./pages/Login";
import Home from "./pages/Home";
import CreateCup from "./pages/CreateCup";
import CupView from "./pages/CupView";
import SeedPage from "./pages/SeedPage";
import JoinPage from "./pages/JoinPage";

function AuthGate() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Process redirect result first (in case returning from Google redirect flow)
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return () => unsub();
  }, []);

  if (user === undefined) return null; // splash while Firebase resolves auth

  if (!user) {
    return (
      <Routes>
        <Route path="/join/:code" element={<JoinPage user={null} />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home user={user} />} />
      <Route path="/create" element={<CreateCup user={user} />} />
      <Route path="/cup/:cupId" element={<CupView user={user} />} />
      <Route path="/seed" element={<SeedPage user={user} />} />
      <Route path="/join/:code" element={<JoinPage user={user} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function NewApp() {
  return (
    <ThemeProvider>
      <AuthGate />
    </ThemeProvider>
  );
}
