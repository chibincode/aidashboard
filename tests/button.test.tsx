import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("shows a spinner and loading label while disabled during loading", () => {
    render(
      <Button loading loadingLabel="Saving changes...">
        Save changes
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving changes..." });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).not.toBeNull();
  });
});
