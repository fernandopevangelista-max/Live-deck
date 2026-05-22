"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { datasetsApi } from "@/lib/api";
import type { Dataset } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { DataProfiler } from "@/components/DataProfiler";
import { ArrowLeft, Upload, FileSpreadsheet, RefreshCw } from "lucide-react";

export default function UploadPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profiling, setProfiling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");

  useEffect(() => {
    loadDatasets();
  }, [projectId]);

  async function loadDatasets() {
    try {
      const ds = await datasetsApi.listByProject(projectId);
      setDatasets(ds);
      if (ds.length > 0 && !selectedDataset) {
        setSelectedDataset(ds[0]);
      }
    } catch {
      setError("Erro ao carregar bases de dados");
    }
  }

  async function handleFile(file: File) {
    setError("");
    setSuccess("");
    setUploading(true);
    try {
      const dataset = await datasetsApi.upload(projectId, file);
      setSuccess(`Arquivo "${file.name}" carregado com sucesso!`);
      await loadDatasets();
      setSelectedDataset(dataset);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erro ao fazer upload";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleReprofile() {
    if (!selectedDataset) return;
    setError("");
    setProfiling(true);
    try {
      const updated = await datasetsApi.profile(selectedDataset.id, selectedSheet || undefined);
      setSelectedDataset(updated);
      setDatasets((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      setSuccess("Perfil atualizado com sucesso!");
    } catch {
      setError("Erro ao reprofilar dataset");
    } finally {
      setProfiling(false);
    }
  }

  const profile = selectedDataset?.profile_data;

  return (
    <div className="p-8">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-2 text-sm text-ld-muted hover:text-ld-title mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Projeto
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ld-title">Bases de Dados</h1>
        <p className="text-ld-muted text-sm mt-1">
          Faça upload de arquivos Excel, CSV ou JSON para usar nas apresentações
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: upload + list */}
        <div className="flex flex-col gap-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragging ? "border-ld-primary bg-ld-card-light" : "border-ld-border bg-white hover:border-ld-primary/50"
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls,.csv,.json"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Upload className="h-10 w-10 text-ld-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-ld-title">
              {uploading ? "Enviando..." : "Arraste ou clique para upload"}
            </p>
            <p className="text-xs text-ld-muted mt-1">XLSX, XLSM, XLS, CSV, JSON</p>
          </div>

          {/* List of datasets */}
          {datasets.length > 0 && (
            <div className="bg-white rounded-xl border border-ld-border">
              <div className="px-4 py-3 border-b border-ld-border">
                <p className="text-sm font-semibold text-ld-title">Bases Carregadas</p>
              </div>
              <div className="divide-y divide-ld-border">
                {datasets.map((ds) => (
                  <button
                    key={ds.id}
                    onClick={() => {
                      setSelectedDataset(ds);
                      setSelectedSheet(ds.selected_sheet || "");
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                      selectedDataset?.id === ds.id
                        ? "bg-ld-card-light"
                        : "hover:bg-ld-soft"
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 text-ld-primary flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ld-title truncate">
                        {ds.original_filename}
                      </p>
                      <p className="text-xs text-ld-muted">
                        {ds.row_count?.toLocaleString("pt-BR") ?? "?"} linhas
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: profile */}
        <div className="lg:col-span-2">
          {selectedDataset && profile ? (
            <div className="bg-white rounded-xl border border-ld-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-ld-title">
                    {selectedDataset.original_filename}
                  </h3>
                  <p className="text-xs text-ld-muted mt-0.5">Perfil da base de dados</p>
                </div>
                <div className="flex items-center gap-2">
                  {profile.sheets && profile.sheets.length > 1 && (
                    <select
                      value={selectedSheet || profile.suggested_sheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="text-sm border border-ld-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ld-primary"
                    >
                      {profile.sheets.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReprofile}
                    loading={profiling}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar
                  </Button>
                </div>
              </div>
              <DataProfiler profile={profile} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-ld-border p-12 text-center flex flex-col items-center justify-center h-full">
              <FileSpreadsheet className="h-12 w-12 text-ld-muted mb-4" />
              <p className="text-ld-muted">
                {datasets.length > 0
                  ? "Selecione uma base para ver o perfil"
                  : "Faça upload de um arquivo para começar"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
