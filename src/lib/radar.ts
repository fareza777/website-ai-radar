interface RadarPoint {
  id: string;
  angle: number;
  radius: number;
}

export function nearestRadarSignal(signals: readonly RadarPoint[], x: number, y: number, width: number, height: number): string | null {
  if (width <= 0 || height <= 0) return null;

  let nearestId: string | null = null;
  let nearestDistance = 24;

  for (const signal of signals) {
    const angle = (signal.angle * Math.PI) / 180;
    const signalX = (0.5 + 0.5 * signal.radius * Math.sin(angle)) * width;
    const signalY = (0.5 - 0.5 * signal.radius * Math.cos(angle)) * height;
    const distance = Math.hypot(x - signalX, y - signalY);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = signal.id;
    }
  }

  return nearestId;
}
