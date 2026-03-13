import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsFlashToast } from "@/components/settings/settings-flash-toast";

describe("SettingsFlashToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the initial toast message", () => {
    render(
      <SettingsFlashToast
        initialToast={{
          id: "toast_1",
          message: "Source deleted.",
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Source deleted.");
  });

  it("dismisses the toast manually", async () => {
    const user = userEvent.setup();

    render(
      <SettingsFlashToast
        initialToast={{
          id: "toast_1",
          message: "Tag deleted.",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("dismisses the toast automatically after the timeout", () => {
    vi.useFakeTimers();

    render(
      <SettingsFlashToast
        initialToast={{
          id: "toast_1",
          message: "Rule deleted.",
        }}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
