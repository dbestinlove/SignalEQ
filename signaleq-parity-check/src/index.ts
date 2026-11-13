/**
 * SignalEQ scoring-parity check plugin.
 *
 * Registers the `signaleq_parity_check` tool: it scores a fixed set of representative phones
 * (3 flagship, 3 budget) with BOTH scoring engines — build.py's `fs_score_*`/`bg_score_*` run via
 * a Python subprocess, and the inline `base()` copy extracted from `flagships.html` /
 * `index_budget_phones.html` compiled and run in a separate Node subprocess — and returns a
 * per-category pass/fail diff with the actual numbers on any mismatch. Backs the
 * signaleq-scoring-parity skill's requirement that the duplicated copies never silently diverge.
 * @module signaleq-parity-check
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { runParityCheck, renderParityResult, type ParityResult } from './parity.ts'

export const name = 'signaleq-parity-check'
export const inject = ['tools']

/** Deployment configuration for the parity-check consumer. */
export interface Config {
  /** SignalEQ project root containing `build.py`, `flagships.html`, and `index_budget_phones.html`. */
  projectRoot: string
  /** Python interpreter that runs build.py's scoring engine. */
  pythonBin: string
  /** Per-category comparison epsilon (float-noise tolerance, not a rounding slack). */
  tolerance: number
}

/** Schemastery configuration for the parity-check consumer. */
export const Config: Schema<Config> = Schema.object({
  projectRoot: Schema.string().required(),
  pythonBin: Schema.string().default('python3'),
  tolerance: Schema.number().default(1e-9),
})

const REQUIRED_FILES = ['build.py', 'flagships.html', 'index_budget_phones.html'] as const

/** Fail loud at load: a project root without all three scoring artifacts cannot be checked. */
function validateProjectRoot(projectRoot: string): void {
  const missing = REQUIRED_FILES.filter(file => !existsSync(join(projectRoot, file)))
  if (missing.length > 0) {
    throw new Error(
      `signaleq-parity-check: projectRoot ${JSON.stringify(projectRoot)} is missing ${missing.join(', ')}`
      + ' — point config.projectRoot at the SignalEQ project root',
    )
  }
}

/**
 * Register the `signaleq_parity_check` tool on `ctx.tools`.
 * @param ctx - registrant context carrying the tool registry.
 * @param config - deployment's SignalEQ root and engine overrides.
 */
export function apply(ctx: Context, config: Config): void {
  validateProjectRoot(config.projectRoot)

  ctx.tools.register(defineTool({
    name: 'signaleq_parity_check',
    description: 'Run SignalEQ\'s scoring-parity check: score a fixed set of representative phones (3 flagship, 3 budget) '
      + 'with both scoring engines — build.py\'s fs_score_*/bg_score_* (Python subprocess) and the inline base() copy in '
      + 'flagships.html / index_budget_phones.html (extracted and run in a separate Node subprocess) — and diff every '
      + 'category. Returns pass/fail per category per phone with the actual numbers on mismatch. Run before and after '
      + 'editing any fs_score_*/bg_score_* function or the inline base() copies.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pass: { type: 'boolean', required: true },
          checks: { type: 'integer', required: true },
          failures: { type: 'integer', required: true },
          tiers: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                tier: { type: 'string', required: true, enum: ['flagship', 'budget'] },
                engine: {
                  type: 'object',
                  additionalProperties: false,
                  required: true,
                  properties: {
                    python: { type: 'string', required: true },
                    js: { type: 'string', required: true },
                  },
                },
                phones: {
                  type: 'array',
                  required: true,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      model: { type: 'string', required: true },
                      dataStatus: { type: 'string', required: true, enum: ['match', 'drifted', 'missing'] },
                      categories: {
                        type: 'array',
                        required: true,
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            category: { type: 'string', required: true },
                            // Optional: a category missing from one engine is reported, not crashed on.
                            python: { type: 'number' },
                            js: { type: 'number' },
                            pass: { type: 'boolean', required: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      render: (_args, value: ParityResult) => [{ type: 'text', text: renderParityResult(value) }],
    },
    async execute(_args, exec) {
      return runParityCheck({
        projectRoot: config.projectRoot,
        pythonBin: config.pythonBin,
        tolerance: config.tolerance,
        signal: exec.signal,
      })
    },
    presentCall: () => ({ card: 'generic', title: 'SignalEQ scoring parity check', kind: 'other', rawInput: {} }),
  }))
}
