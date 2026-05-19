import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NotFound from "./NotFound";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("NotFound", () => {
  it("routes back home without a full page load", async () => {
    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Return to Home" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/"));
  });
});
