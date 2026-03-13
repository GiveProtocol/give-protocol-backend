#!/usr/bin/env node

/**
 * Import IRS Exempt Organizations Business Master File (BMF) data
 * into the irs_organizations table.
 *
 * Downloads regional CSV extracts from the IRS, filters for 501(c)(3)
 * organizations (SUBSECTION = '03'), and upserts into Supabase.
 *
 * Usage:
 *   node scripts/import-irs-bmf.js
 *
 * Environment variables (or .env file in repo root):
 *   SUPABASE_URL          - Supabase project URL
 *   SUPABASE_SERVICE_KEY     - Service role key (required for writes)
 */

const { createClient } = require('@supabase/supabase-js');
const { createReadStream, createWriteStream, existsSync, unlinkSync } = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const { createInterface } = require('readline');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const IRS_REGIONAL_FILES = [
  'https://www.irs.gov/pub/irs-soi/eo1.csv', // Northeast
  'https://www.irs.gov/pub/irs-soi/eo2.csv', // Mid-Atlantic / Great Lakes
  'https://www.irs.gov/pub/irs-soi/eo3.csv', // Gulf / Pacific Coast
  'https://www.irs.gov/pub/irs-soi/eo4.csv', // International / Other
];

const BATCH_SIZE = 200; // rows per upsert call
const SUBSECTION_501C3 = '03';
const TEMP_DIR = path.join(__dirname, '..', '.irs-temp');

// CSV column indexes (0-based) — matches IRS BMF header order
const COL = {
  EIN: 0,
  NAME: 1,
  ICO: 2,
  STREET: 3,
  CITY: 4,
  STATE: 5,
  ZIP: 6,
  GROUP: 7,
  SUBSECTION: 8,
  AFFILIATION: 9,
  CLASSIFICATION: 10,
  RULING: 11,
  DEDUCTIBILITY: 12,
  FOUNDATION: 13,
  ACTIVITY: 14,
  ORGANIZATION: 15,
  STATUS: 16,
  // 17-25 not stored in our table
  NTEE_CD: 26,
  SORT_NAME: 27,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const fs = require('fs');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  return createClient(url, key, {
    db: { schema: 'public' },
    global: { headers: { 'x-connection-timeout': '60000' } },
  });
}

/**
 * Download a file to disk, returning the local path.
 */
async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const { mkdirSync } = require('fs');
  mkdirSync(path.dirname(destPath), { recursive: true });
  const fileStream = createWriteStream(destPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  return destPath;
}

/**
 * Parse a CSV line handling quoted fields.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Stream-parse a CSV file, filter for 501(c)(3), and yield row objects.
 */
async function* parse501c3Rows(filePath) {
  const rl = createInterface({
    input: createReadStream(filePath, 'utf8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue; // skip header row
    }
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    const subsection = (cols[COL.SUBSECTION] || '').replace(/^0*/, '');

    // Filter: only 501(c)(3)
    if (subsection !== '3') continue;

    const ein = (cols[COL.EIN] || '').trim();
    if (!ein) continue;

    yield {
      ein,
      name: cols[COL.NAME] || '',
      ico: cols[COL.ICO] || null,
      street: cols[COL.STREET] || null,
      city: cols[COL.CITY] || null,
      state: cols[COL.STATE] || null,
      zip: cols[COL.ZIP] || null,
      group_exemption: cols[COL.GROUP] || null,
      subsection: cols[COL.SUBSECTION] || null,
      affiliation: cols[COL.AFFILIATION] || null,
      classification: cols[COL.CLASSIFICATION] || null,
      ruling: cols[COL.RULING] || null,
      deductibility: cols[COL.DEDUCTIBILITY] || null,
      foundation: cols[COL.FOUNDATION] || null,
      activity: cols[COL.ACTIVITY] || null,
      organization: cols[COL.ORGANIZATION] || null,
      status: cols[COL.STATUS] || null,
      ntee_cd: cols[COL.NTEE_CD] || null,
      sort_name: cols[COL.SORT_NAME] || null,
    };
  }
}

/**
 * Upsert a batch of rows. Preserves is_on_platform and platform_charity_id
 * for existing records by omitting them from the update set.
 */
async function upsertBatch(supabase, rows, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase
      .from('irs_organizations')
      .upsert(rows, {
        onConflict: 'ein',
        ignoreDuplicates: false,
      });

    if (!error) return;

    if (attempt < retries && error.message.includes('timeout')) {
      const delay = attempt * 2000;
      console.warn(`\n  Timeout on attempt ${attempt}, retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    throw new Error(`Upsert failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();
  const supabase = getSupabaseClient();

  console.log('IRS BMF 501(c)(3) Import');
  console.log('========================\n');

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const url of IRS_REGIONAL_FILES) {
    const filename = path.basename(url);
    const localPath = path.join(TEMP_DIR, filename);

    // Download
    console.log(`Downloading ${filename}...`);
    await downloadFile(url, localPath);
    console.log(`  Downloaded.`);

    // Parse and upsert in batches
    let batch = [];
    let fileCount = 0;

    for await (const row of parse501c3Rows(localPath)) {
      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        await upsertBatch(supabase, batch);
        fileCount += batch.length;
        process.stdout.write(`  Upserted ${fileCount} rows...\r`);
        batch = [];
      }
    }

    // Flush remaining
    if (batch.length > 0) {
      await upsertBatch(supabase, batch);
      fileCount += batch.length;
    }

    totalInserted += fileCount;
    console.log(`  ${filename}: ${fileCount.toLocaleString()} 501(c)(3) orgs upserted`);

    // Clean up temp file
    try { unlinkSync(localPath); } catch {}
  }

  // Clean up temp dir
  try {
    const { rmdirSync } = require('fs');
    rmdirSync(TEMP_DIR);
  } catch {}

  console.log(`\nDone. ${totalInserted.toLocaleString()} total 501(c)(3) organizations upserted.`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
