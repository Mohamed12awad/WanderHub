import { Link } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label, active }) => {
  const { collapsed } = useSidebar();

  return (
    <Link
      to={href}
      title={collapsed ? label : undefined}
      className={[
        "flex items-center rounded-md py-2 text-sm font-medium transition-all duration-150",
        collapsed ? "justify-center px-2" : "gap-3 px-3",
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/50 hover:bg-white/[0.07] hover:text-white/80",
      ].join(" ")}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "opacity-100" : "opacity-60"}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
};

export default NavItem;
