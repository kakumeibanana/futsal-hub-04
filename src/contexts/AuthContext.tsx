import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const TEAM_EMAIL = "team@futsal.dummy";
const MEMBER_NAME_KEY = "futsal_member_name";
const MEMBER_ROLE_KEY = "futsal_member_role";

type Role = "captain" | "staff" | "member" | null;

interface AuthContextType {
  isLoggedIn: boolean;
  session: Session | null;
  memberName: string;
  role: Role;
  isStaff: boolean;
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
  const [role, setRole] = useState<Role>(() => (localStorage.getItem(MEMBER_ROLE_KEY) as Role) || null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        localStorage.removeItem(MEMBER_NAME_KEY);
        localStorage.removeItem(MEMBER_ROLE_KEY);
        setMemberName("");
        setRole(null);
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

    // スペース正規化（全角・半角・複数スペース → 除去して比較）
    const toKey = (s: string) => s.replace(/[\s　]+/g, "").trim();
    const inputKey = toKey(name);

    const { data: members } = await supabase.from("members").select("name, role");
    const member = members?.find((m) => toKey(m.name) === inputKey);

    if (!member) {
      await supabase.auth.signOut();
      return { error: "部員リストに登録されていない名前です" };
    }

    const memberRole = member.role as Role;
    localStorage.setItem(MEMBER_NAME_KEY, member.name);
    localStorage.setItem(MEMBER_ROLE_KEY, memberRole ?? "member");
    setMemberName(member.name);
    setRole(memberRole);
    return { error: null };
  };

  const logout = async () => {
    localStorage.removeItem(MEMBER_NAME_KEY);
    localStorage.removeItem(MEMBER_ROLE_KEY);
    setMemberName("");
    setRole(null);
    await supabase.auth.signOut();
  };

  const isStaff = role === "captain" || role === "staff";

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!session, session, memberName, role, isStaff, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};