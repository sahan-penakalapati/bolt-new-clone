import { render, screen } from "@testing-library/react";
import { Editor } from "../Editor";

describe("Editor Component", () => {
  it("renders with default props", () => {
    render(<Editor />);
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Editor className="custom-class" />);
    expect(screen.getByTestId("monaco-editor")).toHaveClass("custom-class");
  });

  // Note: More complex tests would require mocking Monaco editor
}); 