import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { SectionHeading } from "@/components/ui/section-heading";

describe("design system primitives", () => {
  it("applies interactive surface classes to cards", () => {
    render(
      <Card surface="interactive" data-testid="card">
        Content
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveClass("bg-gradient-surface", "hover:shadow-interactive");
  });

  it("applies icon tone and shape classes", () => {
    render(
      <IconWell tone="ready" shape="pill" data-testid="icon-well">
        A
      </IconWell>,
    );

    expect(screen.getByTestId("icon-well")).toHaveClass("bg-icon-ready", "rounded-full");
  });

  it("renders section heading semantic classes", () => {
    render(<SectionHeading data-testid="heading">Projects</SectionHeading>);

    expect(screen.getByTestId("heading")).toHaveClass("uppercase", "text-muted-foreground");
  });
});
