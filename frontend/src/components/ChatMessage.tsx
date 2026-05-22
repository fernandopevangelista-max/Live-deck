"use client";

import React from "react";
import { User, Bot } from "lucide-react";

const PROMPT_TRIGGER = "PROMPT GERADO PARA O SLIDE:";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  onSavePrompt?: (promptContent: string) => void;
  onGenerateSlide?: (promptContent: string) => void;
  isSaving?: boolean;
  isGenerating?: boolean;
}

export function ChatMessage({
  role,
  content,
  onSavePrompt,
  onGenerateSlide,
  isSaving,
  isGenerating,
}: ChatMessageProps) {
  const isUser = role === "user";
  const hasPrompt = content.includes(PROMPT_TRIGGER);

  let beforePrompt = content;
  let promptContent = "";

  if (hasPrompt) {
    const idx = content.indexOf(PROMPT_TRIGGER);
    beforePrompt = content.slice(0, idx);
    promptContent = content.slice(idx + PROMPT_TRIGGER.length).trim();
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-ld-primary" : "bg-ld-card-light"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-ld-primary" />
        )}
      </div>
      <div
        className={`flex flex-col gap-2 max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
            isUser
              ? "bg-ld-primary text-white rounded-tr-none"
              : "bg-ld-soft text-ld-text border border-ld-border rounded-tl-none"
          }`}
        >
          {hasPrompt ? beforePrompt : content}
        </div>

        {hasPrompt && (
          <div className="w-full border border-ld-primary/20 bg-ld-card-light rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ld-primary uppercase tracking-wide">
                Prompt Gerado para o Slide
              </span>
            </div>
            <p className="text-xs text-ld-text whitespace-pre-wrap max-h-40 overflow-y-auto">
              {promptContent}
            </p>
            <div className="flex gap-2 mt-1">
              {onSavePrompt && (
                <button
                  onClick={() => onSavePrompt(promptContent)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-ld-border text-ld-title rounded-lg hover:bg-ld-soft disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Salvando..." : "Salvar Prompt"}
                </button>
              )}
              {onGenerateSlide && (
                <button
                  onClick={() => onGenerateSlide(promptContent)}
                  disabled={isGenerating || isSaving}
                  className="px-3 py-1.5 text-xs font-medium bg-ld-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? "Gerando Slide..." : "Gerar Slide"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
