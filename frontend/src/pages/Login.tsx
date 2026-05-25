import { useState } from "react";
import { useAuth } from "../contexts/authContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [email, setEmail] = useState("Viewer@wonderhub.com");
  const [password, setPassword] = useState("Wonder@123");
  const { login, loading, error } = useAuth();
  const { lang, setLang, tr } = useLanguage();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === "en" ? "ar" : "en")}
        className="fixed top-4 end-4 rounded-full border bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md transition-all"
      >
        {lang === "en" ? "العربية" : "English"}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 mb-4">
            <img src="/logo.png" className="h-8 w-8" alt="WonderHub" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">WonderHub</h1>
          <p className="text-sm text-muted-foreground mt-1">{tr.auth.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 border border-border p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">{tr.auth.signIn}</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {tr.auth.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                {tr.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                {tr.auth.password}
              </Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-10 mt-2" disabled={loading}>
              {loading ? tr.common.loading : tr.auth.submit}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          WonderHub CRM · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
