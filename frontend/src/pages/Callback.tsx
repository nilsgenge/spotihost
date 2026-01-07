import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      fetch(`${API_URL}/auth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => {
          if (res.ok) {
            setStatus("Success! Redirecting...");
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
  }, [searchParams]);

  return <div>{status}</div>;
};

export default Callback;
