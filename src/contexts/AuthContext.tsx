import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthState {
  isLoggedIn: boolean;
  memberName: string;
}

interface AuthContextType extends AuthState {
  login: (name: string, password: string) => boolean;
  logout: () => void;
}

const TEAM_PASSWORD = "Futsal2026";
const STORAGE_KEY = "futsal-auth";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { isLoggedIn: false, memberName: "" };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }, [auth]);

  const login = (name: string, password: string): boolean => {
    if (password === TEAM_PASSWORD && name.trim().length > 0) {
      setAuth({ isLoggedIn: true, memberName: name.trim() });
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuth({ isLoggedIn: false, memberName: "" });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
