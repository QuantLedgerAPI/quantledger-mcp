import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, '..', 'data', 'catalog.json');

let cachedCatalog = null;
let liveGovCache = null;
let liveGovFetchedAt = 0;

export function loadLocalCatalog() {
  if (!cachedCatalog) {
    cachedCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  }
  return cachedCatalog;
}

async function fetchJsonWithTimeout(url, timeoutMs = 3500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'QuantLedgerMCP/2.1 (+https://github.com/QuantLedgerAPI/quantledger-mcp)' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshLiveGovRates() {
  const now = Date.now();
  if (liveGovCache && now - liveGovFetchedAt < 900_000) {
    return liveGovCache;
  }
  const [sofrJson, effrJson] = await Promise.all([
    fetchJsonWithTimeout('https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json'),
    fetchJsonWithTimeout('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json'),
  ]);

  const updates = {};
  const sofrRow = sofrJson?.refRates?.[0];
  if (sofrRow?.percentRate != null) {
    const pct = Number(sofrRow.percentRate);
    updates.fed_sofr_overnight = {
      numeric_value: Number((pct / 100).toFixed(6)),
      current_value: `${pct.toFixed(2)}%`,
      effective_period: sofrRow.effectiveDate || 'Live NY Fed',
      live_verified: true,
    };
  }
  const effrRow = effrJson?.refRates?.[0];
  if (effrRow?.percentRate != null) {
    const pct = Number(effrRow.percentRate);
    updates.fed_effr_overnight = {
      numeric_value: Number((pct / 100).toFixed(6)),
      current_value: `${pct.toFixed(2)}%`,
      effective_period: effrRow.effectiveDate || 'Live NY Fed',
      live_verified: true,
    };
  }
  liveGovCache = updates;
  liveGovFetchedAt = now;
  return updates;
}

function apportionmentWeights(formula) {
  const f = String(formula || '').toLowerCase();
  if (f.includes('single_sales')) return { property: 0.0, payroll: 0.0, sales: 1.0 };
  if (f.includes('double_sales')) return { property: 0.25, payroll: 0.25, sales: 0.5 };
  if (f.includes('three_factor')) return { property: 1 / 3, payroll: 1 / 3, sales: 1 / 3 };
  return { property: 0.0, payroll: 0.0, sales: 1.0 };
}

export async function getStatutoryRatesAndJurisdictions({ jurisdiction, salesShare = 1.0, payrollShare = 1.0, propertyShare = 1.0 } = {}) {
  const cat = loadLocalCatalog();
  const liveUpdates = await refreshLiveGovRates();
  const mergedRates = { ...cat.federal_statutory_rates };

  for (const [k, patch] of Object.entries(liveUpdates)) {
    if (mergedRates[k]) {
      mergedRates[k] = { ...mergedRates[k], ...patch };
    } else {
      mergedRates[k] = patch;
    }
  }

  const fedRate = Number(mergedRates?.irc_sec_11_corporate_tax_rate?.numeric_value ?? 0.21);

  if (jurisdiction) {
    const code = String(jurisdiction).trim().toUpperCase();
    const jur = cat.us_jurisdictions?.[code];
    if (!jur) {
      return {
        error: `Unknown US jurisdiction '${code}'. Supported codes: ${Object.keys(cat.us_jurisdictions || {}).join(', ')}`,
      };
    }
    const weights = apportionmentWeights(jur.apportionment_formula);
    const factor = Number(
      (weights.sales * Number(salesShare) + weights.payroll * Number(payrollShare) + weights.property * Number(propertyShare)).toFixed(6)
    );
    const stateRate = Number(jur.corporate_or_statutory_tax_rate || 0);
    const apportionedStateRate = Number((stateRate * factor).toFixed(6));
    const blendedEffectiveTaxRate = Number((fedRate * (1 - apportionedStateRate) + apportionedStateRate).toFixed(6));

    return {
      execution_mode: 'LOCAL_KEYLESS_STATUTORY_ENGINE',
      jurisdiction: {
        ...jur,
        apportionment_weights: weights,
        computed_apportionment_factor: factor,
        apportioned_state_effective_rate: apportionedStateRate,
        federal_irc_sec_11_rate: fedRate,
        combined_fed_state_effective_tax_rate: blendedEffectiveTaxRate,
      },
      federal_statutory_rates: mergedRates,
    };
  }

  return {
    execution_mode: 'LOCAL_KEYLESS_STATUTORY_ENGINE',
    total_us_jurisdictions: Object.keys(cat.us_jurisdictions || {}).length,
    total_federal_benchmarks: Object.keys(mergedRates).length,
    us_jurisdictions: cat.us_jurisdictions,
    federal_statutory_rates: mergedRates,
  };
}
