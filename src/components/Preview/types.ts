/**
 * Props for the Preview component
 */
export interface PreviewProps {
  /** Content to be previewed */
  content: string;
  /** Language of the content */
  language: string;
  /** Theme for the preview */
  theme?: "light" | "dark";
  /** Optional CSS class name */
  className?: string;
} 