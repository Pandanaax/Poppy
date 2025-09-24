import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StageRow } from "./StageRow";
import type { Leg as Stage } from "@poppy/shared";

const baseStage: Stage = {
  from: { lat: 50.0, lng: 4.0 },
  to: { lat: 50.1, lng: 4.1 },
  stopMinutes: 0,
};

describe("StageRow", () => {
  it("calls onChange when fields change", () => {
    const onChange = vi.fn();
    render(
      <StageRow stage={baseStage} index={0} onChange={onChange} onRemove={() => {}} />
    );

    const fromLat = screen.getByLabelText(/From lat/i) as HTMLInputElement;
    fireEvent.change(fromLat, { target: { value: "51.234" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("updates stop minutes via manual input", () => {
    const onChange = vi.fn();
    render(
      <StageRow stage={baseStage} index={0} onChange={onChange} onRemove={() => {}} />
    );
    const stop = screen.getByLabelText(/Stop minutes/i) as HTMLInputElement;
    fireEvent.change(stop, { target: { value: "45" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ stopMinutes: 45 })
    );
  });
});
