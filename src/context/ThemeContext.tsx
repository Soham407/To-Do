import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { MD3LightTheme, MD3DarkTheme } from "../theme";

export type ThemeType = typeof MD3LightTheme;

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
  setScheme: (scheme: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: MD3LightTheme,
  isDark: false,
  toggleTheme: () => {},
  setScheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");

  const theme = isDark ? MD3DarkTheme : MD3LightTheme;

  const toggleTheme = () => setIsDark((prev) => !prev);
  const setScheme = (scheme: "light" | "dark") => setIsDark(scheme === "dark");

  // Optional: Listen to system changes if user hasn't overriden manually
  // For now, simple manual control + initial system check

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
