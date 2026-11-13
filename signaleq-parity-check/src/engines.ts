/**
 * The two scoring engines, each run as its own subprocess so the parity check exercises the
 * shipping artifacts independently: build.py's Python engine through the project's own interpreter,
 * and the inline `base()` copy extracted from the tier HTML, compiled and executed by a separate
 * Node process. A divergence therefore cannot be masked by this plugin's own compilation.
 * @module
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PhoneSpec, TierConfig } from './fixtures.ts'
import { extractBaseFunction } from './extract.ts'

/** One phone's per-category base scores, keyed by category. */
export type BaseScores = Record<string, number>

/** The two engines' output for one phone, addressed by the fixed fixture's model name. */
export interface PhoneScores {
  model: string
  scores: BaseScores
}

const SUBPROCESS_TIMEOUT_MS = 30_000
const SUBPROCESS_MAX_BUFFER = 10 * 1024 * 1024

/** Absolute path to the bundled Python scoring script (source-run layout: `src/` → `python/`). */
const SCORE_SCRIPT = fileURLToPath(new URL('../python/score.py', import.meta.url))

/** Node runner that compiles the extracted `base` declaration and scores stdin-supplied phones. */
const JS_RUNNER = `
const fs = require('node:fs');
const src = decodeURIComponent(process.argv[1]);
const phones = JSON.parse(fs.readFileSync(0, 'utf8'));
const base = new Function(src + '\\nreturn base;')();
const out = phones.map((p) => ({ model: p.model, scores: base(p) }));
process.stdout.write(JSON.stringify(out));
`

function fail(engine: string, result: { status: number | null; stderr: string; error?: Error }): never {
  if (result.error) throw result.error
  throw new Error(`${engine} failed (exit ${result.status}): ${result.stderr.trim() || 'no stderr'}`)
}

/**
 * Run build.py's per-tier scorer for every fixed phone, as one Python subprocess.
 * @param projectRoot - SignalEQ project root containing `build.py` and the tier HTML files.
 * @param tiers - tiers to score, in order.
 * @param pythonBin - interpreter to run the bundled script with.
 * @param signal - caller-owned cancellation forwarded to the subprocess.
 * @returns per-tier phone scores keyed by tier name.
 */
export function runPythonEngine(
  projectRoot: string,
  tiers: readonly TierConfig[],
  pythonBin: string,
  signal?: AbortSignal,
): Record<string, PhoneScores[]> {
  const tierNames = tiers.map(t => t.tier).join(',')
  const input = Object.fromEntries(tiers.map(t => [t.tier, t.phones]))
  const result = spawnSync(pythonBin, [SCORE_SCRIPT, projectRoot, tierNames], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    maxBuffer: SUBPROCESS_MAX_BUFFER,
    timeout: SUBPROCESS_TIMEOUT_MS,
    signal,
  })
  if (result.status !== 0 || result.error) fail(`python engine (${pythonBin})`, result)
  return JSON.parse(result.stdout) as Record<string, PhoneScores[]>
}

/**
 * Extract the tier's inline `base()` from its HTML and run it in a separate Node subprocess.
 * @param projectRoot - SignalEQ project root containing the tier's HTML file.
 * @param tier - the tier whose inline copy is checked.
 * @param signal - caller-owned cancellation forwarded to the subprocess.
 * @returns the fixed phones' base scores exactly as the inline copy computes them.
 */
export function runJsEngine(
  projectRoot: string,
  tier: TierConfig,
  signal?: AbortSignal,
): PhoneScores[] {
  const html = readFileSync(join(projectRoot, tier.htmlFile), 'utf8')
  const baseSource = extractBaseFunction(html)
  const result = spawnSync(process.execPath, ['-e', JS_RUNNER, encodeURIComponent(baseSource)], {
    input: JSON.stringify(tier.phones),
    encoding: 'utf8',
    maxBuffer: SUBPROCESS_MAX_BUFFER,
    timeout: SUBPROCESS_TIMEOUT_MS,
    signal,
  })
  if (result.status !== 0 || result.error) fail(`js engine (node ${tier.jsEngineLabel})`, result)
  return JSON.parse(result.stdout) as PhoneScores[]
}

/** Convenience for tests: run the JS engine against a raw HTML string without a project root. */
export function runExtractedBase(
  html: string,
  phones: readonly PhoneSpec[],
  signal?: AbortSignal,
): PhoneScores[] {
  const baseSource = extractBaseFunction(html)
  const result = spawnSync(process.execPath, ['-e', JS_RUNNER, encodeURIComponent(baseSource)], {
    input: JSON.stringify(phones),
    encoding: 'utf8',
    maxBuffer: SUBPROCESS_MAX_BUFFER,
    timeout: SUBPROCESS_TIMEOUT_MS,
    signal,
  })
  if (result.status !== 0 || result.error) fail('js engine (extracted base)', result)
  return JSON.parse(result.stdout) as PhoneScores[]
}
