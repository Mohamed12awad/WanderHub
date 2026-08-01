import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import RecordPaymentDialog from "../RecordPaymentDialog";

vi.mock("@/utils/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/api")>();
  return { ...actual, getAccounts: vi.fn().mockResolvedValue({ data: [] }) };
});

/**
 * The dialog holds six pieces of local state and Radix dismisses on backdrop
 * click and Escape by default, so a stray click discarded a part-entered
 * payment with no warning. A click outside is far too easy to do by accident
 * to be read as "throw this away"; Escape is deliberate, so it only confirms.
 */
function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <RecordPaymentDialog invoiceId="inv-1" outstanding={500} currency="USD" onSuccess={vi.fn()} />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const openDialog = async () => {
  fireEvent.click(screen.getByRole("button", { name: /record payment/i }));
  await screen.findByRole("dialog");
};

describe("RecordPaymentDialog — accidental dismissal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("closes on Escape while the form is untouched", async () => {
    renderDialog();
    await openDialog();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("asks before discarding an amount the user typed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDialog();
    await openDialog();

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "250" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes when the discard is confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderDialog();
    await openDialog();

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "250" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
