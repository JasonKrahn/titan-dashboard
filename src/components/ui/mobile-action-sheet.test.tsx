import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileActionSheet, type MobileActionItem } from "@/components/ui/mobile-action-sheet";

const renderProjectSheet = (actions?: MobileActionItem[]) => {
  const onOpenChange = vi.fn();
  const onUpload = vi.fn();
  const sheetActions: MobileActionItem[] = actions ?? [
    {
      label: "Upload photo",
      helperText: "Add photo evidence to this project",
      icon: <span aria-hidden="true">U</span>,
      onClick: onUpload,
    },
  ];

  render(
    <MobileActionSheet
      open
      onOpenChange={onOpenChange}
      title="Project actions"
      actions={sheetActions}
      variant="project"
    />,
  );

  return { onOpenChange, onUpload };
};

describe("MobileActionSheet", () => {
  it("renders project actions with the same solid surface classes as the default sheet", () => {
    renderProjectSheet();

    const dialog = screen.getByRole("dialog", { name: "Project actions" });
    const uploadAction = within(dialog).getByRole("button", {
      name: "Upload photo Add photo evidence to this project",
    });

    expect(dialog).toHaveClass("bg-background", "rounded-t-2xl");
    expect(dialog).not.toHaveClass("bg-surface-container-high", "rounded-t-3xl");
    expect(uploadAction).toHaveClass("border-border", "bg-card", "text-left");
    expect(uploadAction).not.toHaveClass("border-outline-variant/30", "bg-surface-variant");
    expect(within(uploadAction).getByText("Upload photo")).toHaveClass("text-foreground");
    expect(within(uploadAction).getByText("Add photo evidence to this project")).toHaveClass("text-muted-foreground");
  });

  it("keeps project action behavior unchanged", () => {
    const { onOpenChange, onUpload } = renderProjectSheet();

    fireEvent.click(screen.getByRole("button", {
      name: "Upload photo Add photo evidence to this project",
    }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUpload).toHaveBeenCalledTimes(1);
  });
});
