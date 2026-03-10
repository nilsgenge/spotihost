import React, { useState } from "react";
import { FaSpotify, FaHeadphones } from "react-icons/fa";
import Block from "../components/ui/Block";

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
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-logo">
          <div className="welcome-logo-glow"></div>
          <div className="welcome-logo-glow-outer"></div>
          <div className="welcome-title-container">
            <p className="welcome-prefix">Welcome to</p>
            <h1 className="welcome-title">SpotiHost</h1>
          </div>
        </div>

        <p className="welcome-tagline">
          Your personal Spotify listening history tracker
        </p>

        <button
          className="welcome-login-btn"
          onClick={handleLogin}
          disabled={isRedirecting}
        >
          <FaSpotify className="welcome-spotify-icon" />
          <span>{isRedirecting ? "Redirecting..." : "Login with Spotify"}</span>
        </button>

        <div className="welcome-blocks">
          <Block fullWidth={false} className="welcome-feature-block">
            <div className="d-flex align-items-center gap-3">
              <div className="welcome-block-icon">
                <FaHeadphones />
              </div>
              <div>
                <div className="welcome-block-title">Track Your Listening</div>
                <div className="welcome-block-desc">
                  Detailed analytics & insights
                </div>
              </div>
            </div>
          </Block>
        </div>

        <p className="welcome-footer">Start tracking your music today!</p>
      </div>

      <div className="welcome-bg-gradient welcome-bg-1"></div>
      <div className="welcome-bg-gradient welcome-bg-2"></div>
      <div className="welcome-bg-gradient welcome-bg-3"></div>
    </div>
  );
};

export default Welcome;
