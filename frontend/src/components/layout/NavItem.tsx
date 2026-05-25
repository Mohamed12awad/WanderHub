import { Link } from "react-router-dom";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, active }) => (
  <Link
    to={href}
    className={[
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
      active
        ? "bg-primary/10 text-primary border-s-2 border-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground border-s-2 border-transparent",
    ].join(" ")}
  >
    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
    <span className="truncate">{label}</span>
  </Link>
);

export default NavItem;
