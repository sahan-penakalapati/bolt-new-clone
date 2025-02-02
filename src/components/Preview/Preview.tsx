"use client";

import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import { PreviewProps } from "./types";

/**
 * Preview component with enhanced syntax highlighting
 * @param props Preview component props
 */
export function Preview({
  content,
  language,
  theme = "light",
  className = "",
}: PreviewProps) {
  const codeRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Highlight code when content or language changes
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [content, language]);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc?.open();
      doc?.write(content);
      doc?.close();
    }
  }, [content]);

  return (
    <div 
      className={`preview-container p-4 rounded overflow-auto ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      } ${className}`}
      data-testid="preview-container"
    >
      <pre className="whitespace-pre-wrap font-mono text-sm">
        <code 
          ref={codeRef}
          className={`language-${language}`}
        >
          {content}
        </code>
      </pre>
    </div>
  );
} 