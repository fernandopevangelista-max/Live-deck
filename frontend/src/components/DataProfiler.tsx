"use client";

import React from "react";
import type { DataProfile } from "@/lib/types";
import { Database, Calendar, Columns, Rows } from "lucide-react";

interface DataProfilerProps {
  profile: DataProfile;
}

export function DataProfiler({ profile }: DataProfilerProps) {
  if (profile.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Erro ao processar arquivo: {profile.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Rows className="h-5 w-5 text-ld-primary" />}
          label="Linhas"
          value={profile.row_count?.toLocaleString("pt-BR") ?? "N/A"}
        />
        <StatCard
          icon={<Columns className="h-5 w-5 text-ld-primary" />}
          label="Colunas"
          value={profile.column_count?.toString() ?? "N/A"}
        />
        <StatCard
          icon={<Database className="h-5 w-5 text-ld-primary" />}
          label="Aba"
          value={profile.suggested_sheet ?? "N/A"}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-ld-primary" />}
          label="Período"
          value={profile.detected_period ?? "Não detectado"}
        />
      </div>

      {/* Columns */}
      <div className="flex flex-col gap-3">
        {profile.numeric_cols.length > 0 && (
          <ColGroup label="Colunas Numéricas" cols={profile.numeric_cols} color="text-blue-700 bg-blue-50" />
        )}
        {profile.percentage_cols.length > 0 && (
          <ColGroup label="Percentuais/Taxas" cols={profile.percentage_cols} color="text-purple-700 bg-purple-50" />
        )}
        {profile.text_cols.length > 0 && (
          <ColGroup label="Texto/Categoria" cols={profile.text_cols} color="text-green-700 bg-green-50" />
        )}
      </div>

      {/* Preview table */}
      {profile.preview && profile.preview.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-ld-title">Prévia (primeiras linhas)</h4>
          <div className="overflow-x-auto rounded-lg border border-ld-border">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-ld-soft border-b border-ld-border">
                  {Object.keys(profile.preview[0]).map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-semibold text-ld-title whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-ld-soft"}>
                    {Object.values(row).map((val, j) => (
                      <td
                        key={j}
                        className="px-3 py-1.5 text-ld-muted whitespace-nowrap max-w-[200px] truncate"
                      >
                        {val === null || val === undefined ? (
                          <span className="italic text-ld-muted/50">null</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-ld-soft border border-ld-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-ld-muted font-medium">{label}</span>
      </div>
      <span className="text-lg font-semibold text-ld-title truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

function ColGroup({ label, cols, color }: { label: string; cols: string[]; color: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ld-muted mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {cols.map((col) => (
          <span
            key={col}
            className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}
          >
            {col}
          </span>
        ))}
      </div>
    </div>
  );
}
