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
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
      active
        ? "bg-white/[0.12] text-white"
        : "text-white/50 hover:bg-white/[0.07] hover:text-white/80",
    ].join(" ")}
  >
    <Icon className={`h-4 w-4 shrink-0 ${active ? "opacity-100" : "opacity-60"}`} />
    <span className="truncate">{label}</span>
  </Link>
);

export default NavItem;
