import { render, screen } from "@testing-library/react";
import { Preview } from "../Preview";

describe("Preview Component", () => {
  const defaultProps = {
    content: "const x = 42;",
    language: "typescript",
  };

  it("renders content correctly", () => {
    render(<Preview {...defaultProps} />);
    expect(screen.getByText(defaultProps.content)).toBeInTheDocument();
  });

  it("applies language class", () => {
    render(<Preview {...defaultProps} />);
    expect(screen.getByTestId("preview-container")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.content).className).toContain(`language-${defaultProps.language}`);
  });

  it("applies dark theme", () => {
    render(<Preview {...defaultProps} theme="dark" />);
    expect(screen.getByTestId("preview-container")).toHaveClass("bg-gray-900");
  });
}); 