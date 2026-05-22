"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { slidesApi } from "@/lib/api";
import type { Slide } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge, slideStatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { SlidePreview } from "@/components/SlidePreview";
import {
  ArrowLeft,
  LayoutTemplate,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  ready: "Pronto",
  generating: "Gerando",
  error: "Erro",
  pending: "Pendente",
};

export default function SlidesPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [filtered, setFiltered] = useState<Slide[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal
  const [previewSlide, setPreviewSlide] = useState<Slide | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loadingHtml, setLoadingHtml] = useState(false);

  // Regenerating
  const [regenerating, setRegenerating] = useState<number | null>(null);

  useEffect(() => {
    loadSlides();
  }, [projectId]);

  useEffect(() => {
    if (filterStatus === "all") {
      setFiltered(slides);
    } else {
      setFiltered(slides.filter((s) => s.status === filterStatus));
    }
  }, [slides, filterStatus]);

  async function loadSlides() {
    try {
      const sl = await slidesApi.listByProject(projectId);
      setSlides(sl);
    } catch {
      setError("Erro ao carregar slides");
    } finally {
      setLoading(false);
    }
  }

  async function openPreview(slide: Slide) {
    setPreviewSlide(slide);
    setPreviewHtml("");
    setLoadingHtml(true);
    try {
      const html = await slidesApi.getHtml(slide.id);
      setPreviewHtml(html);
    } catch {
      setError("Erro ao carregar HTML do slide");
    } finally {
      setLoadingHtml(false);
    }
  }

  function downloadHtml(slide: Slide) {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slide.title.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRegenerate(slide: Slide) {
    setRegenerating(slide.id);
    try {
      const updated = await slidesApi.regenerate(slide.id);
      setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (previewSlide?.id === slide.id) {
        openPreview(updated);
      }
      setSuccess(`Slide "${updated.title}" regenerado com sucesso!`);
    } catch {
      setError("Erro ao regenerar slide");
    } finally {
      setRegenerating(null);
    }
  }

  async function handleDelete(slide: Slide) {
    if (!confirm(`Excluir o slide "${slide.title}"?`)) return;
    try {
      await slidesApi.delete(slide.id);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      if (previewSlide?.id === slide.id) setPreviewSlide(null);
      setSuccess("Slide excluído com sucesso!");
    } catch {
      setError("Erro ao excluir slide");
    }
  }

  return (
    <div className="p-8">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-2 text-sm text-ld-muted hover:text-ld-title mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Projeto
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ld-title">Slides</h1>
          <p className="text-ld-muted text-sm mt-1">
            {slides.length} slide(s) gerado(s)
          </p>
        </div>
        <Link href={`/projects/${projectId}/chat`}>
          <Button variant="outline">
            Gerar mais slides no Chat
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" message={error} onClose={() => setError("")} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success" message={success} onClose={() => setSuccess("")} />
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {["all", "ready", "generating", "error", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? "bg-ld-primary text-white"
                : "bg-white border border-ld-border text-ld-muted hover:bg-ld-soft"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white rounded-xl border border-ld-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <LayoutTemplate className="h-12 w-12 text-ld-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ld-title mb-2">
            {slides.length === 0 ? "Nenhum slide ainda" : "Nenhum slide com esse status"}
          </h3>
          <p className="text-ld-muted text-sm">
            {slides.length === 0
              ? "Use o Chat Consultivo para gerar slides com IA"
              : "Tente outro filtro de status"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((slide) => (
            <div
              key={slide.id}
              className="bg-white rounded-xl border border-ld-border overflow-hidden flex flex-col"
            >
              {/* Thumbnail / placeholder */}
              <div
                className="aspect-video bg-ld-soft border-b border-ld-border flex items-center justify-center cursor-pointer hover:bg-ld-card-light transition-colors"
                onClick={() => slide.status === "ready" && openPreview(slide)}
              >
                {slide.status === "ready" ? (
                  <div className="flex flex-col items-center gap-2">
                    <LayoutTemplate className="h-8 w-8 text-ld-primary" />
                    <span className="text-xs text-ld-muted">Clique para visualizar</span>
                  </div>
                ) : slide.status === "generating" ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 text-ld-alert animate-spin" />
                    <span className="text-xs text-ld-muted">Gerando...</span>
                  </div>
                ) : slide.status === "error" ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    <span className="text-xs text-ld-risk">Erro na geração</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <LayoutTemplate className="h-8 w-8 text-ld-muted" />
                    <span className="text-xs text-ld-muted">Pendente</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ld-title line-clamp-2">{slide.title}</p>
                  <Badge variant={slideStatusBadge(slide.status)}>
                    {STATUS_LABELS[slide.status] || slide.status}
                  </Badge>
                </div>
                {slide.error_message && (
                  <p className="text-xs text-ld-risk line-clamp-2">{slide.error_message}</p>
                )}
                <div className="flex gap-2 mt-auto">
                  {slide.status === "ready" && (
                    <button
                      onClick={() => openPreview(slide)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ld-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizar
                    </button>
                  )}
                  {slide.prompt_id && (
                    <button
                      onClick={() => handleRegenerate(slide)}
                      disabled={regenerating === slide.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ld-soft border border-ld-border text-ld-muted rounded-lg hover:bg-ld-card-light disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${regenerating === slide.id ? "animate-spin" : ""}`} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(slide)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ld-soft border border-ld-border text-ld-risk rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewSlide && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ld-border">
              <div>
                <h3 className="font-semibold text-ld-title">{previewSlide.title}</h3>
                <p className="text-xs text-ld-muted mt-0.5">
                  {previewSlide.section && `${previewSlide.section} · `}
                  {previewSlide.slide_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewHtml && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadHtml(previewSlide)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download HTML
                  </Button>
                )}
                <button
                  onClick={() => setPreviewSlide(null)}
                  className="text-ld-muted hover:text-ld-title"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {loadingHtml ? (
                <div className="aspect-video flex items-center justify-center bg-ld-soft rounded-xl">
                  <RefreshCw className="h-8 w-8 text-ld-primary animate-spin" />
                </div>
              ) : previewHtml ? (
                <SlidePreview htmlContent={previewHtml} title={previewSlide.title} />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-ld-soft rounded-xl">
                  <p className="text-ld-muted">HTML não disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
