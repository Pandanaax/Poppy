import { render, screen, fireEvent, waitFor, within  } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlannerForm } from "./PlannerForm";

// --- Mock shared lib (no network)
vi.mock("@poppy/shared", () => {
  const vehicles = [
    { id: "v1", tier: "M", lat: 50.0, lng: 4.0 },
    { id: "v2", tier: "M", lat: 50.01, lng: 4.01 },
  ];
  const pricingM = {
    perMinute: {
      minutePrice: 200, // 0.20 €/min excl (milli-eur)
      kilometerPrice: 0,
      pauseUnitPrice: 50,
      bookUnitPrice: 30,
      unlockFee: 500,
      includedKilometers: 0,
    },
    perKilometer: {
      minutePrice: 0,
      kilometerPrice: 400, // 0.40 €/km excl
      pauseUnitPrice: 50,
      bookUnitPrice: 30,
      unlockFee: 500,
      includedKilometers: 10,
    },
    additionalFees: { fees: [{ name: "Airport", amount: 2000 }] },
  };

  return {
    // types don’t matter in tests
    crowFlyProvider: {
      driveMinutes: async () => 10,
      walkMinutes: async () => 5,
    },
    fetchVehicles: async () => vehicles,
    fetchParkingTester: async () => () => true,
    fetchPricingForTier: async (_t: "S" | "M" | "L") => pricingM,
    estimateJourney: async () => ({
      bestChoice: "perMinute",
      priceMilliExclVAT: 12345,
      plan: [
        {
          from: { lat: 50, lng: 4 },
          to: { lat: 50.1, lng: 4.1 },
          stopMinutes: 0,
          actionAfterLeg: "KEEP" as const,
        },
      ],
      scenarios: { perMinute: 12345, perKilometer: 15000 },
    }),
  };
});

describe("PlannerForm", () => {
  it("runs a plan and shows a result", async () => {
    render(<PlannerForm />);

    // Click the button
    fireEvent.click(screen.getByRole("button", { name: /Plan journey/i }));

    // Wait for the computed price to appear in ResultCard.
    // The price is split into two spans: "<number> €" and "incl. VAT".
    await waitFor(() => {
      const inclVat = screen.getByText(/incl\. VAT/i);
      expect(inclVat).toBeInTheDocument();

      const priceContainer = inclVat.closest("div");
      expect(priceContainer).toBeTruthy();

      // Ensure the numeric "€" part is present in the same container
      expect(within(priceContainer!).getByText(/\d+\.\d{2}\s*€/)).toBeInTheDocument();
    });

    // Best choice label present
    expect(screen.getByText(/Best choice/i)).toBeInTheDocument();
  });
});
