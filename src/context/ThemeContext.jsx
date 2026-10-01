import { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const DARK  = { BG:"#040d1c", CARD:"#08142b", CARD2:"#0b1a35", BORDER:"#0e2448", TEXT:"#ccd", MUTED:"#446", MUTED2:"#668" };
const LIGHT = { BG:"#f4f6f9", CARD:"#ffffff", CARD2:"#eef1f7", BORDER:"#d8e0ed", TEXT:"#1a2a44", MUTED:"#7a8fa8", MUTED2:"#5a6e82" };

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("jr_theme") || "dark"; } catch { return "dark"; }
  });
  const t = theme === "light" ? LIGHT : DARK;
  // Set during render (not just in the effect) so getTeams() sees the new theme on this pass.
  if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;

  // Screens also use CSS variables (defined in index.html) for shades they hard-code;
  // this flips them, and in the iOS app the status bar text to match.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (Capacitor.isNativePlatform())
      StatusBar.setStyle({ style: theme === "light" ? Style.Light : Style.Dark }).catch(() => {});
  }, [theme]);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("jr_theme", next); } catch {}
  };
  return (
    <ThemeContext.Provider value={{ ...t, theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
