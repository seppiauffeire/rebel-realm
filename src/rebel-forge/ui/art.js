// 20 minimalist card illustrations, drawn in a 120 x 80 box from plain path data so the DOM card (SVG) and the PNG export (canvas)
// render the exact same thing. Each part is [kind, path]: 'g' = soft fill, 's' = outline stroke, 'f' = solid fill.
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const both = (d) => [['g', d], ['s', d]];

export const ART = [
  { name: 'Sun', parts: [['g', circ(60, 56, 24)], ['s', 'M36 56a24 24 0 0 1 48 0'], ['s', 'M8 62H112M60 10V20M26 28l7 7M94 28l-7 7M10 50h10M100 50h10']] },
  { name: 'Peaks', parts: [...both('M6 68L38 24L58 52L78 32L114 68Z'), ['s', 'M30 38L38 24L46 38M70 44L78 32L86 44']] },
  { name: 'Moon', parts: [['f', 'M76 12A30 30 0 1 0 76 68A24 24 0 1 1 76 12Z'], ['s', 'M96 18V30M90 24H102M24 18V24M21 21H27']] },
  { name: 'Blade', parts: [...both('M60 6L69 54H51Z'), ['s', 'M38 54H82M60 54V70'], ['f', circ(60, 74, 3.5)]] },
  { name: 'Shield', parts: [...both('M60 6L100 18V42C100 58 82 68 60 76C38 68 20 58 20 42V18Z'), ['s', 'M60 6V76M20 34H100']] },
  { name: 'Crown', parts: [...both('M20 58L14 22L40 40L60 14L80 40L106 22L100 58Z'), ['s', 'M20 68H100'], ['f', circ(60, 36, 3)]] },
  { name: 'Eye', parts: [['s', 'M6 40Q60 -6 114 40Q60 86 6 40Z'], ...both(circ(60, 40, 17)), ['f', circ(60, 40, 6)]] },
  { name: 'Flame', parts: [...both('M60 6C70 24 92 34 92 54C92 68 78 76 60 76C42 76 28 68 28 54C28 40 42 36 46 18C52 26 56 22 60 6Z'), ['s', 'M60 40C66 50 74 52 74 60C74 66 68 70 60 70C52 70 46 66 46 60C46 52 56 50 60 40Z']] },
  { name: 'Tide', parts: [['s', 'M8 22Q22 10 36 22T64 22T92 22T114 20M8 40Q22 28 36 40T64 40T92 40T114 38M8 58Q22 46 36 58T64 58T92 58T114 56']] },
  { name: 'Tower', parts: [...both('M42 74V28H78V74Z'), ['s', 'M36 28V16H46V22H54V16H66V22H74V16H84V28'], ['s', 'M54 74V58Q60 50 66 58V74']] },
  { name: 'Key', parts: [...both(circ(34, 40, 18)), ['s', 'M52 40H110M94 40V54M104 40V50'], ['f', circ(34, 40, 5)]] },
  { name: 'Star', parts: [...both('M60 6L71 31L98 34L78 52L84 76L60 63L36 76L42 52L22 34L49 31Z')] },
  { name: 'Compass', parts: [...both('M60 4L82 40L60 76L38 40Z'), ['s', 'M16 40H104'], ['f', circ(60, 40, 4)]] },
  { name: 'Bolt', parts: [...both('M70 4L28 46H56L48 76L94 30H64Z')] },
  { name: 'Pine', parts: [...both('M60 6L88 38H32Z'), ...both('M60 24L94 58H26Z'), ['s', 'M60 58V76']] },
  { name: 'Hourglass', parts: [['s', 'M34 8H86M34 72H86'], ...both('M40 8C40 34 60 36 60 40C60 44 40 46 40 72H80C80 46 60 44 60 40C60 36 80 34 80 8Z')] },
  { name: 'Target', parts: [['s', circ(60, 40, 33)], ['s', circ(60, 40, 21)], ['g', circ(60, 40, 9)], ['f', circ(60, 40, 3.5)], ['s', 'M60 -2V10M60 70V82M12 40H24M96 40H108']] },
  { name: 'Crystal', parts: [...both('M60 4L92 28L78 76H42L28 28Z'), ['s', 'M28 28H92M60 4L48 28L42 76M60 4L72 28L78 76']] },
  { name: 'Feather', parts: [...both('M98 6C62 10 28 34 20 74C58 72 90 46 98 6Z'), ['s', 'M20 74L74 28M56 52L40 50M68 40L52 36']] },
  { name: 'Orbit', parts: [['s', 'M12 52a52 17 -24 1 0 96 -24a52 17 -24 1 0 -96 24Z'], ...both(circ(60, 40, 15)), ['f', circ(98, 20, 4)]] },
];

// Same card name, same art. Also used by shared links, so a friend sees the card you made.
export function artIndex(name) {
  let h = 2166136261;
  for (const ch of String(name || '').trim().toLowerCase()) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % ART.length;
}
export const artFor = (name) => ART[artIndex(name)];

export function artSvg(art) {
  return `<svg class="rf-artsvg" viewBox="0 0 120 80" aria-hidden="true" focusable="false">${art.parts.map(([k, d]) => `<path class="a-${k}" d="${d}"/>`).join('')}</svg>`;
}

// Paints the art into a box on a canvas (used by the PNG export).
export function drawArt(ctx, art, x, y, w, h, color) {
  const s = Math.min(w / 120, h / 80) * 0.86;
  ctx.save();
  ctx.translate(x + (w - 120 * s) / 2, y + (h - 80 * s) / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [k, d] of art.parts) {
    const p = new Path2D(d);
    if (k === 'f') { ctx.fillStyle = color; ctx.fill(p); } else if (k === 'g') { ctx.globalAlpha = 0.22; ctx.fillStyle = color; ctx.fill(p); ctx.globalAlpha = 1; } else { ctx.lineWidth = 2.4; ctx.stroke(p); }
  }
  ctx.restore();
}
