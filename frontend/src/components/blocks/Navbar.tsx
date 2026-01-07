import React from "react";
import { NavLink } from "react-router-dom";
import LoginButton from "./LoginButton";

const Navbar: React.FC = () => {
  return (
    <nav className="custom-navbar position-relative rounded d-flex align-items-center p-3 pe-4">
      <NavLink className="navbar-brand fs-3" to="/dashboard">
        SpotiHost
      </NavLink>

      <div className="position-absolute start-50 translate-middle-x d-flex gap-4">
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
      </div>

      <div className="position-absolute end-0 pe-4 d-flex align-items-center">
        <LoginButton />
      </div>
    </nav>
  );
};

export default Navbar;
