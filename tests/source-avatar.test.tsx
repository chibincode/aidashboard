import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceAvatar } from "@/components/dashboard/source-avatar";

describe("SourceAvatar", () => {
  it("renders the image when available and keeps a cross-origin friendly referrer policy", () => {
    render(<SourceAvatar src="https://pbs.twimg.com/profile_images/example.jpg" name="OpenAI" />);

    const image = screen.getByRole("img", { name: "OpenAI avatar" });
    expect(image).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  });

  it("shows the fallback after an image error and retries when the src changes", () => {
    const { rerender } = render(<SourceAvatar src="https://pbs.twimg.com/profile_images/first.jpg" name="OpenAI" />);

    const firstImage = screen.getByRole("img", { name: "OpenAI avatar" });
    fireEvent.error(firstImage);

    expect(screen.getByText("O")).toBeInTheDocument();

    rerender(<SourceAvatar src="https://pbs.twimg.com/profile_images/second.jpg" name="OpenAI" />);

    expect(screen.getByRole("img", { name: "OpenAI avatar" })).toHaveAttribute(
      "src",
      "https://pbs.twimg.com/profile_images/second.jpg",
    );
  });
});
