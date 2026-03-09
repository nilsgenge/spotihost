import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      fetch(`/api/auth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then(async (res) => {
          if (res.ok) {
            setStatus("Success! Redirecting...");
            setAuthenticated(true);
            try {
              await res.json();
            } catch (e) {}
            // Delay redirect to allow ingestion to complete
            setTimeout(() => navigate("/dashboard"), 2000);
          } else {
            setStatus("Authentication failed.");
          }
        })
        .catch((err) => {
          console.error(err);
          setStatus("Error communicating with backend.");
        });
    } else {
      setStatus("No code found in URL.");
    }
  }, [searchParams, navigate, setAuthenticated]);

  return <div>{status}</div>;
};

export default Callback;
