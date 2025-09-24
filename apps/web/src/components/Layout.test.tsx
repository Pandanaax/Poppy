import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Layout } from "./Layout";

// Minimal footer/header doubles (optional): if your real Header/Footer render text, assert that instead.
vi.mock("./Header", () => ({ Header: () => <div data-testid="hdr">Header</div> }));
vi.mock("./Footer", () => ({ Footer: () => <div data-testid="ftr">Footer</div> }));

describe("Layout", () => {
  it("renders header, children, and footer", () => {
    render(
      <Layout>
        <div>ChildContent</div>
      </Layout>
    );
    expect(screen.getByTestId("hdr")).toBeInTheDocument();
    expect(screen.getByText("ChildContent")).toBeInTheDocument();
    expect(screen.getByTestId("ftr")).toBeInTheDocument();
  });
});
