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
        .then((res) => {
          if (res.ok) {
            setStatus("Success! Redirecting...");
            setAuthenticated(true);
            navigate("/dashboard");
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
