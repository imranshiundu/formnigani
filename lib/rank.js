// Feed ranking, fng.txt §2. Explainable v1 formula — no black boxes.
// score = 3.0×live + 2.5×(starts in 2–6h) + 2.0×(squad joined — 0 until the
// social graph exists) + 1.8×(fill 60–90%) + 1.5×(posted <2h) + 1.2×heat +
// 1.0×vibeMatch + 0.8×proximity. Recency decay below the fold arrives with
// the backend ranking service.
export function scoreForm(f, vibes = []) {
  const going = Math.max(f.going || 0, 0);
  const heat = (f.hype || 0) / Math.max(going, 1);
  const fill = f.capacity ? going / f.capacity : 0;
  const startsIn = f.startsInH ?? 99;
  const postedH = f.postedH ?? 99;
  const vibeSet = new Set((vibes || []).map((v) => String(v).toLowerCase()));
  const vibeHit = (f.tags || []).some((t) => vibeSet.has(String(t).toLowerCase()));

  let score = 0;
  if (f.live) score += 3.0;
  if (startsIn >= 2 && startsIn <= 6) score += 2.5;
  if (fill >= 0.6 && fill <= 0.9) score += 1.8;
  if (postedH < 2) score += 1.5;
  score += 1.2 * Math.min(heat, 3);
  if (vibeSet.size > 0 && vibeHit) score += 1.0;
  score += 0.8 * Math.max(0, 1 - Number(f.km || 5) / 25);
  return Math.round(score * 100) / 100;
}

export function rankFeed(forms, vibes = []) {
  return [...forms]
    .map((f) => ({ f, score: scoreForm(f, vibes) }))
    .sort((a, b) => b.score - a.score || Number(b.f.live || false) - Number(a.f.live || false))
    .map(({ f }) => f);
}
