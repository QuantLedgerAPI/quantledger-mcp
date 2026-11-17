import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CROSSWALK_PATH = path.resolve(__dirname, '..', 'data', 'industry_crosswalk.json');

let cachedTaxonomy = null;

export function loadTaxonomyBundle() {
  if (!cachedTaxonomy) {
    cachedTaxonomy = JSON.parse(fs.readFileSync(CROSSWALK_PATH, 'utf-8'));
  }
  return cachedTaxonomy;
}

export function resolveIndustryTaxonomy(codeOrKeyword) {
  const bundle = loadTaxonomyBundle();
  const q = String(codeOrKeyword || '').trim();
  const naicsMap = bundle.naics_6_crosswalk || {};
  const sicMap = bundle.sic_codes || {};
  const gicsMap = bundle.gics_subindustries || {};

  if (/^\d{8}$/.test(q)) {
    const g = gicsMap[q];
    if (g) {
      const nRec = naicsMap[g.default_naics_code] || {};
      return { execution_mode: 'LOCAL_KEYLESS_CROSSWALK', match_type: 'exact_gics_8', ...nRec, ...g };
    }
  }

  if (/^\d{5,6}$/.test(q)) {
    if (naicsMap[q]) {
      return { execution_mode: 'LOCAL_KEYLESS_CROSSWALK', match_type: 'exact_naics_6', ...naicsMap[q] };
    }
    const prefixHit = Object.keys(naicsMap).find((k) => k.startsWith(q));
    if (prefixHit) {
      return { execution_mode: 'LOCAL_KEYLESS_CROSSWALK', match_type: 'prefix_naics', ...naicsMap[prefixHit] };
    }
  }

  if (/^\d{3,4}$/.test(q)) {
    const padded = q.padStart(4, '0');
    const s = sicMap[padded];
    if (s) {
      const base = naicsMap[s.mapped_naics_code] || {};
      return {
        execution_mode: 'LOCAL_KEYLESS_CROSSWALK',
        match_type: 'exact_sic_4',
        ...base,
        sic_code: padded,
        sic_title: s.sic_title,
        sec_office: s.sec_office,
      };
    }
  }

  const lower = q.toLowerCase();
  const tokens = lower.split(/\s+/).filter((t) => t.length >= 2);
  const scored = [];

  for (const rec of Object.values(naicsMap)) {
    const hay = `${rec.naics_title} ${rec.sic_title} ${rec.gics_sub_industry} ${rec.gics_sector}`.toLowerCase();
    let score = hay.includes(lower) ? 10 : 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 2;
    }
    if (score > 0) scored.push({ score, rec });
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0) {
    return {
      execution_mode: 'LOCAL_KEYLESS_CROSSWALK',
      match_type: 'keyword_search',
      query: q,
      primary_match: scored[0].rec,
      related_matches: scored.slice(1, 6).map((x) => ({
        naics_code: x.rec.naics_code,
        naics_title: x.rec.naics_title,
        sic_code: x.rec.sic_code,
        gics_code: x.rec.gics_code,
      })),
    };
  }

  return {
    execution_mode: 'LOCAL_KEYLESS_CROSSWALK',
    match_type: 'fallback_default',
    query: q,
    ...(naicsMap['541211'] || Object.values(naicsMap)[0]),
  };
}
