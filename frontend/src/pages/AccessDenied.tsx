import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Shown when an authenticated user navigates to a route they lack permission
 * for. The API still enforces access; this is the friendly UI counterpart.
 */
export default function AccessDenied({ permission }: { permission?: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <p className="text-lg font-semibold">
        {ar ? "ليس لديك صلاحية الوصول" : "Access denied"}
      </p>
      <p className="text-sm text-muted-foreground max-w-sm">
        {ar
          ? "ليس لديك إذن لعرض هذه الصفحة. تواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ."
          : "You don't have permission to view this page. Contact your administrator if you think this is a mistake."}
        {permission ? (
          <span className="mt-1 block font-mono text-xs opacity-60">{permission}</span>
        ) : null}
      </p>
      <Link to="/dashboard">
        <Button variant="outline" size="sm">
          {ar ? "العودة للوحة التحكم" : "Go to Dashboard"}
        </Button>
      </Link>
    </div>
  );
}
