import { ItemReport, MatchSuggestion, MatchFactor } from '../types';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from',
  'is', 'was', 'my', 'near', 'some', 'has', 'have', 'had', 'found', 'lost', 'item', 'inside'
]);

function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function evaluateMatch(lostItem: ItemReport, foundItem: ItemReport): MatchSuggestion {
  const factors: MatchFactor[] = [];
  const reasons: string[] = [];
  let totalScore = 0;

  // 1. Category Matching (Max 30)
  const categoryMatched = lostItem.category === foundItem.category;
  if (categoryMatched) {
    totalScore += 30;
    factors.push({
      label: 'Category Match',
      matched: true,
      weight: 30,
      detail: `Both categorized under "${lostItem.category}"`
    });
    reasons.push(`Identical category: ${lostItem.category}`);
  } else {
    factors.push({
      label: 'Category Mismatch',
      matched: false,
      weight: 0,
      detail: `Lost as "${lostItem.category}", found as "${foundItem.category}"`
    });
  }

  // 2. Color Matching (Max 20)
  const colorMatched = lostItem.color === foundItem.color;
  if (colorMatched) {
    totalScore += 20;
    factors.push({
      label: 'Color Match',
      matched: true,
      weight: 20,
      detail: `Both match color "${lostItem.color}"`
    });
    reasons.push(`Color match: ${lostItem.color}`);
  } else if (lostItem.color === 'Multi-color' || foundItem.color === 'Multi-color') {
    totalScore += 10;
    factors.push({
      label: 'Partial Color Match',
      matched: true,
      weight: 10,
      detail: `One item is tagged as Multi-color`
    });
    reasons.push(`Partial color compatibility`);
  } else {
    factors.push({
      label: 'Color Difference',
      matched: false,
      weight: 0,
      detail: `Reported as ${lostItem.color} vs ${foundItem.color}`
    });
  }

  // 3. Location Matching (Max 20)
  const exactLocation = lostItem.locationBlock === foundItem.locationBlock;
  if (exactLocation) {
    totalScore += 20;
    factors.push({
      label: 'Location Block Match',
      matched: true,
      weight: 20,
      detail: `Exact campus zone: ${lostItem.locationBlock}`
    });
    reasons.push(`Same campus location: ${lostItem.locationBlock}`);
  } else {
    // Check zone similarity (e.g. both in Central Library or both in Academic Blocks)
    const getZone = (loc: string) => {
      if (loc.includes('Library')) return 'Library';
      if (loc.includes('Academic Block') || loc.includes('Block B')) return 'Academic';
      if (loc.includes('Hostel')) return 'Hostel';
      if (loc.includes('Food Court') || loc.includes('Canteen')) return 'Dining';
      if (loc.includes('Sports') || loc.includes('Ground')) return 'Sports';
      return 'Other';
    };
    const zoneA = getZone(lostItem.locationBlock);
    const zoneB = getZone(foundItem.locationBlock);
    if (zoneA !== 'Other' && zoneA === zoneB) {
      totalScore += 10;
      factors.push({
        label: 'Zone Proximity',
        matched: true,
        weight: 10,
        detail: `Nearby zone: ${zoneA} area on campus`
      });
      reasons.push(`Nearby campus area (${zoneA} precinct)`);
    } else {
      factors.push({
        label: 'Location Difference',
        matched: false,
        weight: 0,
        detail: `Reported at different campus locations`
      });
    }
  }

  // 4. Date/Time Proximity (Max 15)
  const lostTime = new Date(lostItem.dateTime).getTime();
  const foundTime = new Date(foundItem.dateTime).getTime();
  const diffHours = (foundTime - lostTime) / (1000 * 60 * 60);

  if (diffHours >= -6 && diffHours <= 24) {
    totalScore += 15;
    factors.push({
      label: 'Immediate Time Match',
      matched: true,
      weight: 15,
      detail: 'Found within 24 hours of lost timestamp'
    });
    reasons.push('Discovered within 24 hours of being reported lost');
  } else if (diffHours > 24 && diffHours <= 72) {
    totalScore += 10;
    factors.push({
      label: 'Close Time Window',
      matched: true,
      weight: 10,
      detail: 'Found within 3 days of lost report'
    });
    reasons.push('Discovered within 3 days');
  } else if (diffHours > 72 && diffHours <= 168) {
    totalScore += 5;
    factors.push({
      label: 'Within 7 Days',
      matched: true,
      weight: 5,
      detail: 'Found within a week of report'
    });
  } else if (diffHours < -6) {
    // Found well before it was reported lost — penalty
    totalScore = Math.max(0, totalScore - 10);
    factors.push({
      label: 'Temporal Anomaly',
      matched: false,
      weight: 0,
      detail: 'Found timestamp is significantly before reported lost time'
    });
  }

  // 5. Keyword, Brand, and Description Similarity (Max 15)
  const tokensA = tokenize(`${lostItem.title} ${lostItem.brandOrModel || ''} ${lostItem.description} ${lostItem.identifyingMark || ''}`);
  const tokensB = tokenize(`${foundItem.title} ${foundItem.brandOrModel || ''} ${foundItem.description}`);
  const tokenSim = calculateJaccardSimilarity(tokensA, tokensB);

  // Check specific brand matching
  let brandBonus = 0;
  if (lostItem.brandOrModel && foundItem.brandOrModel) {
    const brandA = lostItem.brandOrModel.toLowerCase();
    const brandB = foundItem.brandOrModel.toLowerCase();
    if (brandA.includes(brandB) || brandB.includes(brandA)) {
      brandBonus = 6;
      reasons.push(`Brand match: ${lostItem.brandOrModel}`);
    }
  }

  const textPoints = Math.min(15, Math.round(tokenSim * 18) + brandBonus);
  totalScore += textPoints;

  if (textPoints >= 6) {
    factors.push({
      label: 'Keyword & Model Similarity',
      matched: true,
      weight: textPoints,
      detail: `Significant text/attribute overlap between reports`
    });
    if (!reasons.some(r => r.includes('Brand'))) {
      reasons.push('High similarity in item title & description details');
    }
  }

  const normalizedScore = Math.min(100, Math.max(0, totalScore));

  return {
    targetItem: lostItem,
    candidateItem: foundItem,
    matchScore: normalizedScore,
    factors,
    reasons,
  };
}

export function findMatchesForItem(
  targetItem: ItemReport,
  allItems: ItemReport[],
  minScore = 45
): MatchSuggestion[] {
  const isTargetLost = targetItem.type === 'lost';
  const candidateType = isTargetLost ? 'found' : 'lost';

  const candidates = allItems.filter(item => 
    item.id !== targetItem.id && 
    item.type === candidateType &&
    item.status !== 'returned'
  );

  const results: MatchSuggestion[] = [];

  for (const candidate of candidates) {
    const lostItem = isTargetLost ? targetItem : candidate;
    const foundItem = isTargetLost ? candidate : targetItem;

    const match = evaluateMatch(lostItem, foundItem);
    if (match.matchScore >= minScore) {
      // Re-map target vs candidate so targetItem is always targetItem
      results.push({
        ...match,
        targetItem: targetItem,
        candidateItem: candidate,
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
