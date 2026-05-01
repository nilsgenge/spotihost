import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "../ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import styles from "./LoginButton.module.scss";

const LoginButton: React.FC = () => {
  const navigate = useNavigate();
  const { logout, isLoggingOut } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // get user data to display
  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/auth/me`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    fetchUser();
    window.addEventListener("focus", fetchUser);
    return () => {
      window.removeEventListener("focus", fetchUser);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Button login redirect
  const handleLogin = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch(`/api/auth/login`);
      const data = await response.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error("Login failed", error);
      setIsRedirecting(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await logout();
    navigate("/welcome");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // While loading
  if (loadingAuth) {
    return (
      <div className="d-flex align-items-center gap-3">
        <div className="flex-grow-1">
          <Skeleton width="50px" height="20px" className="mb-1" />
        </div>
        <Skeleton variant="circular" width="40px" height="40px" />
      </div>
    );
  }

  if (user) {
    return (
      <div className={styles.profileContainer} ref={menuRef}>
        {/* Profile name + image */}
        <div
          className={`${styles.profileClickable} d-flex align-items-center gap-2`}
          onClick={toggleMenu}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggleMenu();
            }
          }}
        >
          <span
            className={`fw-bold text-truncate text-white ${styles.profileName}`}
            title={user.name}
            style={{ maxWidth: "100px" }}
          >
            {user.name}
          </span>
          <img
            src={user.image}
            alt="Profile"
            className={`rounded-circle ${styles.profileImg}`}
          />
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className={`${styles.profileDropdown} position-absolute end-0 mt-2 rounded shadow-lg`}>
            <div className="py-2">
              <Link
                to="/settings"
                className={`${styles.profileDropdownLink} d-block px-4 py-2`}
                onClick={closeMenu}
              >
                Settings
              </Link>
              <Link
                to="/profile"
                className={`${styles.profileDropdownLink} d-block px-4 py-2`}
                onClick={closeMenu}
              >
                Profile
              </Link>
              <hr className="my-2 mx-3 border-secondary" />
              <button
                className={`${styles.profileDropdownLogout} d-block px-4 py-2 w-100 text-start border-0`}
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="btn btn-primary btn-lg"
      onClick={handleLogin}
      role="button"
      tabIndex={0}
    >
      {isRedirecting ? "Redirecting..." : "Login with Spotify"}
    </div>
  );
};

export default LoginButton;
