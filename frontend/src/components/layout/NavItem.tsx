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
    className={`flex items-center gap-2 p-2 font-[600] text-gray-800 rounded-lg dark:text-white ${
      active ? "bg-gray-200 dark:text-black" : ""
    }`}
  >
    <Icon
      className={`h-5 w-5 text-gray-500  ${active ? "dark:text-black" : ""}`}
    />
    <span>{label}</span>
    {badge && <Badge>{badge}</Badge>}
  </Link>
);

export default NavItem;
