import React, { useState } from "react";
import { FaSpotify, FaHeadphones } from "react-icons/fa";
import Block from "../components/ui/Block";
import styles from "./Welcome.module.scss";

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
    <div className={styles.welcomeContainer}>
      <div className={styles.welcomeContent}>
        <div className={styles.welcomeLogo}>
          <div className={styles.welcomeLogoGlow}></div>
          <div className={styles.welcomeLogoGlowOuter}></div>
          <div className={styles.welcomeTitleContainer}>
            <p className={styles.welcomePrefix}>Welcome to</p>
            <h1 className={styles.welcomeTitle}>SpotiHost</h1>
          </div>
        </div>

        <p className={styles.welcomeTagline}>
          Your personal Spotify listening history tracker
        </p>

        <button
          className={styles.welcomeLoginBtn}
          onClick={handleLogin}
          disabled={isRedirecting}
        >
          <FaSpotify className={styles.welcomeSpotifyIcon} />
          <span>{isRedirecting ? "Redirecting..." : "Login with Spotify"}</span>
        </button>

        <div className={styles.welcomeBlocks}>
          <Block fullWidth={false} className={styles.welcomeFeatureBlock}>
            <div className="d-flex align-items-center gap-3">
              <div className={styles.welcomeBlockIcon}>
                <FaHeadphones />
              </div>
              <div>
                <div className={styles.welcomeBlockTitle}>Track Your Listening</div>
                <div className={styles.welcomeBlockDesc}>
                  Detailed analytics & insights
                </div>
              </div>
            </div>
          </Block>
        </div>

        <p className={styles.welcomeFooter}>Start tracking your music today!</p>
      </div>

      <div className={`${styles.welcomeBgGradient} ${styles.welcomeBg1}`}></div>
      <div className={`${styles.welcomeBgGradient} ${styles.welcomeBg2}`}></div>
      <div className={`${styles.welcomeBgGradient} ${styles.welcomeBg3}`}></div>
    </div>
  );
};

export default Welcome;
