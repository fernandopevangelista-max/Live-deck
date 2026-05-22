"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ArrowLeft } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do projeto é obrigatório");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const project = await projectsApi.create({
        name,
        description,
        objective,
        target_audience: targetAudience,
      });
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erro ao criar projeto";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-ld-muted hover:text-ld-title mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ld-title">Novo Projeto</h1>
        <p className="text-ld-muted text-sm mt-1">
          Configure seu projeto de apresentação
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-ld-border shadow-sm p-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error" message={error} onClose={() => setError("")} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nome do Projeto *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Dashboard de Qualidade Q4"
            required
          />
          <Textarea
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descrição do projeto..."
            rows={3}
          />
          <Textarea
            label="Objetivo"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Qual é o objetivo principal das apresentações neste projeto?"
            rows={3}
          />
          <Input
            label="Público-Alvo"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Ex: Diretoria Executiva, Gerentes de Operações..."
          />

          <div className="flex gap-3 mt-2">
            <Link href="/projects" className="flex-1">
              <Button variant="outline" type="button" className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" loading={loading} className="flex-1">
              Criar Projeto
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
