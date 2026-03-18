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
        json: async () => ({ completed: 1, createdCount: 1 }),
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
    await vi.runAllTicks();
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it("checks again after the throttle window instead of only once per session", async () => {
    render(<DueSourceRefreshBeacon />);

    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTicks();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(59_700);
    expect(fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_300);
    await vi.runAllTicks();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not refresh the page when due sync finishes without new items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ completed: 2, createdCount: 0 }),
      }),
    );

    render(<DueSourceRefreshBeacon />);

    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTicks();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);

    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
