import { useEffect, useState } from "react";
import { KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { ROLE_INFO, type Role, type User } from "../../lib/types";
import { Labeled } from "../../components/admin/FieldEditor";
import { useAdmin } from "./AdminLayout";

type Msg = { ok: boolean; text: string } | null;
const ROLES = Object.keys(ROLE_INFO) as Role[];

export default function Settings() {
  const me = useAdmin();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/api/admin/password", pw);
      setPw({ current: "", next: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[900px] space-y-5 px-4 pb-16 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-white">Settings</h1>

      {me.role === "admin" && <Users />}

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
        <button className="a-btn-primary" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
      </form>
    </main>
  );
}

function Users() {
  const me = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [nu, setNu] = useState({ name: "", email: "", password: "", role: "management" as Role });
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get<User[]>("/api/admin/admins").then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      load();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await run(async () => {
      await api.post("/api/admin/admins", nu);
      setNu({ name: "", email: "", password: "", role: "management" });
    }, "User added. Share the password with them securely.");
    setBusy(false);
  };

  const resetPassword = (u: User) => {
    const password = prompt(`New password for ${u.email} (at least 8 characters):`);
    if (password) run(() => api.put(`/api/admin/admins/${u.id}`, { password }), `Password reset for ${u.email}.`);
  };

  const remove = (u: User) => {
    if (confirm(`Remove ${u.email}? They will lose access straight away.`)) run(() => api.del(`/api/admin/admins/${u.id}`), `${u.email} removed.`);
  };

  return (
    <section className="panel p-5">
      <h2 className="font-display font-semibold text-white">Users</h2>
      <ul className="mt-3 divide-y divide-[var(--line)]">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate text-white">
                {u.name || u.email} {u.id === me.id && <span className="muted">(you)</span>}
              </p>
              <p className="muted truncate text-xs">{u.email}</p>
            </div>
            <select
              className="a-input w-auto py-1.5"
              aria-label={`Role for ${u.email}`}
              value={u.role}
              disabled={u.id === me.id}
              onChange={(e) => {
                const role = e.target.value as Role;
                run(() => api.put(`/api/admin/admins/${u.id}`, { role }), `${u.email} is now ${ROLE_INFO[role].label}.`);
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_INFO[r].label}
                </option>
              ))}
            </select>
            {u.id !== me.id && (
              <>
                <button className="a-btn" onClick={() => resetPassword(u)} title="Reset password" aria-label={`Reset password for ${u.email}`}>
                  <KeyRound className="h-4 w-4" />
                </button>
                <button className="a-btn-danger" onClick={() => remove(u)} title="Remove user" aria-label={`Remove ${u.email}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
        <Labeled label="Name">
          <input className="a-input" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} />
        </Labeled>
        <Labeled label="Email">
          <input className="a-input" type="email" required value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
        </Labeled>
        <Labeled label="Password">
          <input className="a-input" type="password" required minLength={8} autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
        </Labeled>
        <Labeled label="Role" hint={ROLE_INFO[nu.role].help}>
          <select className="a-input" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_INFO[r].label}
              </option>
            ))}
          </select>
        </Labeled>
        <div className="sm:col-span-2">
          <button className="a-btn-primary" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add user
          </button>
        </div>
      </form>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
    </section>
  );
}
