"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Plus, FolderOpen, Calendar, ArrowRight } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    projectsApi
      .list()
      .then(setProjects)
      .catch(() => setError("Erro ao carregar projetos"))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ld-title">Meus Projetos</h1>
          <p className="text-ld-muted text-sm mt-1">
            Gerencie seus projetos de apresentação
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error" message={error} onClose={() => setError("")} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white rounded-xl border border-ld-border animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ld-card-light mb-4">
            <FolderOpen className="h-8 w-8 text-ld-primary" />
          </div>
          <h3 className="text-lg font-semibold text-ld-title mb-2">
            Nenhum projeto ainda
          </h3>
          <p className="text-ld-muted text-sm mb-6">
            Crie seu primeiro projeto para começar a gerar slides com IA
          </p>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              Criar Projeto
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-ld-primary/30 transition-all h-full flex flex-col">
                <div className="p-6 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-ld-card-light flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-ld-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-ld-muted" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ld-title">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-ld-muted mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {project.objective && (
                    <p className="text-xs text-ld-muted border-t border-ld-border pt-3 line-clamp-2">
                      Objetivo: {project.objective}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-1 text-xs text-ld-muted pt-2">
                    <Calendar className="h-3 w-3" />
                    {formatDate(project.created_at)}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
