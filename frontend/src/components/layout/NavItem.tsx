// import Link from "next/link";
import { Link } from "react-router-dom";
import { Badge } from "../ui/badge";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  href,
  icon: Icon,
  label,
  badge,
  active,
}) => (
  <Link
    to={href}
    className={`flex items-center gap-2 p-2 font-[600] text-gray-800 ${
      active ? "bg-gray-200 rounded-lg" : ""
    }`}
  >
    <Icon className="h-5 w-5 text-gray-500" />
    <span>{label}</span>
    {badge && <Badge>{badge}</Badge>}
  </Link>
);

export default NavItem;
