import React from "react";
import { NavLink } from "react-router-dom";
import LoginButton from "../blocks/LoginButton";
import SearchBar from "../ui/SearchBar";
import { useHealth } from "../../context/HealthContext";
import styles from "./Navbar.module.scss";

const Navbar: React.FC = () => {
  const { isBackendReachable, loading } = useHealth();

  return (
    <nav className={styles.navbar}>
      <NavLink className="navbar-brand fs-3" to="/dashboard">
        SpotiHost
      </NavLink>
      <div className="d-flex gap-4 mx-auto">
        <NavLink
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          to="/dashboard"
        >
          Dashboard
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          to="/top"
        >
          Top
        </NavLink>

        <NavLink
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          to="/analytics"
        >
          Analytics
        </NavLink>
      </div>
      <div className="d-none d-md-block me-3" style={{ width: "280px" }}>
        <SearchBar />
      </div>
      <div className="d-flex align-items-center">
        {!loading && isBackendReachable && <LoginButton />}
      </div>
    </nav>
  );
};

export default Navbar;
