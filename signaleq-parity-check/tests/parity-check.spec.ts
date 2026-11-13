import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { CallId } from '@deepseek-ai/dsh-llm'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as plugin from '../src/index.ts'
import { runPythonEngine, runExtractedBase } from '../src/engines.ts'
import { extractPhones, extractBaseFunction } from '../src/extract.ts'
import { TIERS } from '../src/fixtures.ts'
import { runParityCheck } from '../src/parity.ts'
import type { Config } from '../src/index.ts'

/**
 * The SignalEQ project root under test: the shipped build.py + both tool HTML files. Overridable
 * so the suite can run against a relocated checkout. The plugin project lives one level inside it.
 */
const SIGNALEQ_ROOT = process.env.SIGNALEQ_ROOT ?? fileURLToPath(new URL('../..', import.meta.url))

/** Full plugin config for the real project root (the schemastery defaults applied at load). */
const parityConfig = (projectRoot: string): Config => ({ projectRoot, pythonBin: 'python3', tolerance: 1e-9 })

const testToolSignal = new AbortController().signal

/** Scratch project roots created by the corruption tests, removed after each test. */
const scratchDirs: string[] = []
afterEach(() => {
  while (scratchDirs.length > 0) rmSync(scratchDirs.pop()!, { recursive: true, force: true })
})

/** Copy build.py + both tier HTML files into a scratch root (the parity check needs all three). */
function scratchProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'signaleq-parity-'))
  for (const file of ['build.py', 'flagships.html', 'index_budget_phones.html']) {
    copyFileSync(join(SIGNALEQ_ROOT, file), join(dir, file))
  }
  scratchDirs.push(dir)
  return dir
}

/** Mount the real plugin body on a real ToolRuntime (only the agent wrapper is absent). */
async function setup(projectRoot: string) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(plugin, parityConfig(projectRoot))
  return ctx
}

let callCounter = 0
function callParity(ctx: Context) {
  return ctx.tools.execute({
    signal: testToolSignal,
    callId: CallId(`parity-${++callCounter}`),
    name: 'signaleq_parity_check',
    arguments: {},
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

describe('signaleq-parity-check plugin', () => {
  it('registers a zero-argument `signaleq_parity_check` tool', async () => {
    const ctx = await setup(SIGNALEQ_ROOT)
    const schema = ctx.tools.schemas().find(s => s.name === 'signaleq_parity_check')
    expect(schema).toBeDefined()
    expect(schema!.parameters).toEqual({ type: 'object', properties: {} })
    expect(schema!.description).toContain('build.py')
  })

  it('returns a clean parity report against the real shipped files', async () => {
    const ctx = await setup(SIGNALEQ_ROOT)
    const result = await callParity(ctx)
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected parity success')

    const value = result.value as {
      pass: boolean
      checks: number
      failures: number
      tiers: { tier: string; engine: { python: string; js: string }; phones: { model: string; dataStatus: string; categories: { pass: boolean }[] }[] }[]
    }
    // 3 flagship phones × 7 categories + 3 budget phones × 8 categories.
    expect(value.checks).toBe(3 * 7 + 3 * 8)
    expect(value.failures).toBe(0)
    expect(value.pass).toBe(true)

    expect(value.tiers.map(t => t.tier)).toEqual(['flagship', 'budget'])
    expect(value.tiers[0]!.engine.python).toBe('build.py fs_score_*')
    expect(value.tiers[0]!.engine.js).toBe('flagships.html base()')
    expect(value.tiers[1]!.engine.python).toBe('build.py bg_score_*')
    expect(value.tiers[1]!.engine.js).toBe('index_budget_phones.html base()')
    for (const tier of value.tiers) {
      for (const phone of tier.phones) {
        expect(phone.dataStatus).toBe('match')
        expect(phone.categories.every(c => c.pass)).toBe(true)
      }
    }
    expect(text(result)).toContain('0 failed')
  })

  it('renders a DIVERGENCE summary naming the failing category with both actual numbers', async () => {
    const root = scratchProject()
    const htmlPath = join(root, 'flagships.html')
    const html = readFileSync(htmlPath, 'utf8')
    // The check exists to catch exactly this class of edit: one copy changed, the other not.
    writeFileSync(htmlPath, html.replace('((p.bat-6500)/1000)*20', '((p.bat-6500)/1000)*21'))

    const ctx = await setup(root)
    const result = await callParity(ctx)
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected parity success')

    const value = result.value as {
      pass: boolean
      failures: number
      tiers: { tier: string; phones: { model: string; categories: { category: string; python: number; js: number; pass: boolean }[] }[] }[]
    }
    expect(value.pass).toBe(false)
    // Only the two non-zero battery phones diverge (5088mAh floors at 0 in both engines).
    expect(value.failures).toBe(2)

    const flagship = value.tiers.find(t => t.tier === 'flagship')!
    const xiaomi = flagship.phones.find(p => p.model === 'Xiaomi 17 Ultra')!
    const bat = xiaomi.categories.find(c => c.category === 'bat')!
    expect(bat.python).toBeCloseTo(6, 9)
    expect(bat.js).toBeCloseTo(6.3, 9)
    expect(bat.pass).toBe(false)

    // The untouched budget tier must stay fully green.
    const budget = value.tiers.find(t => t.tier === 'budget')!
    expect(budget.phones.every(p => p.categories.every(c => c.pass))).toBe(true)

    expect(text(result)).toContain('DIVERGENCE')
    expect(text(result)).toContain('bat python=6 js=6.3')
  })

  it('flags drifted shipped specs while still passing the engine-vs-engine check', async () => {
    const root = scratchProject()
    const htmlPath = join(root, 'flagships.html')
    const html = readFileSync(htmlPath, 'utf8')
    // Ship a different battery than the fixed fixture carries: engines still agree on the
    // FIXED input, but the report must say the shipped copy no longer matches it.
    writeFileSync(htmlPath, html.replace('"bat": 5088,', '"bat": 5089,'))

    const result = await runParityCheck({ projectRoot: root })
    expect(result.pass).toBe(true)
    const iphone = result.tiers.find(t => t.tier === 'flagship')!.phones.find(p => p.model === 'iPhone 17 Pro Max')!
    expect(iphone.dataStatus).toBe('drifted')
  })
})

describe('engines (real subprocesses, real shipped files)', () => {
  it('runs build.py\'s flagship engine and matches hand-computed scores', () => {
    const byTier = runPythonEngine(SIGNALEQ_ROOT, TIERS, 'python3')
    const flagship = byTier.flagship!
    const xiaomi = flagship.find(r => r.model === 'Xiaomi 17 Ultra')!.scores
    expect(xiaomi.bat).toBeCloseTo(6, 9) // (6800-6500)/1000*20
    expect(xiaomi.chg).toBeCloseTo(5, 9) // 90W cliff
    expect(xiaomi.stor).toBeCloseTo(15, 9)
    expect(xiaomi.cam).toBeCloseTo(13.4, 9) // 96 → 13+((96-95)/5)*2
    expect(xiaomi.price).toBeCloseTo(3.015, 9) // 999 → 6-((999-800)/200)*3

    const iphone = flagship.find(r => r.model === 'iPhone 17 Pro Max')!.scores
    expect(iphone.bat).toBe(0) // 5088 < 6500 floor
    expect(iphone.chg).toBe(0) // 45W < 90W floor
    expect(iphone.os).toBe(25)
    expect(iphone.cam).toBe(13)
    expect(iphone.price).toBeCloseTo(3 * Math.exp(-0.002 * 199), 9)
  })

  it('runs build.py\'s budget engine with the perf category defaulting to 0', () => {
    const byTier = runPythonEngine(SIGNALEQ_ROOT, TIERS, 'python3')
    const honor = byTier.budget!.find(r => r.model === 'Honor GT')!.scores
    expect(honor.bat).toBe(0) // 5300 < 6000 floor
    expect(honor.chg).toBe(12) // 80W step
    expect(honor.price).toBeCloseTo(28 - (19 / 170) * 14, 9) // 399
    expect(honor.perf).toBe(0) // no perf column shipped
  })

  it('extracts and runs the inline flagship base() and matches the same hand-computed scores', () => {
    const html = readFileSync(join(SIGNALEQ_ROOT, 'flagships.html'), 'utf8')
    const source = extractBaseFunction(html)
    expect(source).toContain('function base(p) {')
    expect(source).toContain('p.bat-6500')
    expect(source.endsWith('}')).toBe(true)

    const results = runExtractedBase(html, TIERS[0]!.phones)
    const xiaomi = results.find(r => r.model === 'Xiaomi 17 Ultra')!.scores
    expect(xiaomi.bat).toBeCloseTo(6, 9)
    expect(xiaomi.chg).toBe(5)
    expect(xiaomi.cam).toBeCloseTo(13.4, 9)
    const iphone = results.find(r => r.model === 'iPhone 17 Pro Max')!.scores
    expect(iphone.bat).toBe(0)
    expect(iphone.price).toBeCloseTo(3 * Math.exp(-0.002 * 199), 9)
  })

  it('extracts the budget base() with all 8 categories', () => {
    const html = readFileSync(join(SIGNALEQ_ROOT, 'index_budget_phones.html'), 'utf8')
    const results = runExtractedBase(html, TIERS[1]!.phones)
    const ace = results.find(r => r.model === 'OnePlus Ace 6')!.scores
    expect(ace.chg).toBe(22) // 120W step
    expect(ace.bat).toBeCloseTo(20.36, 9) // 20+((7800-7500)/2500)*3
    expect(ace.disp).toBe(10) // 6.83
    expect(ace.perf).toBe(0)
    expect(Object.keys(ace).sort()).toEqual(['bat', 'cam', 'chg', 'disp', 'os', 'perf', 'price', 'stor'])
  })

  it('parses the shipped PHONES arrays (25 flagship, 20 budget)', () => {
    expect(extractPhones(readFileSync(join(SIGNALEQ_ROOT, 'flagships.html'), 'utf8'))).toHaveLength(25)
    expect(extractPhones(readFileSync(join(SIGNALEQ_ROOT, 'index_budget_phones.html'), 'utf8'))).toHaveLength(20)
  })

  it('throws a descriptive error when the inline base() copy is missing', () => {
    expect(() => extractBaseFunction('<html><script>const PHONES = [];</script></html>'))
      .toThrow(/function base\(p\) not found/)
  })
})

describe('plugin lifecycle', () => {
  it('unregisters the tool when its contributing fiber is disposed (HMR-safety)', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    const fiber = await ctx.plugin(plugin, parityConfig(SIGNALEQ_ROOT))
    expect(ctx.tools.schemas().some(s => s.name === 'signaleq_parity_check')).toBe(true)
    await fiber.dispose()
    expect(ctx.tools.schemas().some(s => s.name === 'signaleq_parity_check')).toBe(false)
  })

  it('fails loud at load when projectRoot is missing the scoring artifacts', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await expect(ctx.plugin(plugin, parityConfig(tmpdir()))).rejects.toThrow(/missing build\.py/)
  })

  it('has the namespace-plugin export shape (no stray default) so the Loader keeps name/inject/apply', () => {
    expect('default' in plugin).toBe(false)
    expect(plugin.name).toBe('signaleq-parity-check')
    expect(plugin.inject).toEqual(['tools'])
    expect(typeof plugin.apply).toBe('function')
    // Config is a validated Schemastery schema, not a plain object.
    expect(typeof plugin.Config).toBe('object')
  })
})
