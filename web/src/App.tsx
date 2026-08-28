import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "./auth-client.ts";

type Config = { googleEnabled: boolean; passwordEnabled: boolean };

const GENERIC = "Could not sign in.";

export function App() {
  const path = window.location.pathname;
  if (path === "/_rasputin" || path === "/_rasputin/" || path === "/_rasputin/status") {
    return <StatusPage />;
  }
  return <LoginPage />;
}

function LoginPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/_rasputin/api/config")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => setConfig({ googleEnabled: false, passwordEnabled: true }));
  }, []);

  async function google() {
    setError(null);
    setPending(true);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    setPending(false);
    if (err) {
      setError(GENERIC);
    }
  }

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/",
    });
    setPending(false);
    if (err) {
      setError(GENERIC);
    } else {
      window.location.assign("/");
    }
  }

  return (
    <main className="shell">
      <p className="kicker">Rasputin</p>
      <h1>Gateway</h1>
      <p className="lede">
        Sign in to reach the IDE. Access is limited to an allowlist.
      </p>

      {config?.googleEnabled ? (
        <button
          className="google"
          type="button"
          onClick={() => void google()}
          disabled={pending}
        >
          Continue with Google
        </button>
      ) : (
        <p className="hint">Google sign-in is not configured on this host.</p>
      )}

      <details className="fallback">
        <summary>Sign in with password</summary>
        <form onSubmit={(event) => void passwordSignIn(event)}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>
          <button type="submit" disabled={pending}>
            Sign in
          </button>
        </form>
      </details>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}

function StatusPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [upstream, setUpstream] = useState<string>("checking");

  useEffect(() => {
    void (async () => {
      const me = await fetch("/_rasputin/api/me", { credentials: "include" });
      if (!me.ok) {
        window.location.assign("/login");
        return;
      }
      const body = (await me.json()) as { user: { email: string } };
      setEmail(body.user.email);
      const health = await fetch("/_rasputin/api/upstream-health", {
        credentials: "include",
      });
      setUpstream(health.ok ? "reachable" : "unreachable");
    })();
  }, []);

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/login");
  }

  return (
    <main className="shell">
      <p className="kicker">Rasputin</p>
      <h1>Status</h1>
      <dl>
        <div>
          <dt>Operator</dt>
          <dd>{email ?? "…"}</dd>
        </div>
        <div>
          <dt>Winnow</dt>
          <dd>{upstream}</dd>
        </div>
      </dl>
      <p className="row">
        <a href="/">Open IDE</a>
        <button type="button" className="ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </p>
    </main>
  );
}
