/**
 * scripts/sync-membership-csv-to-profiles.js
 *
 * Reads a WooCommerce Memberships CSV export and sets profiles.is_member,
 * profiles.membership_source = 'wordpress', and profiles.membership_plans
 * (array of active plan names) based on active rows (membership_status=active, has_access=yes).
 *
 * Matches profiles by wp_user_id (column user_id in CSV).
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 * Requires: migrations 20250206110000 (membership_plans), 20250206120000 (member_since, membership_expiration) applied.
 *
 * Usage:
 *   node scripts/sync-membership-csv-to-profiles.js [path-to-memberships.csv]
 *
 * Example:
 *   node scripts/sync-membership-csv-to-profiles.js "/Users/jeremytai/Desktop/kandie_gang_user_memberships_8f5e768c018925e509739db5a0405f90_2026_02_05.csv"
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
      if (!(key in process.env)) process.env[key] = value;
    }
    break;
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

/** Parse CSV date/datetime string to ISO date (YYYY-MM-DD) or null. */
function parseDateOnly(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * From CSV rows, compute per user_id: has at least one active membership, plan names, member_since, membership_expiration.
 * For multiple active memberships: member_since = earliest start, membership_expiration = latest end.
 * Returns: Map<user_id, { isActive, planNames, member_since, membership_expiration }>
 */
function computeMembershipByUserId(csvPath) {
  const raw = readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return new Map();

  const headers = parseCsvLine(lines[0]);
  const userIdIdx = headers.indexOf('user_id');
  const planIdx = headers.indexOf('membership_plan');
  const statusIdx = headers.indexOf('membership_status');
  const accessIdx = headers.indexOf('has_access');
  const sinceIdx = headers.indexOf('member_since');
  const expIdx = headers.indexOf('membership_expiration');

  if (userIdIdx === -1 || statusIdx === -1 || accessIdx === -1) {
    throw new Error('CSV must have columns: user_id, membership_status, has_access');
  }

  // Detect column shift: export may have extra column so status/access are at +1
  let shift = 0;
  const firstFields = parseCsvLine(lines[1]);
  const atStatus = (firstFields[statusIdx] || '').toLowerCase().trim();
  if (atStatus !== 'active' && atStatus !== 'expired' && (firstFields[statusIdx + 1] || '').toLowerCase().trim() === 'active') {
    shift = 1;
  }
  const sIdx = statusIdx + shift;
  const aIdx = accessIdx + shift;
  const sinceColIdx = sinceIdx >= 0 ? sinceIdx + shift : -1;
  let expColIdx = expIdx >= 0 ? expIdx + shift : -1;
  // Some exports add an extra empty column between member_since and membership_expiration; expiration then at +1
  if (expColIdx >= 0 && !(firstFields[expColIdx] || '').trim() && parseDateOnly((firstFields[expColIdx + 1] || '').trim())) {
    expColIdx += 1;
  }
  const planNameIdx = planIdx >= 0 && (firstFields[planIdx] || '').trim() === '' && (firstFields[planIdx + 1] || '').trim() !== ''
    ? planIdx + 1
    : planIdx;

  const byUser = new Map(); // user_id -> { isActive, planNames: Set, earliestSince, latestExp }

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const user_id = parseInt(fields[userIdIdx], 10);
    if (Number.isNaN(user_id)) continue;
    const status = (fields[sIdx] || '').toLowerCase().trim();
    const has_access = (fields[aIdx] || '').toLowerCase().trim();
    const planName = (fields[planNameIdx] || '').trim();
    let sinceStr = sinceColIdx >= 0 ? (fields[sinceColIdx] || '').trim() : '';
    let expStr = expColIdx >= 0 ? (fields[expColIdx] || '').trim() : '';
    // Per-row fallback: if expiration column is empty but next column looks like a date, use it
    if (!expStr && expColIdx >= 0 && fields[expColIdx + 1] != null && parseDateOnly((fields[expColIdx + 1] || '').trim())) {
      expStr = (fields[expColIdx + 1] || '').trim();
    }

    const isActive = status === 'active' && (has_access === 'yes' || has_access === 'true');
    if (!byUser.has(user_id)) {
      byUser.set(user_id, { isActive: false, planNames: new Set(), earliestSince: null, latestExp: null });
    }
    const entry = byUser.get(user_id);
    if (isActive) {
      entry.isActive = true;
      if (planName) entry.planNames.add(planName);
      const since = parseDateOnly(sinceStr);
      const exp = parseDateOnly(expStr);
      if (since && (!entry.earliestSince || since < entry.earliestSince)) entry.earliestSince = since;
      if (exp && (!entry.latestExp || exp > entry.latestExp)) entry.latestExp = exp;
    }
  }

  const result = new Map();
  for (const [uid, entry] of byUser) {
    result.set(uid, {
      isActive: entry.isActive,
      planNames: [...entry.planNames].sort(),
      member_since: entry.earliestSince || null,
      membership_expiration: entry.latestExp || null,
    });
  }
  return result;
}

async function main() {
  const csvPath = process.argv[2] || join(root, 'scripts', 'kandie_gang_user_memberships.csv');
  if (!existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    console.error('Usage: node scripts/sync-membership-csv-to-profiles.js [path-to-memberships.csv]');
    process.exit(1);
  }

  const membershipByUser = computeMembershipByUserId(csvPath);
  const activeUserIds = [...membershipByUser].filter(([, v]) => v.isActive).map(([uid]) => uid);
  console.log('CSV: total user_ids with membership rows:', membershipByUser.size);
  console.log('     user_ids with at least one active membership:', activeUserIds.length, '\n');

  const supabase = createClient(url, serviceRoleKey);

  const { data: profiles, error: listError } = await supabase
    .from('profiles')
    .select('id, wp_user_id, email')
    .not('wp_user_id', 'is', null);

  if (listError) {
    console.error('Failed to list profiles:', listError.message);
    process.exit(1);
  }

  let updated = 0;
  let setMember = 0;
  let setNotMember = 0;

  for (const profile of profiles) {
    const wpUserId = profile.wp_user_id;
    const entry = membershipByUser.get(wpUserId);
    const hasActive = entry ? entry.isActive : false;
    const planNames = entry && entry.planNames.length ? entry.planNames : [];
    const member_since = hasActive && entry?.member_since ? entry.member_since : null;
    const membership_expiration = hasActive && entry?.membership_expiration ? entry.membership_expiration : null;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_member: hasActive,
        membership_source: 'wordpress',
        membership_plans: planNames,
        member_since,
        membership_expiration,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('  Fail profile', profile.id, updateError.message);
      continue;
    }

    if (hasActive) setMember++;
    else setNotMember++;
    updated++;
    const planStr = planNames.length ? ` [${planNames.join(', ')}]` : '';
    const dateStr = member_since || membership_expiration ? ` since=${member_since ?? '—'} exp=${membership_expiration ?? '—'}` : '';
    console.log('  wp_user_id', wpUserId, profile.email || '', '-> is_member:', hasActive, planStr, dateStr);
  }

  console.log('\nDone. Updated:', updated, '| Set is_member=true:', setMember, '| Set is_member=false:', setNotMember);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
