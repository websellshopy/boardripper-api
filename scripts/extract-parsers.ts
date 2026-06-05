/**
 * Script to extract parsers from BoardRipper repository.
 *
 * Usage:
 *   1. Clone BoardRipper: git clone https://github.com/AlexeyInwerp/BoardRipper.git /tmp/BoardRipper
 *   2. Run: npx tsx scripts/extract-parsers.ts
 *
 * This copies the parser files from BoardRipper's frontend into src/parsers/.
 * The parsers are AGPL-3.0 licensed.
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const BOARDRIPPER_REPO = process.env.BOARDRIPPER_REPO || '/tmp/BoardRipper'
const PARSERS_SOURCE = join(BOARDRIPPER_REPO, 'src', 'frontend', 'src', 'parsers')
const PARSERS_DEST = join(__dirname, '..', 'src', 'parsers')

if (!existsSync(PARSERS_SOURCE)) {
  console.error(`BoardRipper parsers not found at: ${PARSERS_SOURCE}`)
  console.error('Set BOARDRIPPER_REPO env var or clone to /tmp/BoardRipper')
  process.exit(1)
}

mkdirSync(PARSERS_DEST, { recursive: true })

// Copy all parser files
cpSync(PARSERS_SOURCE, PARSERS_DEST, { recursive: true })

console.log(`Extracted parsers from ${PARSERS_SOURCE} to ${PARSERS_DEST}`)
console.log('Note: These parsers are AGPL-3.0 licensed (from BoardRipper)')
