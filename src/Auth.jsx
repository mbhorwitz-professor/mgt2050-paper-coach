import React, { useState } from "react";
import { supabase } from "./supabase";

function Auth() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(event) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return;

    setLoading(true);
    setStatus("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error("Supabase sign-in error:", error);
        setStatus(`Sign-in error: ${error.message}`);
      } else {
        setStatus(
          "Check your email for the secure sign-in link."
        );
      }
    } catch (error) {
      console.error("Unexpected authentication error:", error);
      setStatus(
        `Authentication request failed: ${
          error?.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark auth-brand">N</div>

        <div className="eyebrow">
          NOVA SOUTHEASTERN UNIVERSITY · MGT 2050
        </div>

        <h1>Individual Management Paper Coach</h1>

        <p>
          Sign in with your course email address to continue your
          paper-coaching work.
        </p>

        <form onSubmit={sendMagicLink}>
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="student@example.edu"
            autoComplete="email"
            required
          />

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Sending…"
              : "Send secure sign-in link"}
          </button>
        </form>

        {status && (
          <div className="auth-status">
            {status}
          </div>
        )}

        <p className="auth-note">
          Your work is stored securely so you can return to your
          paper-coaching process later.
        </p>
      </section>
    </main>
  );
}

export default Auth;
