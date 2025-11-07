import React, { useState } from "react";
import { Lock, LogIn, Loader2 } from "lucide-react";
import "./SonarDashboard.css";
import { ec as EC } from "elliptic";
import BN from "bn.js";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getRandomBytes = (size) => {
    const array = new Uint8Array(size);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Please enter username.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const ec = new EC("secp256k1");

      const privateKeyHex = localStorage.getItem(`privKey_${username}`);
      if (!privateKeyHex) {
        setError(
          "No private key/Username found . Contact your system administrator."
        );
        setIsLoading(false);
        return;
      }

      const keyPair = ec.keyFromPrivate(privateKeyHex, "hex");

      const kHex = getRandomBytes(32);
      const k = new BN(kHex, 16);
      const R = ec.g.mul(k);
      const RHex = R.encode("hex");

      const challengeResponse = await fetch(
        "http://localhost:3001/login/challenge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, R: RHex }),
        }
      );

      const challengeData = await challengeResponse.json();
      if (challengeData.error) {
        setError(challengeData.error);
        setIsLoading(false);
        return;
      }

      const c = new BN(challengeData.c, 16);
      const x = keyPair.getPrivate();
      const s = k.add(c.mul(x)).umod(ec.n);

      const verifyResponse = await fetch(
        "http://localhost:3001/login/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, s: s.toString("hex") }),
        }
      );

      const verifyData = await verifyResponse.json();
      if (verifyData.status === "Login successful" && verifyData.token) {
        localStorage.setItem("username", username);
      localStorage.setItem("jwt", verifyData.token);
      setError("");
      onLogin(username);

      
    }else {
        setError("Login failed. Invalid credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <Lock size={34} />
        </div>
        <h2>Login to SONAR AI</h2>

        <input
          className="login-input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
          autoFocus
          disabled={isLoading}
        />

        <div
          className="login-error"
          style={{
            visibility: error ? "visible" : "hidden",
            minHeight: "1.5em",
          }}
        >
          {error || "\u00A0"}
        </div>

        <button
          className="login-btn"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spinner" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn size={18} />
              Login
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Login;
