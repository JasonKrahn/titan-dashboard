import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewClientDialog } from "./NewClientDialog";
import type { ClientRecord } from "@/lib/types";

const { deleteClient } = vi.hoisted(() => ({
  deleteClient: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    deleteClient,
  };
});

const client: ClientRecord = {
  id: "client-1",
  name: "Acme Homes",
  archived: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function renderDialog(props: Partial<React.ComponentProps<typeof NewClientDialog>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NewClientDialog open onOpenChange={vi.fn()} client={client} {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteClient.mockResolvedValue({ ok: true, data: client });
});

describe("NewClientDialog", () => {
  it("requires destructive confirmation before deleting a client", async () => {
    const onDeleted = vi.fn();
    renderDialog({ onDeleted });

    fireEvent.click(await screen.findByRole("button", { name: "Delete client" }));
    expect(deleteClient).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Yes, delete client" }));

    await waitFor(() => expect(deleteClient).toHaveBeenCalledWith(client.id));
    expect(onDeleted).toHaveBeenCalledWith(client.id);
  });
});
