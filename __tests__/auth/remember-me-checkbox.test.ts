/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RememberMeCheckbox } from "@/components/auth/remember-me-checkbox";

afterEach(cleanup);

describe("RememberMeCheckbox", () => {
  it("renders unchecked by default when checked=false", () => {
    render(
      React.createElement(RememberMeCheckbox, {
        checked: false,
        onChange: vi.fn(),
      })
    );

    const checkbox = screen.getByRole("checkbox", { name: "Angemeldet bleiben" }) as HTMLInputElement;
    expect(checkbox).toBeDefined();
    expect(checkbox.checked).toBe(false);
  });

  it("renders checked when checked=true", () => {
    render(
      React.createElement(RememberMeCheckbox, {
        checked: true,
        onChange: vi.fn(),
      })
    );

    const checkbox = screen.getByRole("checkbox", { name: "Angemeldet bleiben" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("calls onChange with true when checkbox is clicked while unchecked", () => {
    const onChange = vi.fn();
    render(
      React.createElement(RememberMeCheckbox, {
        checked: false,
        onChange,
      })
    );

    const checkbox = screen.getByRole("checkbox", { name: "Angemeldet bleiben" });
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when checkbox is clicked while checked", () => {
    const onChange = vi.fn();
    render(
      React.createElement(RememberMeCheckbox, {
        checked: true,
        onChange,
      })
    );

    const checkbox = screen.getByRole("checkbox", { name: "Angemeldet bleiben" });
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("displays the label text 'Angemeldet bleiben'", () => {
    render(
      React.createElement(RememberMeCheckbox, {
        checked: false,
        onChange: vi.fn(),
      })
    );

    expect(screen.getByText("Angemeldet bleiben")).toBeDefined();
  });
});
