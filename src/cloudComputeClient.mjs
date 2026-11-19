const RAPIDAPI_HOST = 'quantledger-73-engine-financial-and-statutory-api.p.rapidapi.com';
const BASE_URL = process.env.QUANTLEDGER_BASE_URL || `https://${RAPIDAPI_HOST}`;
const SUBSCRIBE_URL = 'https://rapidapi.com/quantledger/api/quantledger-73-engine-financial-and-statutory-api';

export function resolveApiKey() {
  return (
    process.env.QUANTLEDGER_API_KEY ||
    process.env.RAPIDAPI_KEY ||
    process.env.X_RAPIDAPI_KEY ||
    ''
  ).trim();
}

async function postCloudEndpoint(routePath, payload) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return {
      isError: true,
      error: 'API_KEY_REQUIRED_FOR_CLOUD_SOLVER',
      message:
        `Local catalog, live US statutory tax rates, and NAICS/SIC/GICS crosswalks run without an API key. ` +
        `To execute remote CPU calculation solvers or live SEC EDGAR 10-K footnote audits, set RAPIDAPI_KEY ` +
        `(free BASIC tier includes 5 calls/month at ${SUBSCRIBE_URL}).`,
      requested_endpoint: routePath,
    };
  }

  const res = await fetch(`${BASE_URL}${routePath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      isError: true,
      status: res.status,
      message: `QuantLedger Cloud REST HTTP ${res.status}: ${text.slice(0, 400)}`,
      subscription_portal: SUBSCRIBE_URL,
    };
  }
  return JSON.parse(text);
}

export async function runCloudMathEngine({ engineCode, jurisdiction = 'DC', naicsOrSic = '541211', structuredInputs = {}, unstructuredContext = '' }) {
  const code = String(engineCode || 'BI-01').trim().toUpperCase();
  return await postCloudEndpoint(`/v1/suites/${encodeURIComponent(code)}/compute`, {
    jurisdiction,
    naics_or_sic: naicsOrSic,
    structured_inputs: structuredInputs,
    unstructured_context: unstructuredContext,
  });
}

export async function runCloudSec10kAudit({ tickerOrCik, analysisFocus = 'auto' }) {
  return await postCloudEndpoint('/v1/company/credit-and-footnote-dossier', {
    ticker_or_cik: tickerOrCik,
    analysis_focus: analysisFocus,
  });
}

export async function runCloudKybBatchScreen({ entities = ['Apple Inc.'], fuzzyThreshold = 0.88 }) {
  return await postCloudEndpoint('/v1/kyb/batch-screen', {
    entities,
    fuzzy_threshold: fuzzyThreshold,
  });
}

export async function runCloudSecFormDLeads(params = {}) {
  return await postCloudEndpoint('/v1/sec-edgar/form-d-private-raises', params);
}
