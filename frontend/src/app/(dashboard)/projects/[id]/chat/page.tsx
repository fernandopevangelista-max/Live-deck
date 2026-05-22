"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { conversationsApi, datasetsApi, slidesApi } from "@/lib/api";
import type { Conversation, ConversationMessage, Dataset } from "@/lib/types";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ArrowLeft, Plus, Send, MessageSquare, Loader2 } from "lucide-react";

export default function ChatPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [generatingSlide, setGeneratingSlide] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitial();
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv]);

  async function loadInitial() {
    try {
      const [convs, ds] = await Promise.all([
        conversationsApi.list(projectId),
        datasetsApi.listByProject(projectId),
      ]);
      setConversations(convs);
      setDatasets(ds);
      if (ds.length > 0) setSelectedDatasetId(ds[0].id);
      if (convs.length > 0) setSelectedConv(convs[0]);
    } catch {
      setError("Erro ao carregar dados");
    }
  }

  async function loadMessages(convId: number) {
    try {
      const msgs = await conversationsApi.getMessages(convId);
      setMessages(msgs);
    } catch {
      setError("Erro ao carregar mensagens");
    }
  }

  async function createConversation() {
    setCreatingConv(true);
    try {
      const conv = await conversationsApi.create(projectId, {
        title: `Conversa ${conversations.length + 1}`,
        dataset_id: selectedDatasetId ?? undefined,
      });
      setConversations((prev) => [conv, ...prev]);
      setSelectedConv(conv);
      setMessages([]);
    } catch {
      setError("Erro ao criar conversa");
    } finally {
      setCreatingConv(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !selectedConv) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setError("");

    try {
      const res = await conversationsApi.sendMessage(selectedConv.id, text);
      setMessages((prev) => [
        ...prev,
        res.user_message,
        res.assistant_message,
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erro ao enviar mensagem";
      setError(msg);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function handleSavePrompt() {
    if (!selectedConv) return;
    setSavingPrompt(true);
    try {
      await conversationsApi.generatePrompt(selectedConv.id);
      setSuccess("Prompt salvo com sucesso!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erro ao salvar prompt";
      setError(msg);
    } finally {
      setSavingPrompt(false);
    }
  }

  async function handleGenerateSlide() {
    if (!selectedConv) return;
    setGeneratingSlide(true);
    setError("");
    try {
      const prompt = await conversationsApi.generatePrompt(selectedConv.id);
      const slide = await slidesApi.buildFromPrompt(prompt.id);
      setSuccess(`Slide "${slide.title}" gerado! Acesse a aba Slides para visualizar.`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erro ao gerar slide";
      setError(msg);
    } finally {
      setGeneratingSlide(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ld-border bg-white flex items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-ld-muted hover:text-ld-title"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-ld-title">Chat Consultivo</h1>
        </div>
        {datasets.length > 0 && (
          <select
            value={selectedDatasetId ?? ""}
            onChange={(e) => setSelectedDatasetId(Number(e.target.value) || null)}
            className="text-sm border border-ld-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ld-primary"
          >
            <option value="">Sem base</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.original_filename}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className="px-6 py-2">
          {error && <Alert variant="error" message={error} onClose={() => setError("")} />}
          {success && <Alert variant="success" message={success} onClose={() => setSuccess("")} />}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: conversation list */}
        <div className="w-64 border-r border-ld-border bg-white flex flex-col">
          <div className="p-3 border-b border-ld-border">
            <Button
              onClick={createConversation}
              loading={creatingConv}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Conversa
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-ld-muted text-center py-8">
                Nenhuma conversa ainda
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-ld-border/50 transition-colors ${
                    selectedConv?.id === conv.id
                      ? "bg-ld-card-light"
                      : "hover:bg-ld-soft"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-ld-muted flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-ld-title truncate">{conv.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col bg-ld-soft overflow-hidden">
          {selectedConv ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center">
                    <div>
                      <MessageSquare className="h-12 w-12 text-ld-muted mx-auto mb-3" />
                      <p className="text-ld-muted">
                        Inicie a conversa descrevendo o que quer analisar
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      onSavePrompt={
                        msg.role === "assistant"
                          ? () => handleSavePrompt()
                          : undefined
                      }
                      onGenerateSlide={
                        msg.role === "assistant"
                          ? () => handleGenerateSlide()
                          : undefined
                      }
                      isSaving={savingPrompt}
                      isGenerating={generatingSlide}
                    />
                  ))
                )}
                {sending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-ld-card-light flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-ld-primary animate-spin" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white border border-ld-border text-sm text-ld-muted">
                      Analisando...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-ld-border bg-white">
                <div className="flex gap-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem... (Enter para enviar)"
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-lg border border-ld-border bg-ld-soft text-ld-text placeholder-ld-muted focus:outline-none focus:ring-2 focus:ring-ld-primary resize-none text-sm"
                    disabled={sending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    loading={sending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-ld-muted mt-2">
                  Enter para enviar &bull; Shift+Enter para nova linha
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="h-16 w-16 text-ld-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-ld-title mb-2">
                  Selecione ou crie uma conversa
                </h3>
                <p className="text-ld-muted text-sm mb-6">
                  Converse com a IA para criar prompts de slide
                </p>
                <Button onClick={createConversation} loading={creatingConv}>
                  <Plus className="h-4 w-4" />
                  Nova Conversa
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
