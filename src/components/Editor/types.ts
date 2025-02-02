/**
 * Props for the Editor component
 */
export interface EditorProps {
  /** Initial content to display in the editor */
  initialContent?: string;
  /** Callback fired when editor content changes */
  onChange?: (content: string) => void;
  /** Language mode for syntax highlighting */
  language?: string;
  /** Theme to use - "light" or "dark" */
  theme?: "light" | "dark";
  /** Optional CSS class name */
  className?: string;
}

/**
 * Editor configuration options
 */
export interface EditorConfig {
  /** Font size in pixels */
  fontSize: number;
  /** Line numbers display mode */
  lineNumbers: "on" | "off" | "relative" | "interval";
  /** Whether to enable word wrap */
  wordWrap: "on" | "off";
  /** Whether to highlight the active line */
  renderLineHighlight: "all" | "line" | "none";
  /** Minimap settings */
  minimap: {
    enabled: boolean;
  };
} 