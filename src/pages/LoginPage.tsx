import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
// 👁️ Eye, EyeOff アイコンを追加しました
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // 👁️ パスワードの表示/非表示を管理する状態を追加
  const [showPassword, setShowPassword] = useState(false);
  
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
    
    // AuthContextのlogin機能を使う
    const ok = login(name, password);
    
    if (ok) {
      navigate("/schedule", { replace: true });
    } else {
      // 📝 エラーメッセージを分かりやすく修正
      setError("名前が登録されていないか、パスワードが間違っています。");
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
              placeholder="名前"
              className="h-11"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Lock size={14} className="text-muted-foreground" />
              パスワード
            </label>
            {/* 👁️ パスワード入力欄にアイコンボタンを追加 */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  // 🪄 半角英数字と記号以外（日本語など）が入力されたら、その瞬間に空っぽに置き換える魔法
                  const cleanValue = e.target.value.replace(/[^\x20-\x7E]/g, '');
                  setPassword(cleanValue);
                }}
                placeholder="チームパスワード"
                className="h-11 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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