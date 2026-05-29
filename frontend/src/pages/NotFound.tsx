import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-7xl font-bold text-muted-foreground/20">404</p>
      <p className="text-lg font-semibold">Page not found</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="outline" size="sm">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
