import React, { useState } from "react";

const Welcome: React.FC = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100">
      <div className="text-center">
        <h1 className="display-3 fw-bold mb-3 text-white">
          Welcome to SpotiHost
        </h1>
        <p className="fs-5 text-custom-muted mb-5">
          Your personal Spotify listening history tracker
        </p>
        <button
          className="btn btn-primary btn-lg py-3 px-5 fs-4 fw-semibold"
          onClick={handleLogin}
          disabled={isRedirecting}
        >
          {isRedirecting ? "Redirecting..." : "Login with Spotify"}
        </button>
      </div>
    </div>
  );
};

export default Welcome;
