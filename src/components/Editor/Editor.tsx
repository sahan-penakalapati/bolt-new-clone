"use client";

import { useEffect, useRef, Suspense } from "react";
import * as monaco from "monaco-editor";
import { EditorProps, EditorConfig } from "./types";
import { EditorErrorBoundary } from "./EditorErrorBoundary";

/**
 * Default editor configuration
 */
const defaultConfig: EditorConfig = {
  fontSize: 14,
  lineNumbers: "on",
  wordWrap: "on",
  renderLineHighlight: "line",
  minimap: {
    enabled: false,
  },
};

function EditorLoading() {
  return (
    <div className="h-full min-h-[300px] animate-pulse bg-gray-100 rounded" />
  );
}

/**
 * Monaco Editor component with TypeScript support
 * @param props Editor component props
 */
export function Editor(props: EditorProps) {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent {...props} />
    </Suspense>
  );
}

// Rename existing Editor component to EditorContent
function EditorContent({
  initialContent = "",
  onChange,
  language = "typescript",
  theme = "light",
  className = "",
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialize editor
    editorInstance.current = monaco.editor.create(editorRef.current, {
      value: initialContent,
      language,
      theme: theme === "light" ? "vs-light" : "vs-dark",
      ...defaultConfig,
    });

    // Set up change handler
    const disposable = editorInstance.current.onDidChangeModelContent(() => {
      const content = editorInstance.current?.getValue() || "";
      onChange?.(content);
    });

    // Cleanup
    return () => {
      disposable.dispose();
      editorInstance.current?.dispose();
    };
  }, [initialContent, language, theme, onChange]);

  // Update theme when it changes
  useEffect(() => {
    monaco.editor.setTheme(theme === "light" ? "vs-light" : "vs-dark");
  }, [theme]);

  return (
    <EditorErrorBoundary>
      <div 
        ref={editorRef} 
        className={`h-full min-h-[300px] ${className}`}
        data-testid="monaco-editor"
      />
    </EditorErrorBoundary>
  );
} 