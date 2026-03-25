import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  if (isLoggedIn) {
    navigate("/schedule", { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }
    const ok = login(name, password);
    if (ok) {
      navigate("/schedule", { replace: true });
    } else {
      setError("パスワードが正しくありません");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary text-primary-foreground text-xl font-black mb-4">
            F
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            部員ログイン
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            部員専用ページにアクセスするにはログインしてください
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <User size={14} className="text-muted-foreground" />
              名前
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              className="h-11"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Lock size={14} className="text-muted-foreground" />
              パスワード
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="チームパスワード"
              className="h-11"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          <Button type="submit" className="w-full h-11 font-semibold gap-2">
            ログイン
            <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          パスワードは顧問の先生または部長に確認してください
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
