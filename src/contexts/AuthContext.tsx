import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const TEAM_EMAIL = "team@futsal.dummy";
const MEMBER_NAME_KEY = "futsal_member_name";

interface AuthContextType {
  isLoggedIn: boolean;
  session: Session | null;
  memberName: string;
  loading: boolean;
  login: (password: string, name: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberName, setMemberName] = useState(() => localStorage.getItem(MEMBER_NAME_KEY) || "");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        localStorage.removeItem(MEMBER_NAME_KEY);
        setMemberName("");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (password: string, name: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: TEAM_EMAIL,
      password,
    });
    if (error) return { error: "パスワードが間違っています" };
    localStorage.setItem(MEMBER_NAME_KEY, name);
    setMemberName(name);
    return { error: null };
  };

  const logout = async () => {
    localStorage.removeItem(MEMBER_NAME_KEY);
    setMemberName("");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!session, session, memberName, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
