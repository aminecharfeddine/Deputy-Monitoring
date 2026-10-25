export interface Seat {
  x: number;
  y: number;
  angle: number;
  row: number;
}

/**
 * Répartit n sièges sur des rangées concentriques en demi-cercle,
 * puis les trie de gauche à droite (angle décroissant) pour que chaque
 * groupe forme un secteur. Coordonnées unitaires : rayon extérieur = 1.
 */
export function layoutSeats(n: number): { seats: Seat[]; dot: number } {
  if (n <= 0) return { seats: [], dot: 0.02 };
  const rows = Math.max(4, Math.round(Math.sqrt(n * 0.32)));
  const r0 = 0.36;
  const radii = Array.from({ length: rows }, (_, i) => r0 + (i * (1 - r0)) / (rows - 1));
  const total = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.floor((n * r) / total));
  let rest = n - counts.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; rest > 0; i = (i - 1 + rows) % rows, rest--) counts[i]++;

  const seats: Seat[] = [];
  radii.forEach((r, row) => {
    const c = counts[row];
    for (let k = 0; k < c; k++) {
      const angle = c === 1 ? Math.PI / 2 : Math.PI - (k * Math.PI) / (c - 1);
      seats.push({ x: r * Math.cos(angle), y: -r * Math.sin(angle), angle, row });
    }
  });
  seats.sort((a, b) => b.angle - a.angle || a.row - b.row);

  const rowGap = (1 - r0) / (rows - 1);
  const arcGap = (Math.PI * total) / n;
  return { seats, dot: Math.min(rowGap, arcGap) * 0.42 };
}
