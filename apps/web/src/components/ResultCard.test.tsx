import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResultCard } from "./ResultCard";
import { PRICING_LABELS } from "../constants";

describe("ResultCard", () => {
  it("shows hint when no data", () => {
    render(<ResultCard data={null} />);
    expect(screen.getByText(/Run a plan/i)).toBeInTheDocument();
  });

  it("renders computed price, choice, plan and scenarios", () => {
    const data = {
      priceMilliExclVAT: 12100, // 12.1 € excl., 14.64 incl.
      bestChoice: "perMinute",
      plan: [
        {
          from: { lat: 50.0, lng: 4.0 },
          to: { lat: 50.1, lng: 4.1 },
          stopMinutes: 30,
          actionAfterLeg: "KEEP",
        },
      ],
      scenarios: { perMinute: 12100, perKilometer: 15000 },
      extraFees: [{ name: "Airport", amount: 2000 }],
    };

    render(<ResultCard data={data} />);

    // Price is split across two spans: "14.64 €" and "incl. VAT"
    const inclVat = screen.getByText(/incl\. VAT/i);
    const priceNumber = screen.getByText(/^14\.64/);
    expect(inclVat).toBeInTheDocument();
    expect(priceNumber).toBeInTheDocument();
    // Ensure both spans are inside the same price container
    expect(inclVat.closest("div")).toContainElement(priceNumber);

    // Best choice line
    const bestChoiceRow = screen.getByText(/Best choice/i).closest("div")!;
    expect(bestChoiceRow).toBeInTheDocument();
    expect(
      within(bestChoiceRow).getByText(new RegExp(PRICING_LABELS.perMinute, "i"))
    ).toBeInTheDocument();

    // Plan line
    expect(screen.getByText(/Stop: 30 min/i)).toBeInTheDocument();

    // Additional fees
    expect(screen.getByText(/Airport: 2\.00 € excl\. VAT/i)).toBeInTheDocument();
  });
});
