/**
 * scripts/sync-substack-subscribers-to-profiles.js
 *
 * Reads a Substack or Mailchimp subscribers CSV export and sets:
 * - profiles.is_substack_subscriber (true when email is in the export)
 * - profiles.newsletter_opted_in_at (date when CSV has an opt-in/signup date column)
 *
 * Matches profile email (case-insensitive). Profiles not in the export get
 * is_substack_subscriber=false and newsletter_opted_in_at=null.
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 * Requires: migrations 20250206150000 (is_substack_subscriber), 20250206160000 (newsletter_opted_in_at)
 *
 * Usage:
 *   node scripts/sync-substack-subscribers-to-profiles.js [path-to-export.csv]
 *
 * Supported CSVs:
 * - Substack: Dashboard > Subscribers > Export (Email column)
 * - Mailchimp: Audience > Export audience (Email Address, OPTIN_TIME or similar)
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  for (const name of ['.env', '.env.local']) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or .env.local');
  process.exit(1);
}

/** Parse a single CSV line respecting quoted fields ("...", "" = escaped quote). */
function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let value = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      fields.push(value);
    } else {
      let value = '';
      while (i < line.length && line[i] !== ',') {
        value += line[i];
        i++;
      }
      fields.push(value.trim());
      if (line[i] === ',') i++;
    }
  }
  return fields;
}

const EMAIL_COLUMN_NAMES = [
  'Email',
  'email',
  'Email Address',
  'EMAIL',
  'Subscriber email',
  'subscriber email',
  'Subscriber Email',
];

const OPTIN_DATE_COLUMN_NAMES = [
  'OPTIN_TIME',
  'Optin Time',
  'Timestamp',
  'Signup Date',
  'Date Subscribed',
  'Signed Up',
  'Date',
  'Subscribed At',
];

/** Parse a date string to YYYY-MM-DD or null. Handles ISO (2024-01-15), US (1/15/2024), and common timestamps. */
function parseDateToYMD(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  // ISO date or date part of ISO datetime
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // US format m/d/yyyy or mm/dd/yyyy
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Unix timestamp (seconds or ms)
  const num = Number(trimmed);
  if (!Number.isNaN(num)) {
    const ms = num < 1e12 ? num * 1000 : num;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  // Try Date parse for other formats
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Read CSV and return Map<normalizedEmail, { optedInAt: string | null }>.
 * optedInAt is YYYY-MM-DD when the CSV has an opt-in date column; otherwise null.
 */
function loadSubscribersFromCsv(csvPath) {
  const raw = readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return new Map();

  const headers = parseCsvLine(lines[0]);
  let emailIdx = -1;
  for (const name of EMAIL_COLUMN_NAMES) {
    emailIdx = headers.findIndex((h) => h.trim() === name);
    if (emailIdx >= 0) break;
  }
  if (emailIdx === -1) {
    throw new Error(
      `CSV must have an email column. Tried: ${EMAIL_COLUMN_NAMES.slice(0, 5).join(', ')}... Headers: ${headers.join(', ')}`
    );
  }

  let optinIdx = -1;
  for (const name of OPTIN_DATE_COLUMN_NAMES) {
    optinIdx = headers.findIndex((h) => h.trim() === name);
    if (optinIdx >= 0) break;
  }

  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const email = (fields[emailIdx] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    const optedInAt = optinIdx >= 0 ? parseDateToYMD(fields[optinIdx] || '') : null;
    // Keep earliest opt-in if duplicate emails
    if (
      !map.has(email) ||
      (optedInAt && (!map.get(email).optedInAt || optedInAt < map.get(email).optedInAt))
    ) {
      map.set(email, { optedInAt });
    }
  }
  return map;
}

async function main() {
  const csvPath = process.argv[2] || join(root, 'scripts', 'substack-subscribers-export.csv');
  if (!existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    console.error(
      'Usage: node scripts/sync-substack-subscribers-to-profiles.js [path-to-export.csv]'
    );
    console.error('Substack: Dashboard > Subscribers > Export');
    console.error('Mailchimp: Audience > Export audience');
    process.exit(1);
  }

  const subscriberData = loadSubscribersFromCsv(csvPath);
  console.log('Export: unique emails found:', subscriberData.size);
  const withDate = [...subscriberData.values()].filter((v) => v.optedInAt).length;
  if (withDate > 0) console.log('         with opt-in date:', withDate);
  console.log('');

  const supabase = createClient(url, serviceRoleKey);

  const { data: profiles, error: listError } = await supabase.from('profiles').select('id, email');

  if (listError) {
    console.error('Failed to list profiles:', listError.message);
    process.exit(1);
  }

  let setTrue = 0;
  let setFalse = 0;

  for (const profile of profiles) {
    const normalized = (profile.email || '').trim().toLowerCase();
    const data = normalized ? subscriberData.get(normalized) : null;
    const isSubscriber = !!data;
    const newsletter_opted_in_at = data?.optedInAt ?? null;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_substack_subscriber: isSubscriber,
        newsletter_opted_in_at: isSubscriber ? newsletter_opted_in_at : null,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('  Fail profile', profile.id, updateError.message);
      continue;
    }

    if (isSubscriber) {
      setTrue++;
      console.log(
        '  ',
        profile.email || profile.id,
        '-> subscriber',
        newsletter_opted_in_at ? `(opted in ${newsletter_opted_in_at})` : ''
      );
    } else {
      setFalse++;
    }
  }

  console.log('\nDone. Set is_substack_subscriber=true:', setTrue, '| false:', setFalse);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
