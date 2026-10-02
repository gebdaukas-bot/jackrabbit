import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { App as NativeApp } from "@capacitor/app";
import { ThemeProvider } from "./context/ThemeContext";
import { auth, onAuthStateChanged, isNative } from "./firebase";
import { getRedirectResult } from "firebase/auth";
import Login from "./pages/Login";
import Home from "./pages/Home";
import CreateCup from "./pages/CreateCup";
import CreateMatch from "./pages/CreateMatch";
import CupView from "./pages/CupView";
import SeedPage from "./pages/SeedPage";
import JoinPage from "./pages/JoinPage";
import WatchPage from "./pages/WatchPage";
import Privacy from "./pages/Privacy";

function AuthGate() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Process redirect result first (in case returning from Google redirect flow)
    if (!isNative) getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return () => unsub();
  }, []);

  if (user === undefined) return null; // splash while Firebase resolves auth

  if (!user) {
    return (
      <Routes>
        <Route path="/join/:code" element={<JoinPage user={null} />} />
        <Route path="/watch/:cupId" element={<WatchPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home user={user} />} />
      <Route path="/create" element={<CreateCup user={user} />} />
      <Route path="/match" element={<CreateMatch user={user} />} />
      <Route path="/cup/:cupId" element={<CupView user={user} />} />
      <Route path="/seed" element={<SeedPage user={user} />} />
      <Route path="/join/:code" element={<JoinPage user={user} />} />
      <Route path="/watch/:cupId" element={<WatchPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Invite (/join/…) and watch (/watch/…) links on dormie-golf.vercel.app open the iOS
// app when it's installed (Universal Links); route them to the same screen in-app.
function useOpenedLinks() {
  const nav = useNavigate();
  useEffect(() => {
    if (!isNative) return;
    const sub = NativeApp.addListener("appUrlOpen", ({ url }) => {
      try { const u = new URL(url); nav(u.pathname + u.search); } catch {}
    });
    return () => { sub.then(h => h.remove()); };
  }, [nav]);
}

export default function NewApp() {
  useOpenedLinks();
  return (
    <ThemeProvider>
      <AuthGate />
    </ThemeProvider>
  );
}
