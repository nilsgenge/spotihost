import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaTrophy, FaChartBar, FaSearch, FaCog } from "react-icons/fa";
import styles from "./MobileNav.module.scss";

const items = [
  { to: "/dashboard", Icon: FaHome, label: "Dashboard" },
  { to: "/top", Icon: FaTrophy, label: "Top" },
  { to: "/analytics", Icon: FaChartBar, label: "Analytics" },
  { to: "/search", Icon: FaSearch, label: "Search" },
  { to: "/settings", Icon: FaCog, label: "Settings" },
];

const MobileNav: React.FC = () => (
  <nav className={`${styles.mobileNav} d-md-none`} aria-label="Mobile">
    {items.map(({ to, Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
        aria-label={label}
      >
        <Icon />
      </NavLink>
    ))}
  </nav>
);

export default MobileNav;
