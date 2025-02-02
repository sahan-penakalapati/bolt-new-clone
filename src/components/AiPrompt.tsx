"use client";
import { useState } from "react";

export function AiPrompt({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [input, setInput] = useState("");

  return (
    <div className="ai-prompt-bar">
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask AI to generate code..."
      />
      <button onClick={() => onSubmit(input)}>
        Generate
      </button>
    </div>
  );
} 