import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { Labeled } from "../../components/admin/FieldEditor";
import { useAdmin } from "./AdminLayout";

interface AdminRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export default function Settings() {
  const me = useAdmin();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nu, setNu] = useState({ name: "", email: "", password: "" });
  const [nuMsg, setNuMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const load = () => api.get<AdminRow[]>("/api/admin/admins").then(setAdmins);
  useEffect(() => {
    load();
  }, []);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("pw");
    try {
      await api.put("/api/admin/password", pw);
      setPw({ current: "", next: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("nu");
    try {
      await api.post("/api/admin/admins", nu);
      setNu({ name: "", email: "", password: "" });
      setNuMsg({ ok: true, text: "Admin added. Share the password with them securely." });
      load();
    } catch (err) {
      setNuMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  const remove = async (a: AdminRow) => {
    if (!confirm(`Remove admin access for ${a.email}?`)) return;
    await api.del(`/api/admin/admins/${a.id}`);
    load();
  };

  return (
    <main className="mx-auto max-w-[900px] space-y-5 px-4 pb-16 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-white">Settings</h1>

      <section className="panel p-5">
        <h2 className="font-display font-semibold text-white">Admins</h2>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="flex-1">
                <p className="text-white">
                  {a.name || a.email} {a.id === me.id && <span className="muted">(you)</span>}
                </p>
                <p className="muted text-xs">{a.email}</p>
              </div>
              {a.id !== me.id && (
                <button className="a-btn-danger" onClick={() => remove(a)} aria-label={`Remove ${a.email}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addAdmin} className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Labeled label="Name">
            <input className="a-input" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} />
          </Labeled>
          <Labeled label="Email">
            <input className="a-input" type="email" required value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          </Labeled>
          <Labeled label="Password">
            <input className="a-input" type="password" required minLength={8} autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          </Labeled>
          <button className="a-btn-primary" disabled={busy === "nu"}>
            {busy === "nu" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add
          </button>
        </form>
        {nuMsg && <p className={`mt-2 text-sm ${nuMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{nuMsg.text}</p>}
      </section>

      <form onSubmit={changePw} className="panel space-y-4 p-5">
        <h2 className="font-display font-semibold text-white">Change your password</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Current password">
            <input className="a-input" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Labeled>
          <Labeled label="New password">
            <input className="a-input" type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Labeled>
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{pwMsg.text}</p>}
        <button className="a-btn-primary" disabled={busy === "pw"}>
          {busy === "pw" && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
      </form>
    </main>
  );
}
