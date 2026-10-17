import { describe, expect, it } from "vitest";
import { nearestRadarSignal } from "@/lib/radar";

const nearby = [
  { id: "inner", angle: 90, radius: 0.4 },
  { id: "outer", angle: 90, radius: 0.5 },
];

describe("radar pointer selection", () => {
  it("selects the visible dot even when a later button overlaps it", () => {
    expect(nearestRadarSignal(nearby, 196, 140, 280, 280)).toBe("inner");
    expect(nearestRadarSignal([...nearby].reverse(), 196, 140, 280, 280)).toBe("inner");
  });

  it("selects the closest signal inside the larger touch area", () => {
    expect(nearestRadarSignal(nearby, 205, 143, 280, 280)).toBe("outer");
  });

  it("uses the actual canvas dimensions", () => {
    expect(nearestRadarSignal([{ id: "north", angle: 0, radius: 0.5 }], 100, 30, 200, 120)).toBe("north");
  });

  it("leaves the selection alone when a tap is far from every dot", () => {
    expect(nearestRadarSignal(nearby, 0, 0, 280, 280)).toBeNull();
  });

  it("handles an empty radar and a canvas without a size", () => {
    expect(nearestRadarSignal([], 140, 140, 280, 280)).toBeNull();
    expect(nearestRadarSignal(nearby, 0, 0, 0, 0)).toBeNull();
  });
});
