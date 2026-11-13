/**
 * Extraction of the inline scoring copy from a SignalEQ tool HTML file.
 *
 * Each tier's HTML carries two things the parity check needs: the `const PHONES = [...]` data array
 * (written by build.py, valid JSON) and the inline `function base(p)` that duplicates build.py's
 * per-tier engine. Both are extracted with minimal, format-owning parsers — no DOM, no full-JS
 * evaluation — so the extracted source can be compiled and run in a separate Node subprocess.
 * @module
 */

import type { PhoneSpec } from './fixtures.ts'

/** Parse the `const PHONES = [...];` data array (valid JSON — build.py writes it via json.dumps). */
export function extractPhones(html: string): PhoneSpec[] {
  const match = html.match(/const PHONES = (\[[\s\S]*?\]);/)
  const array = match?.[1]
  if (array === undefined) throw new Error('const PHONES array not found — is this a SignalEQ tool HTML file?')
  return JSON.parse(array) as PhoneSpec[]
}

/**
 * Extract the exact source of the inline `function base(p) { ... }` by brace matching.
 *
 * The closing brace is found by scanning depth, not by regex, so the function body may contain
 * nested braces (the return object literal) without ambiguity; the first depth-0 `}` terminates.
 * @param html - a SignalEQ tool HTML file's source.
 * @returns the function declaration source, exactly as written in the HTML.
 */
export function extractBaseFunction(html: string): string {
  const marker = 'function base(p) {'
  const start = html.indexOf(marker)
  if (start === -1) {
    throw new Error('inline `function base(p)` not found — the HTML scoring copy may have been removed or renamed')
  }
  let depth = 0
  let i = start + marker.length - 1 // index of the opening `{`
  for (; i < html.length; i++) {
    const ch = html[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) break
    }
  }
  if (depth !== 0) throw new Error('unbalanced braces in inline `function base(p)`')
  return html.slice(start, i + 1)
}
