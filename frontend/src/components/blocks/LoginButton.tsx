import React, { useState, useEffect } from "react";

const LoginButton: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`);
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

  const handleLogin = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`);
      const data = await response.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error("Login failed", error);
      setIsRedirecting(false);
    }
  };

  if (loadingAuth) {
    return <span className="text-custom-muted">Loading...</span>;
  }

  if (user) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span
          className="fw-bold truncate text-white"
          title={user.name}
          style={{ maxWidth: "100px" }}
        >
          {user.name}
        </span>
        <img
          src={user.image}
          alt="Profile"
          className="rounded-circle"
          style={{
            width: "40px",
            height: "40px",
            objectFit: "cover",
            border: "2px solid var(--primary-green)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="bg-primary text-white rounded fw-bold py-2 px-4 cursor-pointer"
      onClick={handleLogin}
      role="button"
      tabIndex={0}
    >
      {isRedirecting ? "Redirecting..." : "Login with Spotify"}
    </div>
  );
};

export default LoginButton;
