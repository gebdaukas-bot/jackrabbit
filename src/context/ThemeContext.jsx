import { createContext, useContext, useState } from "react";

const DARK  = { BG:"#040d1c", CARD:"#08142b", CARD2:"#0b1a35", BORDER:"#0e2448", TEXT:"#ccd", MUTED:"#446", MUTED2:"#668" };
const LIGHT = { BG:"#f4f6f9", CARD:"#ffffff", CARD2:"#eef1f7", BORDER:"#d8e0ed", TEXT:"#1a2a44", MUTED:"#7a8fa8", MUTED2:"#5a6e82" };

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("jr_theme") || "dark"; } catch { return "dark"; }
  });
  const t = theme === "light" ? LIGHT : DARK;
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
