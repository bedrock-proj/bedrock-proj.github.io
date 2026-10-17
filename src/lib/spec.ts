// Reads instruction encodings from a checkout of bedrock-proj/spec at build time.
// SPEC_DIR defaults to ./spec-src, which the deploy workflow checks out.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { parse } from 'yaml';

export interface Encoding {
  mnemonic: string;
  pattern: string;
  syntax: string;
}

const SPEC_DIR = resolve(process.env.SPEC_DIR ?? 'spec-src');

// One representative encoding for each instruction length.
const PREFERRED: Record<number, string> = {
  7: 'SYSCALL',
  14: 'ADD',
  18: 'LEA',
  26: 'CMPJcc',
  34: 'VFMADD',
  42: 'VFADD',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name === 'encodings.yaml' && path.includes('/definitions/')) out.push(path);
  }
  return out;
}

export function loadEncodings(): Encoding[] {
  const isa = join(SPEC_DIR, 'isa');
  if (!existsSync(isa)) {
    throw new Error(`Bedrock spec not found at ${SPEC_DIR}; set SPEC_DIR or check out bedrock-proj/spec there.`);
  }
  const encodings: Encoding[] = [];
  for (const file of walk(isa)) {
    const mnemonic = basename(dirname(file));
    const doc = parse(readFileSync(file, 'utf8')) as { encodings?: Record<string, { pattern: unknown; syntax: string }> };
    for (const enc of Object.values(doc.encodings ?? {})) {
      encodings.push({ mnemonic, pattern: String(enc.pattern), syntax: enc.syntax });
    }
  }
  return encodings;
}

// Opcode-space classes, keyed by the number of instruction-specific bits a pattern carries.
// See isa/encoding/documents/instruction/topics/instruction_word_formats.
const CLASSES: Record<number, { name: string; bytes: number }> = {
  7: { name: 'extrashort', bytes: 1 },
  14: { name: 'short', bytes: 2 },
  18: { name: 'medium', bytes: 3 },
  26: { name: 'long', bytes: 4 },
  34: { name: 'extralong', bytes: 5 },
  42: { name: 'xxlong', bytes: 6 },
};

export function lengthSummary(encodings: Encoding[]) {
  const byLength = new Map<number, Encoding[]>();
  for (const enc of encodings) {
    const list = byLength.get(enc.pattern.length) ?? [];
    list.push(enc);
    byLength.set(enc.pattern.length, list);
  }
  return [...byLength.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bits, list]) => ({
      bits,
      cls: CLASSES[bits] ?? { name: `${bits}-bit`, bytes: Math.ceil(bits / 8) },
      count: list.length,
      example: list.find((e) => e.mnemonic === PREFERRED[bits]) ?? list[0],
    }));
}

export function instructionCount(encodings: Encoding[]) {
  return new Set(encodings.map((e) => e.mnemonic)).size;
}
