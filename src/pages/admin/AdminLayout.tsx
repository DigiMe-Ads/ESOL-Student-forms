import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ExternalLink, FileText, Loader2, LogOut, Settings as Cog } from "lucide-react";
import { api } from "../../lib/api";
import { Logo } from "../../components/Brand";

interface Admin {
  id: string;
  email: string;
  name: string;
}

const AdminCtx = createContext<Admin | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;

export default function AdminLayout() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "Admin · ESOL Premier Campus";
    api
      .get<Admin>("/api/admin/me")
      .then(setAdmin)
      .catch(() => navigate(`/admin/login?next=${encodeURIComponent(location.pathname)}`, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!admin) {
    return (
      <div className="admin grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const logout = async () => {
    await api.post("/api/admin/logout");
    navigate("/admin/login", { replace: true });
  };

  const link = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    }`;

  return (
    <AdminCtx.Provider value={admin}>
      <div className="admin min-h-screen">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[#0d0d10]/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2.5 sm:px-6">
            <span className="rounded-lg bg-white px-2 py-1">
              <Logo className="h-6" />
            </span>
            <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
              <NavLink to="/admin" end className={link}>
                <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
              <NavLink to="/admin/forms" className={link}>
                <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Forms</span>
              </NavLink>
              <NavLink to="/admin/settings" className={link}>
                <Cog className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span>
              </NavLink>
            </nav>
            <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-sm text-slate-400 hover:text-white md:inline-flex">
              Public site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <span className="hidden text-sm text-slate-500 lg:inline">{admin.email}</span>
            <button onClick={logout} className="a-btn" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </AdminCtx.Provider>
  );
}
