/** Bounded periodic harmonics keep the aperture empty, including at full volume. */
export function waveLoop(layer: number, time: number, energy: number, attention?: number): string {
  const level = Number.isFinite(energy) ? Math.max(0, Math.min(1, energy)) : 0;
  const phase = layer * .71;
  const points = Array.from({ length: 161 }, (_, i) => {
    const a = i / 160 * Math.PI * 2;
    const flow = time * (layer % 2 ? -.31 : .27);
    const wave = Math.sin(a * 3 + phase + flow) * (9 + level * 6)
      + Math.sin(a * 5 - phase * .6 - time * .43) * (3 + level * 3)
      + Math.sin(a * 2 + phase * .8 + time * .24) * 6;
    const directed = attention === undefined ? 0 : Math.pow((1 + Math.cos(a - attention)) / 2, 6) * 3;
    const radius = 137 + (layer % 6 - 2.5) * 2 + wave + directed + Math.sin(time * .8) * 2;
    return `${i ? 'L' : 'M'}${(180 + Math.cos(a) * radius).toFixed(2)},${(180 + Math.sin(a) * radius).toFixed(2)}`;
  });
  return points.join(' ') + 'Z';
}
