import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { Logo } from "../../components/Brand";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/api/admin/login", { email, password });
      const next = params.get("next");
      navigate(next && next.startsWith("/admin") ? next : "/admin", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,#0a1063_0%,#0d0d10_60%)] px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-7">
        <span className="inline-block rounded-xl bg-white px-3 py-2">
          <Logo className="h-8" />
        </span>
        <h1 className="mt-6 font-display text-xl font-semibold">Admin sign in</h1>
        <p className="muted mt-1 text-sm">Feedback dashboard and form builder.</p>
        <label className="mt-6 block text-sm font-medium">
          Email
          <input className="a-input mt-1.5" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            className="a-input mt-1.5"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
        <button className="a-btn-primary mt-6 w-full py-2.5" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
        <Link to="/" className="muted mt-5 block text-center text-xs hover:text-white">
          ← Back to feedback forms
        </Link>
      </form>
    </div>
  );
}
