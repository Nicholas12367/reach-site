// One-shot geocoder. Hits Nominatim with backoff, saves progress incrementally
// to assets/screen-locations.js so a re-run picks up where the last left off.
//
// Usage:  node scripts/geocode-locations.js [--reset]
//
// Re-run only when addresses change. The site never calls this at runtime.

const fs = require('fs');
const path = require('path');

const SOURCE = [
  { id: 1,  name: "Katchai Cafe",                   address: "C-5730 44 Street, Lloydminster, AB T9V 0B6" },
  { id: 2,  name: "CL Therapy",                     address: "4161 70 Avenue, Lloydminster, AB T9V 3L9" },
  { id: 3,  name: "Cuts by Jord",                   address: "5710 44 Street, Lloydminster, AB T9V 0B6" },
  { id: 4,  name: "Superior Water",                 address: "4305B 57 Avenue, Lloydminster, AB T9V 1Y4" },
  { id: 5,  name: "Mr. Sparkles",                   address: "6201 43 Street, Lloydminster, AB T9V 2W9" },
  { id: 6,  name: "3 Guys Truck Wash",              address: "4807 40 Avenue, Lloydminster, SK S9V 1Y8" },
  { id: 7,  name: "Truck Zone",                     address: "5205 65 Street, Lloydminster, AB T9V 2E8" },
  { id: 8,  name: "Alicia's Apothecary",            address: "101-1724 50 Avenue, Lloydminster, AB T9V 0Y1" },
  { id: 9,  name: "Fountain Tire",                  address: "5110 63 Avenue, Lloydminster, AB T9V 2E6" },
  { id: 10, name: "Neighbours Pub",                 address: "3-5601 31 Street, Lloydminster, AB T9V 2H3" },
  { id: 11, name: "Supplement King",                address: "105-4100 70 Avenue, Lloydminster, AB T9V 2X3" },
  { id: 12, name: "In2Golf",                        address: "6202 48 Street, Lloydminster, AB T9V 2G1" },
  { id: 13, name: "Sunrise Pharmacy",               address: "102-5001 18 Street, Lloydminster, AB T9V 2G7" },
  { id: 14, name: "Marc'd Up Tattoos",              address: "12-1804 50 Avenue, Lloydminster, AB T9V 2W7" },
  { id: 15, name: "Nouveau Lasers",                 address: "1429B 50 Avenue, Lloydminster, SK S9V 2K1" },
  { id: 16, name: "Aveiro Sleep",                   address: "101-5101 48 Street, Lloydminster, AB T9V 0H9" },
  { id: 17, name: "Station Auto",                   address: "5013 49 Avenue, Lloydminster, SK S9V 0T8" },
  { id: 18, name: "Border City Dental",             address: "4804 50 Street, Lloydminster, SK S9V 0M9" },
  { id: 19, name: "Diamond Auto",                   address: "4634 44 Street, Lloydminster, SK S9V 0G4" },
  { id: 20, name: "Lloyd Hi-Quality Auto",          address: "2709 50 Avenue, Lloydminster, SK S9V 2K1" },
  { id: 21, name: "Sage and Soul",                  address: "1-2801 50 Avenue, Lloydminster, SK S9V 2A8" },
  { id: 22, name: "The Sticks",                     address: "5704 44 Street, Lloydminster, AB T9V 0B6" },
  { id: 23, name: "Imagine Laser Works",            address: "106-5101 48 Street, Lloydminster, AB T9V 2G5" },
  { id: 24, name: "Superior Water (Coin-Op)",       address: "3245 50 Avenue, Lloydminster, SK S9V 0N8" },
  { id: 25, name: "Hotsul's Ukrainian Cuisine",     address: "3314 50 Avenue, Lloydminster, AB T9V 0R6" },
  { id: 26, name: "Tasty K's",                      address: "5008A 39 Street, Lloydminster, AB T9V 2Y8" },
  { id: 27, name: "Viking Strength",                address: "4203 70 Avenue, Lloydminster, AB T9V 3L9" },
  { id: 28, name: "Cheers Live",                    address: "5501 44 Street, Lloydminster, AB T9V 2H4" },
  { id: 29, name: "Kat Salon",                      address: "5019 50 Street, Lloydminster, AB T9V 0L9" },
  { id: 30, name: "Astec Safety",                   address: "6206 44 Street, Lloydminster, AB T9V 1V9" },
  { id: 31, name: "Lloydminster Honda",             address: "1904 50 Avenue, Lloydminster, AB T9V 2W7" },
  { id: 32, name: "Wilson Registries",              address: "2-1202 50 Avenue, Lloydminster, AB T9V 0Y1" },
  { id: 33, name: "World Class Training and Nutrition", address: "6601 43 Street, Lloydminster, AB T9V 3E8" }
];

const CITY_FALLBACK = { lng: -110.0050, lat: 53.2783 };
const OUT_FILE = path.join(__dirname, '..', 'assets', 'screen-locations.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function variants(address) {
  const out = [address];
  const stripped = address.replace(/^[A-Za-z0-9]+-(\d)/, '$1');
  if (stripped !== address) out.push(stripped);
  const noPostal = address.replace(/\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d\s*$/, '');
  if (noPostal !== address) out.push(noPostal);
  const both = stripped.replace(/\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d\s*$/, '');
  if (both !== stripped && both !== noPostal) out.push(both);
  return out;
}

// Try Photon (komoot's open geocoder) first — more lenient rate limits.
// Fall back to Nominatim if Photon returns nothing.
async function geocode(query) {
  // Photon — bias around Lloydminster center
  const photonUrl = `https://photon.komoot.io/api/?limit=1&lat=53.2783&lon=-110.0050&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(photonUrl, {
      headers: { 'User-Agent': 'ReachScreens-Map/1.0', 'Accept-Language': 'en' }
    });
    if (res.status === 429) { const e = new Error('rate-limited'); e.code = 429; throw e; }
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features[0]) {
        const c = data.features[0].geometry.coordinates;
        return { lng: c[0], lat: c[1] };
      }
    }
  } catch (e) {
    if (e.code === 429) throw e;
  }

  // Nominatim fallback
  const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(query)}`;
  const res = await fetch(nomUrl, {
    headers: {
      'User-Agent': 'ReachScreens-Map/1.0 (contact: info@reachscreens.ca)',
      'Accept-Language': 'en'
    }
  });
  if (res.status === 429) { const e = new Error('rate-limited'); e.code = 429; throw e; }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.length) return null;
  return { lng: parseFloat(data[0].lon), lat: parseFloat(data[0].lat) };
}

function loadExisting() {
  try {
    const txt = fs.readFileSync(OUT_FILE, 'utf8');
    const m = txt.match(/window\.screenLocations\s*=\s*(\[[\s\S]*\])\s*;/);
    if (m) return JSON.parse(m[1]);
  } catch (_) {}
  return [];
}

function save(records) {
  records.sort((a, b) => a.id - b.id);
  const body = 'window.screenLocations = ' + JSON.stringify(records, null, 2) + ';\n';
  fs.writeFileSync(OUT_FILE, body);
}

async function geocodeWithBackoff(query) {
  let delayBackoff = 4000;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await geocode(query);
      return r; // null = no result, object = success
    } catch (e) {
      if (e.code === 429) {
        console.log(`    ↻ rate-limited, sleeping ${delayBackoff/1000}s...`);
        await sleep(delayBackoff);
        delayBackoff = Math.min(delayBackoff * 2, 60000);
        continue;
      }
      throw e;
    }
  }
  throw new Error('exhausted retries');
}

async function main() {
  const reset = process.argv.includes('--reset');
  const existing = reset ? [] : loadExisting();
  const haveIds = new Set(existing.filter(e => !e._failed).map(e => e.id));
  const records = existing.filter(e => !e._failed);

  console.log(`Geocoding ${SOURCE.length - haveIds.size} new addresses (${haveIds.size} already done)\n`);

  for (const loc of SOURCE) {
    if (haveIds.has(loc.id)) continue;

    let result = null;
    let usedVariant = null;
    for (const v of variants(loc.address)) {
      try {
        const r = await geocodeWithBackoff(v);
        // ~1s between distinct queries; Photon is more lenient than Nominatim
        await sleep(1000);
        if (r) { result = r; usedVariant = v; break; }
      } catch (e) {
        console.error(`  [${loc.id}] error: ${e.message}`);
        await sleep(3000);
      }
    }

    if (result) {
      console.log(`✓ [${loc.id}] ${loc.name}  →  ${result.lng.toFixed(5)}, ${result.lat.toFixed(5)}${usedVariant !== loc.address ? '  (variant)' : ''}`);
      records.push({ id: loc.id, name: loc.name, address: loc.address, lng: result.lng, lat: result.lat });
    } else {
      console.warn(`✗ [${loc.id}] ${loc.name}  →  FAILED, using city fallback`);
      records.push({ id: loc.id, name: loc.name, address: loc.address, lng: CITY_FALLBACK.lng, lat: CITY_FALLBACK.lat, _failed: true });
    }

    // Save after every record so progress is durable
    save(records);
  }

  const failed = records.filter(r => r._failed);
  console.log(`\nDone. ${records.length} records → ${OUT_FILE}`);
  if (failed.length) {
    console.log(`\n⚠️  ${failed.length} address(es) need manual lng/lat. Re-run with --reset, or set them by hand:`);
    failed.forEach(f => console.log(`   - [${f.id}] ${f.name}  (${f.address})`));
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
