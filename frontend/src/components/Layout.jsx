import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STUDENT_NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/quizzes", label: "Browse quizzes" },
  { to: "/history", label: "My attempts" },
  { to: "/leaderboard", label: "Leaderboard" },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/quizzes", label: "Quizzes" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/attempts", label: "Attempts" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = isAdmin ? ADMIN_NAV : STUDENT_NAV;

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={`border-rule bg-white lg:sticky lg:top-0 lg:h-screen lg:border-r ${
          open ? "block" : "hidden lg:block"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-rule px-5">
          <span className="grid h-7 w-7 place-items-center rounded-[6px] bg-ink font-mono text-[13px] font-semibold text-white">
            Q
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">Quiz Platform</span>
        </div>
        <nav className="space-y-1 p-3">
          <p className="eyebrow px-3 pb-2 pt-2">{isAdmin ? "Administration" : "Student"}</p>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-rule bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen((v) => !v)}>
            Menu
          </button>
          <div className="hidden lg:block">
            <p className="eyebrow">Signed in as</p>
            <p className="text-sm font-medium">{user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge bg-paper text-ink-faint">{user?.role}</span>
            <button className="btn-ghost btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
