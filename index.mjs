#!/usr/bin/env node
/**
 * QuantLedger Zero-IP Stdio-to-RapidAPI MCP Bridge (`npx -y quantledger-mcp`)
 * - Serves `initialize`, `ping`, `tools/list`, `prompts/list`, and `resources/list`
 *   immediately so Glama, Official MCP Registry, Claude Desktop, VS Code, and Cursor
 *   index all 5 CPA/GAAP/IRC/SEC tools cleanly even before an API key is configured.
 * - Routes 100% of `tools/call` executions through the RapidAPI Gateway meter
 *   (`quantledger-73-engine-financial-and-statutory-api.p.rapidapi.com`).
 */

import readline from 'node:readline';

const RAPIDAPI_HOST = 'quantledger-73-engine-financial-and-statutory-api.p.rapidapi.com';
const RAPIDAPI_MCP_URL = `https://${RAPIDAPI_HOST}/mcp`;
const SUBSCRIBE_URL = 'https://rapidapi.com/quantledger/api/quantledger-73-engine-financial-and-statutory-api';

const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const STATIC_TOOLS = [
  {
    name: 'list_institutional_math_suites_73',
    title: 'List 73 CPA, GAAP, IRC Tax & Finance Calculation Engines',
    description:
      'Lists all 10 Institutional Quantitative Suites and 73 deterministic CPA, FASB GAAP, IRC Tax, 409A Valuation, GovCon DCAA, CMS Medicare, CRE, M&A QoE, Customs Tariff, and Credit calculation engines (BI-01 to BI-73, 292 laws).',
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        suite_id: {
          type: 'string',
          description: 'Optional suite-01 through suite-10 filter.',
        },
      },
    },
  },
  {
    name: 'execute_institutional_math_engine',
    title: 'Execute Deterministic GAAP, IRC Tax, DCAA or Credit Math Engine',
    description:
      'Executes any of the 73 deterministic quantitative & statutory accounting/finance engines (BI-01 to BI-73: ASC 842 leases, ASC 606 SSP, ASC 326 CECL, ASC 740, IRC Sec 382/174/41/409A/163j/280G, Form 990 UBIT, DCAA CAS 410/418 wrap rates, CMS RBRVS, Altman Z-Score, QoE EBITDA, 19 U.S.C. 1401a customs) across 57 US jurisdictions (50 States, DC, PR, GU, VI, AS, MP, US) in stateless zero-retention RAM.',
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['engine_code', 'structured_inputs'],
      properties: {
        engine_code: {
          type: 'string',
          description: 'Engine code from BI-01 through BI-73 (call list_institutional_math_suites_73 to inspect).',
        },
        jurisdiction: {
          type: 'string',
          default: 'DC',
          description: '2-letter US State, DC, PR, GU, VI, AS, MP, or US Federal code.',
        },
        naics_or_sic: {
          type: 'string',
          default: '541211',
          description: '6-digit NAICS, 4-digit SIC, or 8-digit GICS code.',
        },
        structured_inputs: {
          type: 'object',
          description: 'Numeric key-value inputs (trial balance, lease schedule, cost pools, cap table, ARR cohorts). Pass {} to run statutory baseline.',
        },
        unstructured_context: {
          type: 'string',
          default: '',
          description: 'Optional contract clause, lease excerpt, or CSV text for quote-verified input extraction before CPU solve.',
        },
      },
    },
  },
  {
    name: 'analyze_sec_credit_covenants_and_tariffs',
    title: 'Audit Public Company Live SEC Form 10-K Covenants, QoE & Tariffs',
    description:
      'Audits any public company live SEC EDGAR Form 10-K XBRL + footnotes: extracts character-for-character verified debt covenants, GAAP-to-Adjusted EBITDA bridge, Altman Z-Score, 19 U.S.C. 1401a tariff shock, Base/Stress DSCR, and NAICS/GICS/SIC crosswalk.',
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['ticker_or_cik'],
      properties: {
        ticker_or_cik: {
          type: 'string',
          description: 'US stock ticker (e.g. CAT, DE, AAPL, MSFT) or 10-digit SEC CIK.',
        },
        analysis_focus: {
          type: 'string',
          default: 'auto',
          description: 'Optional focus lens (auto, credit_covenants, qoe_ebitda, tariff_supply_chain).',
        },
      },
    },
  },
  {
    name: 'get_live_us_statutory_rates_and_57_jurisdictions',
    title: 'Get Live Official US Statutory Rates & 57-Jurisdiction Tax Parameters',
    description:
      'Returns live official .gov reference benchmarks (NY Fed SOFR & EFFR, FOMC Prime, US Treasury 2Y/5Y/10Y/30Y yield curve, IRC Sec 382 rate, BLS CPI-U, CMS MPFS, FAR 31.205-6p cap) and corporate tax / apportionment formulas across all 57 US jurisdictions.',
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        jurisdiction: {
          type: 'string',
          description: 'Optional 2-letter state/territory code (e.g. NY, CA, TX, DC, PR, US).',
        },
      },
    },
  },
  {
    name: 'resolve_universal_industry_taxonomy',
    title: 'Crosswalk 6-Digit NAICS, 4-Digit SIC & 8-Digit GICS Codes',
    description:
      'Maps any US 6-digit NAICS (1,012), 4-digit SIC (1,184), or 8-digit GICS (163) code or keyword bidirectionally.',
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['code_or_keyword'],
      properties: {
        code_or_keyword: {
          type: 'string',
          description: '6-digit NAICS, 4-digit SIC, 8-digit GICS code, or industry keyword.',
        },
      },
    },
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

function writeJsonRpc(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

rl.on('line', async (rawLine) => {
  const line = rawLine.trim();
  if (!line) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  const method = String(msg.method || '');
  if (method.startsWith('notifications/')) {
    return;
  }

  if (method === 'ping') {
    writeJsonRpc({ jsonrpc: '2.0', id: msg.id ?? 1, result: {} });
    return;
  }

  if (method === 'initialize') {
    const reqProto = msg?.params?.protocolVersion || '2025-03-26';
    const supported = ['2025-06-18', '2025-03-26', '2024-11-05'];
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? 1,
      result: {
        protocolVersion: supported.includes(reqProto) ? reqProto : '2025-03-26',
        capabilities: {
          tools: { listChanged: false },
          prompts: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: {
          name: 'quantledger-73-engine-mcp',
          title: 'QuantLedger 73-Engine CPA, GAAP, IRC Tax, Credit & SEC 10-K API',
          version: '2.0.0',
        },
      },
    });
    return;
  }

  if (method === 'tools/list') {
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? 1,
      result: { tools: STATIC_TOOLS },
    });
    return;
  }

  if (method === 'prompts/list') {
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? 1,
      result: { prompts: [] },
    });
    return;
  }

  if (method === 'resources/list') {
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? 1,
      result: { resources: [] },
    });
    return;
  }

  if (method === 'resources/templates/list') {
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? 1,
      result: { resourceTemplates: [] },
    });
    return;
  }

  const apiKey = (process.env.RAPIDAPI_KEY || process.env.X_RAPIDAPI_KEY || '').trim();
  if (!apiKey) {
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? null,
      result: {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Missing RAPIDAPI_KEY environment variable. Provision your free BASIC API key (5 calls/month) or institutional plan in 30 seconds at: ${SUBSCRIBE_URL}`,
          },
        ],
      },
    });
    return;
  }

  try {
    const resp = await fetch(RAPIDAPI_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      body: JSON.stringify(msg),
    });

    if (resp.status === 202) return;
    const text = await resp.text();
    if (!resp.ok) {
      writeJsonRpc({
        jsonrpc: '2.0',
        id: msg.id ?? null,
        error: {
          code: -32001,
          message: `RapidAPI Gateway HTTP ${resp.status}: ${text.slice(0, 300)} — Verify RAPIDAPI_KEY at ${SUBSCRIBE_URL}`,
        },
      });
      return;
    }
    writeJsonRpc(JSON.parse(text));
  } catch (err) {
    writeJsonRpc({
      jsonrpc: '2.0',
      id: msg.id ?? null,
      error: {
        code: -32603,
        message: `QuantLedger MCP transport error: ${err?.message || String(err)}`,
      },
    });
  }
});
