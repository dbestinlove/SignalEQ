/**
 * Fixed parity-check fixtures: tier layout and the representative phones each engine scores.
 *
 * The phones are a small, hand-picked set per tier (not a scan of the shipped data), so the check
 * covers deterministic inputs forever: editing the CSVs or regenerating the HTML changes what the
 * engines *would* produce but never which inputs the parity check exercises. The set spans the
 * scoring ranges — flagship includes one deal-broken phone (sub-floor battery AND charging), one
 * mid-pack sweet-spot phone, and one top-ranked phone; budget spans a sub-6000mAh battery (scores
 * 0), a 120W sweet-spot phone, and a high-price-taper phone.
 * @module
 */

/** A phone spec as both engines consume it (build.py `load_phones` / HTML `base(p)`). */
export interface PhoneSpec {
  model: string
  bat: number
  chg: number
  cam: number
  disp: number
  stor: number
  ram: number
  price: number
  os: 'global' | 'china'
  /** Budget-tier manual 1–10 performance rating; absent phones score 0 in both engines. */
  perf?: number
}

/** One tier's two scoring engines and the fixed phone set that exercises them. */
export interface TierConfig {
  tier: 'flagship' | 'budget'
  /** HTML file holding the inline `const PHONES` + `function base(p)` copy. */
  htmlFile: string
  /** build.py entry function this tier's engine routes through. */
  pythonScorer: 'flagship_base_scores' | 'budget_base_scores'
  /** Model-facing engine labels for the diff report. */
  pythonScorerLabel: string
  jsEngineLabel: string
  /** Canonical per-category order for this tier (build.py dict order == HTML return order). */
  categories: readonly string[]
  phones: readonly PhoneSpec[]
}

export const TIERS: readonly TierConfig[] = [
  {
    tier: 'flagship',
    htmlFile: 'flagships.html',
    pythonScorer: 'flagship_base_scores',
    pythonScorerLabel: 'build.py fs_score_*',
    jsEngineLabel: 'flagships.html base()',
    categories: ['os', 'bat', 'price', 'stor', 'chg', 'disp', 'cam'],
    phones: [
      {
        // Deal-broken: 5088mAh < 6500 floor AND 45W < 90W floor; maxed display/camera.
        model: 'iPhone 17 Pro Max',
        bat: 5088,
        chg: 45,
        cam: 95,
        disp: 6.9,
        stor: 256,
        ram: 12,
        price: 1199,
        os: 'global',
      },
      {
        // Mid-pack: sweet-spot battery, 90W cliff edge, 512GB, 6.9" display.
        model: 'Xiaomi 17 Ultra',
        bat: 6800,
        chg: 90,
        cam: 96,
        disp: 6.9,
        stor: 512,
        ram: 12,
        price: 999,
        os: 'china',
      },
      {
        // Top-ranked: max battery sweet spot, 120W, 1TB, global ROM.
        model: 'OnePlus 15',
        bat: 7300,
        chg: 120,
        cam: 92,
        disp: 6.78,
        stor: 1024,
        ram: 16,
        price: 889,
        os: 'global',
      },
    ],
  },
  {
    tier: 'budget',
    htmlFile: 'index_budget_phones.html',
    pythonScorer: 'budget_base_scores',
    pythonScorerLabel: 'build.py bg_score_*',
    jsEngineLabel: 'index_budget_phones.html base()',
    categories: ['os', 'bat', 'price', 'stor', 'chg', 'disp', 'cam', 'perf'],
    phones: [
      {
        // Low end: 5300mAh scores 0 battery, 6.7" display hits the 8-pt step.
        model: 'Honor GT',
        bat: 5300,
        chg: 80,
        cam: 75,
        disp: 6.7,
        stor: 256,
        ram: 12,
        price: 399,
        os: 'china',
      },
      {
        // Mid: 120W charging, above-sweet-spot battery (20.36 pts).
        model: 'OnePlus Ace 6',
        bat: 7800,
        chg: 120,
        cam: 77,
        disp: 6.83,
        stor: 256,
        ram: 12,
        price: 479,
        os: 'china',
      },
      {
        // Top-ish: steep price-taper zone (629 → 9.26 pts) and max display.
        model: 'Redmi K90 Pro Max',
        bat: 7560,
        chg: 100,
        cam: 82,
        disp: 6.9,
        stor: 256,
        ram: 12,
        price: 629,
        os: 'china',
      },
    ],
  },
]
