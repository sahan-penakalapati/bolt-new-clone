"use client";

import { useState, useEffect } from "react";
import { Editor } from "./Editor/Editor";
import { Preview } from "./Preview/Preview";
import { ThemeToggle } from "./ThemeToggle/ThemeToggle";

/**
 * Container component that manages Editor and Preview state
 */
export function EditorContainer() {
  const [content, setContent] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "light";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    setTheme(current => {
      const newTheme = current === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      return newTheme;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end p-4">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        <Editor
          initialContent=""
          onChange={setContent}
          theme={theme}
          className="border rounded"
        />
        <Preview
          content={content}
          language="typescript"
          theme={theme}
          className="border rounded"
        />
      </div>
    </div>
  );
} 