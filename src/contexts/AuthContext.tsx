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

// ⚽️ ここに部員の名簿（許可する名前）を登録します！
// カンマ区切りで、何人でも追加できます。
const VALID_MEMBERS = ["田中", "佐藤", "鈴木", "山田太郎", "マネージャー"]; 

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

  // 🔐 ログインの判定を厳しくしました
  const login = (name: string, password: string): boolean => {
    const trimmedName = name.trim(); // 名前の前後の空白を消す
    
    // パスワードが一致 ＆ 名簿(VALID_MEMBERS)に名前が含まれているかチェック！
    if (password === TEAM_PASSWORD && VALID_MEMBERS.includes(trimmedName)) {
      setAuth({ isLoggedIn: true, memberName: trimmedName });
      return true;
    }
    return false; // どちらかが間違っていたら弾く
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
