"use client";

import React from "react";

interface SlidePreviewProps {
  htmlContent: string;
  title?: string;
}

export function SlidePreview({ htmlContent, title }: SlidePreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <p className="text-sm font-medium text-ld-muted">{title}</p>
      )}
      <div
        className="relative w-full overflow-hidden rounded-lg border border-ld-border bg-ld-soft"
        style={{ paddingBottom: "56.25%" }} // 16:9
      >
        <iframe
          srcDoc={htmlContent}
          sandbox="allow-scripts"
          className="absolute inset-0 w-full h-full"
          title={title || "Slide Preview"}
          scrolling="no"
        />
      </div>
    </div>
  );
}
