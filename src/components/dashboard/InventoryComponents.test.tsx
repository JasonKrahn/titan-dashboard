import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryDisplayCard } from "./InventoryDisplayCard";
import { QuantityStepperModal } from "./QuantityStepperModal";

describe("InventoryDisplayCard", () => {
  it("renders inventory rows and calls manage", () => {
    const onManage = vi.fn();

    render(
      <InventoryDisplayCard
        title="Materials"
        items={[
          { label: "R-20 Batt", quantity: 32 },
          { label: "Red Tuck Tape", quantity: 6 },
        ]}
        onManage={onManage}
      />,
    );

    expect(screen.getByRole("heading", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByText("R-20 Batt")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("Red Tuck Tape")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manage" }));

    expect(onManage).toHaveBeenCalledTimes(1);
  });

  it("renders an inline empty state when no inventory is logged", () => {
    render(<InventoryDisplayCard title="Equipment" items={[]} onManage={() => {}} emptyText="No equipment logged" />);

    expect(screen.getByText("No equipment logged")).toBeInTheDocument();
  });

  it("renders pickup summaries under inventory rows", () => {
    render(
      <InventoryDisplayCard
        title="Equipment"
        items={[{ label: "Drywall Lifts", quantity: 1 }]}
        onManage={() => {}}
        pickupSummaries={[{ id: "pickup-1", text: "Drywall Lifts ×1" }]}
      />,
    );

    expect(screen.getByText("Picked up:")).toBeInTheDocument();
    expect(screen.getByText("Drywall Lifts ×1")).toBeInTheDocument();
  });
});

describe("QuantityStepperModal", () => {
  it("renders catalog rows and emits increment and decrement changes", () => {
    const onQuantityChange = vi.fn();

    render(
      <QuantityStepperModal
        open
        onOpenChange={() => {}}
        title="Manage Materials"
        items={[
          { itemKey: "r20_batt", label: "R-20 Batt", quantity: 3 },
          { itemKey: "red_tuck_tape", label: "Red Tuck Tape", quantity: 1 },
        ]}
        onQuantityChange={onQuantityChange}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Manage Materials" })).toBeInTheDocument();

    const r20Row = screen.getByText("R-20 Batt").closest("li");
    expect(r20Row).not.toBeNull();
    expect(within(r20Row!).getByRole("spinbutton", { name: "Quantity for R-20 Batt" })).toHaveValue(3);

    fireEvent.click(screen.getByRole("button", { name: "Increase R-20 Batt" }));
    fireEvent.click(screen.getByRole("button", { name: "Decrease R-20 Batt" }));

    expect(onQuantityChange).toHaveBeenNthCalledWith(1, "r20_batt", 4);
    expect(onQuantityChange).toHaveBeenNthCalledWith(2, "r20_batt", 2);
  });

  it("emits typed keyboard quantities", () => {
    const onQuantityChange = vi.fn();

    render(
      <QuantityStepperModal
        open
        onOpenChange={() => {}}
        title="Manage Materials"
        items={[
          { itemKey: "drywall_board", label: "Drywall Boards", quantity: 0 },
        ]}
        onQuantityChange={onQuantityChange}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity for Drywall Boards" }), {
      target: { value: "121" },
    });

    expect(onQuantityChange).toHaveBeenCalledWith("drywall_board", 121);
  });

  it("clamps quantities at zero", () => {
    const onQuantityChange = vi.fn();

    render(
      <QuantityStepperModal
        open
        onOpenChange={() => {}}
        title="Manage Equipment"
        items={[
          { itemKey: "baker_scaffold", label: "Baker Scaffold", quantity: 0 },
          { itemKey: "site_lighting", label: "Site Lighting", quantity: -2 },
        ]}
        onQuantityChange={onQuantityChange}
      />,
    );

    const scaffoldRow = screen.getByText("Baker Scaffold").closest("li");
    const lightingRow = screen.getByText("Site Lighting").closest("li");
    expect(scaffoldRow).not.toBeNull();
    expect(lightingRow).not.toBeNull();
    expect(within(scaffoldRow!).getByRole("spinbutton", { name: "Quantity for Baker Scaffold" })).toHaveValue(0);
    expect(within(lightingRow!).getByRole("spinbutton", { name: "Quantity for Site Lighting" })).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Decrease Baker Scaffold" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease Site Lighting" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Increase Site Lighting" }));

    expect(onQuantityChange).toHaveBeenCalledWith("site_lighting", 1);
  });

  it("closes from the Done button", () => {
    const onOpenChange = vi.fn();

    render(
      <QuantityStepperModal
        open
        onOpenChange={onOpenChange}
        title="Manage Equipment"
        items={[]}
        onQuantityChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uses confirm mode when an onConfirm handler is provided", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <QuantityStepperModal
        open
        onOpenChange={onOpenChange}
        title="Manage Materials"
        items={[]}
        onQuantityChange={() => {}}
        confirmLabel="Save"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
