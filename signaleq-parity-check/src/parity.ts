/**
 * Parity orchestration: run both engines over the fixed phone set and diff every category.
 * The result is a structured report — pass/fail per category per phone, with the actual numbers on
 * any mismatch — plus a data-drift note comparing each fixed phone against the shipped PHONES array.
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { runJsEngine, runPythonEngine } from './engines.ts'
import { extractPhones } from './extract.ts'
import { TIERS, type PhoneSpec } from './fixtures.ts'

/** Default comparison epsilon: tolerates float-representation noise, catches real divergence. */
export const DEFAULT_TOLERANCE = 1e-9

/** One category's two-engine result. A missing category on either side is itself a divergence. */
export interface CategoryCheck {
  category: string
  /** build.py engine's raw score; absent when the engine no longer computes this category. */
  python?: number
  /** inline HTML `base()` engine's raw score; absent when the inline copy no longer computes it. */
  js?: number
  pass: boolean
}

/** How the fixed fixture phone relates to the current shipped data. */
export type DataStatus = 'match' | 'drifted' | 'missing'

/** One fixed phone's full per-category diff. */
export interface PhoneCheck {
  model: string
  /** `match`: shipped PHONES has this exact spec · `drifted`: same model, changed specs · `missing`: not shipped. */
  dataStatus: DataStatus
  categories: CategoryCheck[]
}

/** One tier's diff block, naming which files the two engines ran. */
export interface TierCheck {
  tier: 'flagship' | 'budget'
  engine: {
    python: string
    js: string
  }
  phones: PhoneCheck[]
}

/** Canonical tool output: summary counts plus the full structured diff. */
export interface ParityResult {
  pass: boolean
  checks: number
  failures: number
  tiers: TierCheck[]
}

/** Options for {@link runParityCheck}. */
export interface ParityOptions {
  /** SignalEQ project root containing `build.py`, `flagships.html`, and `index_budget_phones.html`. */
  projectRoot: string
  /** Python interpreter for build.py's engine. */
  pythonBin?: string
  /** Per-category comparison epsilon. */
  tolerance?: number
  /** Caller-owned cancellation forwarded to both subprocesses. */
  signal?: AbortSignal
}

function sameSpec(a: PhoneSpec, b: PhoneSpec): boolean {
  return a.model === b.model
    && a.bat === b.bat
    && a.chg === b.chg
    && a.cam === b.cam
    && a.disp === b.disp
    && a.stor === b.stor
    && a.ram === b.ram
    && a.price === b.price
    && a.os === b.os
    && (a.perf ?? 0) === (b.perf ?? 0)
}

function dataStatusFor(phone: PhoneSpec, shipped: readonly PhoneSpec[]): DataStatus {
  if (shipped.some(s => sameSpec(s, phone))) return 'match'
  return shipped.some(s => s.model === phone.model) ? 'drifted' : 'missing'
}

function compareScores(
  python: Record<string, number>,
  js: Record<string, number>,
  categories: readonly string[],
  tolerance: number,
): CategoryCheck[] {
  return categories.map(category => {
    const py = python[category]
    const j = js[category]
    const pass = py !== undefined && j !== undefined && Math.abs(py - j) <= tolerance
    return {
      category,
      ...(py !== undefined ? { python: py } : {}),
      ...(j !== undefined ? { js: j } : {}),
      pass,
    }
  })
}

/**
 * Run the full parity check against a SignalEQ project root.
 * @param options - project root plus engine/tolerance overrides.
 * @returns the structured diff report (always resolves; engine failures throw as tool errors).
 */
export async function runParityCheck(options: ParityOptions): Promise<ParityResult> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE
  const pythonBin = options.pythonBin ?? 'python3'
  const pythonByTier = runPythonEngine(options.projectRoot, TIERS, pythonBin, options.signal)

  const tiers: TierCheck[] = []
  let checks = 0
  let failures = 0
  for (const tier of TIERS) {
    const jsScores = runJsEngine(options.projectRoot, tier, options.signal)
    const pythonScores = pythonByTier[tier.tier] ?? []
    const shipped = extractPhones(readFileSync(join(options.projectRoot, tier.htmlFile), 'utf8'))

    const phones = tier.phones.map(phone => {
      const python = pythonScores.find(r => r.model === phone.model)?.scores ?? {}
      const js = jsScores.find(r => r.model === phone.model)?.scores ?? {}
      const categories = compareScores(python, js, tier.categories, tolerance)
      checks += categories.length
      failures += categories.filter(c => !c.pass).length
      return { model: phone.model, dataStatus: dataStatusFor(phone, shipped), categories }
    })
    tiers.push({ tier: tier.tier, engine: { python: tier.pythonScorerLabel, js: tier.jsEngineLabel }, phones })
  }
  return { pass: failures === 0, checks, failures, tiers }
}

/** Model-facing prose for the diff report; failures carry both actual numbers. */
export function renderParityResult(value: ParityResult): string {
  const lines = [
    `SignalEQ scoring parity: ${value.checks} checks, ${value.failures} failed — ${value.pass ? 'engines agree' : 'DIVERGENCE'}.`,
  ]
  const num = (v: number | undefined): string | number => v === undefined ? 'missing' : +v.toFixed(4)
  for (const tier of value.tiers) {
    for (const phone of tier.phones) {
      const bad = phone.categories.filter(c => !c.pass)
      if (bad.length === 0) continue
      const detail = bad.map(c => `${c.category} python=${num(c.python)} js=${num(c.js)}`).join(', ')
      lines.push(`FAIL ${tier.tier}/${phone.model}: ${detail}`)
    }
  }
  return lines.join('\n')
}
