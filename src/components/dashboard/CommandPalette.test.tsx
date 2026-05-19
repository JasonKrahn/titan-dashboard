import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-state">
      {location.state ? JSON.stringify(location.state) : "null"}
    </div>
  );
}

describe("CommandPalette", () => {
  it("navigates to home views using route state", async () => {
    const onOpenChange = vi.fn();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <CommandPalette open onOpenChange={onOpenChange} />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("option", { name: "Projects" }));
    await waitFor(() => expect(screen.getByTestId("location-state")).toHaveTextContent('"view":"dashboard"'));

    fireEvent.click(screen.getByRole("option", { name: "Clients" }));
    await waitFor(() => expect(screen.getByTestId("location-state")).toHaveTextContent('"view":"clients"'));
  });

  it("does not expose a dead settings destination", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CommandPalette open onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });
});
