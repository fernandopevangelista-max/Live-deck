"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi, datasetsApi, conversationsApi, slidesApi } from "@/lib/api";
import type { Project, Dataset, Conversation, Slide } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge, slideStatusBadge } from "@/components/ui/Badge";
import {
  FolderOpen,
  Database,
  MessageSquare,
  LayoutTemplate,
  ArrowLeft,
  Upload,
  Plus,
  ChevronRight,
} from "lucide-react";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, ds, cs, sl] = await Promise.all([
          projectsApi.get(projectId),
          datasetsApi.listByProject(projectId),
          conversationsApi.list(projectId),
          slidesApi.listByProject(projectId),
        ]);
        setProject(p);
        setDatasets(ds);
        setConversations(cs);
        setSlides(sl);
      } catch {
        setError("Erro ao carregar projeto");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-ld-border rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-ld-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <Alert variant="error" message={error || "Projeto não encontrado"} />
      </div>
    );
  }

  const readySlides = slides.filter((s) => s.status === "ready").length;

  return (
    <div className="p-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-ld-muted hover:text-ld-title mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos os Projetos
      </Link>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      {/* Project header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ld-card-light flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-ld-primary" />
            </div>
            <h1 className="text-2xl font-bold text-ld-title">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-ld-muted text-sm mt-2 ml-[52px]">{project.description}</p>
          )}
          {project.objective && (
            <p className="text-ld-muted text-sm mt-1 ml-[52px]">
              <span className="font-medium">Objetivo:</span> {project.objective}
            </p>
          )}
          {project.target_audience && (
            <p className="text-ld-muted text-sm mt-1 ml-[52px]">
              <span className="font-medium">Público:</span> {project.target_audience}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SectionCard
          icon={<Database className="h-6 w-6 text-ld-primary" />}
          title="Bases de Dados"
          count={datasets.length}
          description={datasets.length === 0 ? "Nenhuma base carregada" : `${datasets.length} arquivo(s)`}
          href={`/projects/${projectId}/upload`}
          action="Gerenciar Bases"
        />
        <SectionCard
          icon={<MessageSquare className="h-6 w-6 text-ld-primary" />}
          title="Chat Consultivo"
          count={conversations.length}
          description={
            conversations.length === 0 ? "Nenhuma conversa" : `${conversations.length} conversa(s)`
          }
          href={`/projects/${projectId}/chat`}
          action="Abrir Chat"
        />
        <SectionCard
          icon={<LayoutTemplate className="h-6 w-6 text-ld-primary" />}
          title="Slides"
          count={slides.length}
          description={
            slides.length === 0 ? "Nenhum slide gerado" : `${readySlides} de ${slides.length} prontos`
          }
          href={`/projects/${projectId}/slides`}
          action="Ver Slides"
        />
      </div>

      {/* Recent datasets */}
      {datasets.length > 0 && (
        <Section
          title="Bases de Dados Recentes"
          href={`/projects/${projectId}/upload`}
          linkLabel="Ver todas"
        >
          <div className="flex flex-col divide-y divide-ld-border">
            {datasets.slice(0, 3).map((ds) => (
              <div key={ds.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ld-title">{ds.original_filename}</p>
                  <p className="text-xs text-ld-muted">
                    {ds.row_count?.toLocaleString("pt-BR")} linhas &bull; {ds.column_count} colunas
                    {ds.selected_sheet && ` · Aba: ${ds.selected_sheet}`}
                  </p>
                </div>
                <Badge variant="success">Carregado</Badge>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent slides */}
      {slides.length > 0 && (
        <Section
          title="Slides Recentes"
          href={`/projects/${projectId}/slides`}
          linkLabel="Ver todos"
        >
          <div className="flex flex-col divide-y divide-ld-border">
            {slides.slice(0, 5).map((sl) => (
              <div key={sl.id} className="flex items-center justify-between py-3">
                <p className="text-sm font-medium text-ld-title">{sl.title}</p>
                <Badge variant={slideStatusBadge(sl.status)}>
                  {sl.status === "ready"
                    ? "Pronto"
                    : sl.status === "generating"
                    ? "Gerando..."
                    : sl.status === "error"
                    ? "Erro"
                    : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empty state CTA */}
      {datasets.length === 0 && (
        <div className="mt-8 bg-ld-card-light border border-ld-primary/20 rounded-2xl p-8 text-center">
          <Upload className="h-10 w-10 text-ld-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-ld-title mb-2">
            Comece carregando uma base de dados
          </h3>
          <p className="text-ld-muted text-sm mb-5">
            Faça upload de um arquivo Excel, CSV ou JSON para começar a criar slides com IA
          </p>
          <Link href={`/projects/${projectId}/upload`}>
            <Button>
              <Plus className="h-4 w-4" />
              Carregar Base de Dados
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  count,
  description,
  href,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-ld-border p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-ld-card-light flex items-center justify-center">
          {icon}
        </div>
        <span className="text-2xl font-bold text-ld-title">{count}</span>
      </div>
      <div>
        <h3 className="font-semibold text-ld-title">{title}</h3>
        <p className="text-xs text-ld-muted mt-0.5">{description}</p>
      </div>
      <Link href={href} className="text-sm font-medium text-ld-primary hover:underline flex items-center gap-1 mt-auto">
        {action} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-ld-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ld-title">{title}</h3>
        <Link href={href} className="text-xs text-ld-primary hover:underline flex items-center gap-1">
          {linkLabel} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}
