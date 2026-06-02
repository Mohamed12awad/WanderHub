import { useState } from "react";
import { useAuth } from "../contexts/authContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth();
  const { lang, setLang, tr } = useLanguage();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const errorMessage =
    error === "network"
      ? tr.auth.errorNetwork
      : error === "blocked"
        ? tr.auth.errorBlocked
        : error === "credentials"
          ? tr.auth.errorCredentials
          : null;

  return (
    <div className="min-h-screen bg-[hsl(220_20%_97%)] dark:bg-[hsl(222_28%_8%)] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-[hsl(var(--sidebar-bg))] p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <img src="/logo.png" className="h-5.5 w-5.5" alt="NawaHub" />
          </div>
          <span className="text-base font-semibold text-white">NawaHub</span>
        </div>

        <div>
          <blockquote className="text-white/70 text-sm leading-relaxed italic">
            "NawaHub keeps our pipeline clear, our invoices on time, and our
            team in sync — every day."
          </blockquote>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white">
              SA
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">Sales Admin</p>
              <p className="text-[11px] text-white/40">NawaHub Team</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-white/25">
          NawaHub CRM · {new Date().getFullYear()}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 relative">
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="absolute top-5 end-5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm hover:shadow hover:text-foreground transition-all"
        >
          {lang === "en" ? "العربية" : "English"}
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-3">
              <img src="/logo.png" className="h-7 w-7" alt="NawaHub" />
            </div>
            <h1 className="text-xl font-bold">NawaHub</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tr.auth.subtitle}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-2xl shadow-xl shadow-black/[0.06] dark:shadow-black/30 border border-border/60 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold">{tr.auth.signIn}</h2>
              <p className="text-sm text-muted-foreground mt-1 hidden lg:block">
                {tr.auth.subtitle}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {errorMessage}
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
                  className="h-10 bg-background"
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
                  className="h-10 bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 mt-1 font-semibold shadow-sm shadow-primary/20"
                disabled={loading}
              >
                {loading ? tr.common.loading : tr.auth.submit}
              </Button>
            </form>
          </div>

          <p className="lg:hidden text-center text-xs text-muted-foreground mt-6">
            NawaHub CRM · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
