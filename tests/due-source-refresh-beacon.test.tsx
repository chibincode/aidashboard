import { render, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DueSourceRefreshBeacon } from "@/components/dashboard/due-source-refresh-beacon";

const { routerRefresh } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

describe("DueSourceRefreshBeacon", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    routerRefresh.mockReset();
    window.sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ completed: 1 }),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("refreshes due sources after the initial delay", async () => {
    render(<DueSourceRefreshBeacon />);

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(routerRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("checks again after the throttle window instead of only once per session", async () => {
    render(<DueSourceRefreshBeacon />);

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(59_000);
    expect(fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
