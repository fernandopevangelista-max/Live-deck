"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, ChevronRight, FolderOpen } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  }

  const projectMatch = pathname.match(/\/projects\/(\d+)/);
  const projectId = projectMatch ? projectMatch[1] : null;

  return (
    <div className="flex min-h-screen bg-ld-soft">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-ld-border flex flex-col fixed top-0 left-0 h-full z-10">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-ld-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ld-primary flex items-center justify-center">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <span className="font-bold text-ld-title">LiveDeck Studio</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
          <NavItem
            href="/projects"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Projetos"
            active={pathname === "/projects"}
          />

          {projectId && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ld-muted uppercase tracking-wide px-3 mb-2">
                Projeto atual
              </p>
              <NavItem
                href={`/projects/${projectId}`}
                icon={<FolderOpen className="h-4 w-4" />}
                label="Visão Geral"
                active={pathname === `/projects/${projectId}`}
              />
              <NavItem
                href={`/projects/${projectId}/upload`}
                icon={<span className="text-xs font-bold">DB</span>}
                label="Base de Dados"
                active={pathname.startsWith(`/projects/${projectId}/upload`)}
              />
              <NavItem
                href={`/projects/${projectId}/chat`}
                icon={<span className="text-xs font-bold">AI</span>}
                label="Chat Consultivo"
                active={pathname.startsWith(`/projects/${projectId}/chat`)}
              />
              <NavItem
                href={`/projects/${projectId}/slides`}
                icon={<span className="text-xs font-bold">SL</span>}
                label="Slides"
                active={pathname.startsWith(`/projects/${projectId}/slides`)}
              />
            </div>
          )}
        </nav>

        {/* User */}
        {user && (
          <div className="px-4 py-4 border-t border-ld-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ld-card-light flex items-center justify-center">
                <span className="text-xs font-semibold text-ld-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ld-title truncate">{user.name}</p>
                <p className="text-xs text-ld-muted truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-ld-muted hover:text-ld-risk transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-ld-card-light text-ld-primary"
          : "text-ld-muted hover:bg-ld-soft hover:text-ld-title"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="h-3 w-3" />}
    </Link>
  );
}
