#!/usr/bin/env node
/**
 * QuantLedger Open-Source MCP Server (`@modelcontextprotocol/sdk`)
 * - Executes US 57-jurisdiction corporate tax & apportionment math, live NY Fed `.gov`
 *   benchmark rate lookups, 1,012-NAICS / 1,184-SIC / 163-GICS crosswalks, 73-engine
 *   statutory schema search, MCP Resources, and CPA/Audit MCP Prompts 100% locally with no API key.
 * - Connects to the QuantLedger REST API (`/v1/suites/{engine_code}/compute` and
 *   `/v1/company/credit-and-footnote-dossier`) when `RAPIDAPI_KEY` is configured.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { searchCatalogSuites } from './catalogEngine.mjs';
import { runCloudDolForm5500Screen, runCloudKybBatchScreen, runCloudMathEngine, runCloudSec10kAudit, runCloudSecFormDLeads } from './cloudComputeClient.mjs';
import { registerResourcesAndPrompts } from './mcpResourcesAndPrompts.mjs';
import { getStatutoryRatesAndJurisdictions } from './statutoryEngine.mjs';
import { resolveIndustryTaxonomy } from './taxonomyEngine.mjs';

const READONLY_LOCAL = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const READONLY_OPENWORLD = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function createQuantLedgerMcpServer() {
  const server = new McpServer({
    name: 'quantledger-mcp',
    version: '2.8.0',
  });

  // 1. Keyless Local Tool: Search & Inspect All 73 Blueprints
  server.registerTool(
    'list_institutional_math_suites_73',
    {
      title: 'Search & Inspect 73 CPA, GAAP, IRC Tax & Credit Blueprints (Keyless Local)',
      description:
        'Runs locally with no API key required. Searches and inspects all 10 Institutional Suites and 73 deterministic CPA, FASB GAAP, IRC Tax, 409A Valuation, GovCon DCAA, CMS Medicare, CRE, M&A QoE, Customs, and Credit blueprints (BI-01 to BI-73, 292 laws), returning governing statutes, required input datasets, and output schedules.',
      annotations: READONLY_LOCAL,
      inputSchema: {
        suite_id: z.string().optional().describe('Optional suite-01 through suite-10 filter.'),
        keyword: z.string().optional().describe('Optional statute or topic search keyword (e.g. ASC 842, 382, UBIT, DCAA, ERISA).'),
        engine_code: z.string().optional().describe('Optional exact code (BI-01..BI-73) to inspect full schema.'),
      },
    },
    async ({ suite_id, keyword, engine_code }) => ({
      content: [{ type: 'text', text: JSON.stringify(searchCatalogSuites({ suiteId: suite_id, keyword, engineCode: engine_code }), null, 2) }],
    })
  );

  // 2. Keyless Local Tool: Live .gov Benchmarks + 57-Jurisdiction Corporate Tax & Apportionment Calculator
  server.registerTool(
    'get_live_us_statutory_rates_and_57_jurisdictions',
    {
      title: 'Compute Live US .gov Rates & 57-Jurisdiction Tax Apportionment (Keyless Local)',
      description:
        'Runs locally with no API key required. Pulls live NY Fed SOFR & EFFR + 24 official federal benchmarks and computes apportioned state + federal IRC Sec 11 combined effective corporate tax rates across all 57 US jurisdictions (50 States, DC, PR, GU, VI, AS, MP, US).',
      annotations: READONLY_OPENWORLD,
      inputSchema: {
        jurisdiction: z.string().optional().describe('Optional 2-letter US State, DC, PR, GU, VI, AS, MP, or US code.'),
        sales_share: z.number().min(0).max(1).optional().describe('Optional in-state sales factor ratio (0.0 to 1.0, default 1.0).'),
        payroll_share: z.number().min(0).max(1).optional().describe('Optional in-state payroll factor ratio (0.0 to 1.0, default 1.0).'),
        property_share: z.number().min(0).max(1).optional().describe('Optional in-state property factor ratio (0.0 to 1.0, default 1.0).'),
      },
    },
    async ({ jurisdiction, sales_share, payroll_share, property_share }) => {
      const result = await getStatutoryRatesAndJurisdictions({
        jurisdiction,
        salesShare: sales_share ?? 1.0,
        payrollShare: payroll_share ?? 1.0,
        propertyShare: property_share ?? 1.0,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // 3. Keyless Local Tool: Bidirectional 1,012-NAICS / 1,184-SIC / 163-GICS Crosswalk
  server.registerTool(
    'resolve_universal_industry_taxonomy',
    {
      title: 'Crosswalk 6-Digit NAICS, 4-Digit SIC & 8-Digit GICS Codes (Keyless Local)',
      description:
        'Runs locally with no API key required. Maps any US 6-digit NAICS (1,012), 4-digit SIC (1,184), or 8-digit GICS (163) code or industry keyword bidirectionally with SEC Review Office and applicable statutory suite recommendations.',
      annotations: READONLY_LOCAL,
      inputSchema: {
        code_or_keyword: z.string().describe('6-digit NAICS, 4-digit SIC, 8-digit GICS code, or natural-language industry keyword.'),
      },
    },
    async ({ code_or_keyword }) => ({
      content: [{ type: 'text', text: JSON.stringify(resolveIndustryTaxonomy(code_or_keyword), null, 2) }],
    })
  );

  // 4. REST-Backed Cloud Solver Tool: Execute Any of the 73 Deterministic CPU Solvers
  server.registerTool(
    'execute_institutional_math_engine',
    {
      title: 'Execute Deterministic GAAP, IRC Tax, DCAA or Credit Math Engine (Cloud REST)',
      description:
        'Executes any of the 73 deterministic quantitative & statutory accounting/finance engines (BI-01 to BI-73: ASC 842 leases, ASC 606 SSP, ASC 326 CECL, ASC 740, IRC Sec 382/174/41/409A/163j/280G, Form 990 UBIT, DCAA CAS 410/418 wrap rates, CMS RBRVS, Altman Z-Score, QoE EBITDA, 19 U.S.C. 1401a customs) across 57 US jurisdictions via QuantLedger REST API (requires RAPIDAPI_KEY).',
      annotations: READONLY_OPENWORLD,
      inputSchema: {
        engine_code: z.string().describe('Engine code from BI-01 through BI-73 (call list_institutional_math_suites_73 first to inspect inputs).'),
        jurisdiction: z.string().default('DC').describe('2-letter US State, DC, PR, GU, VI, AS, MP, or US Federal code.'),
        naics_or_sic: z.string().default('541211').describe('6-digit NAICS, 4-digit SIC, or 8-digit GICS code.'),
        structured_inputs: z.record(z.any()).default({}).describe('Numeric key-value inputs (trial balance, lease schedule, cost pools, cap table). Pass {} for statutory baseline.'),
        unstructured_context: z.string().default('').describe('Optional contract clause, lease excerpt, or CSV text for quote-verified extraction.'),
      },
    },
    async ({ engine_code, jurisdiction, naics_or_sic, structured_inputs, unstructured_context }) => {
      const res = await runCloudMathEngine({
        engineCode: engine_code,
        jurisdiction,
        naicsOrSic: naics_or_sic,
        structuredInputs: structured_inputs,
        unstructuredContext: unstructured_context,
      });
      return {
        isError: Boolean(res?.isError),
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 5. REST-Backed Cloud Tool: Live SEC EDGAR Form 10-K Covenant, QoE & Tariff Audit
  server.registerTool(
    'analyze_sec_credit_covenants_and_tariffs',
    {
      title: 'Audit Public Company Live SEC Form 10-K Covenants, QoE & Tariffs (Cloud REST)',
      description:
        'Audits any public company live SEC EDGAR Form 10-K XBRL + footnotes via QuantLedger REST API (requires RAPIDAPI_KEY): extracts character-for-character verified debt covenants, GAAP-to-Adjusted EBITDA bridge, Altman Z-Score, 19 U.S.C. 1401a tariff shock, and Base/Stress DSCR.',
      annotations: READONLY_OPENWORLD,
      inputSchema: {
        ticker_or_cik: z.string().describe('US stock ticker (e.g. CAT, DE, AAPL, MSFT) or 10-digit SEC CIK.'),
        analysis_focus: z.string().default('auto').describe('Optional focus lens (auto, credit_covenants, qoe_ebitda, tariff_1401a).'),
      },
    },
    async ({ ticker_or_cik, analysis_focus }) => {
      const res = await runCloudSec10kAudit({ tickerOrCik: ticker_or_cik, analysisFocus: analysis_focus });
      return {
        isError: Boolean(res?.isError),
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 6. REST-Backed Cloud Tool: Batch US KYB, OFAC Sanctions, BIS, OIG Exclusions & SEC Screener
  server.registerTool(
    'screen_us_kyb_ofac_bis_and_exclusions',
    {
      title: 'Batch Screen US KYB, OFAC Sanctions, BIS, OIG Exclusions & SEC EDGAR (Cloud REST)',
      description:
        'Screens 1 to 5,000 companies or individuals against 138,000+ live U.S. federal watchlist records (Treasury OFAC SDN/SSI/CMIC, Commerce BIS Entity List/Denied Persons, State Dept ITAR, HHS OIG Exclusions, OFAC 50%-Rule beneficial ownership, and SEC EDGAR CIK) via QuantLedger REST API (requires RAPIDAPI_KEY).',
      annotations: READONLY_OPENWORLD,
      inputSchema: {
        entities: z.array(z.union([z.string(), z.record(z.any())])).min(1).max(5000).describe('Company/person names or objects with optional beneficial_owners ([{name, ownership_pct}]).'),
        fuzzy_threshold: z.number().min(0.75).max(0.99).default(0.88).describe('Jaro-Winkler phonetic threshold (default 0.88).'),
      },
    },
    async ({ entities, fuzzy_threshold }) => {
      const res = await runCloudKybBatchScreen({ entities, fuzzyThreshold: fuzzy_threshold });
      return {
        isError: Boolean(res?.isError),
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 7. REST-Backed Cloud Tool: Live SEC Form D Private-Raise Leads + IRC 409A & State Tax Nexus
  server.registerTool(
    'extract_sec_form_d_private_raises_and_409a_triggers',
    {
      title: 'Extract Live SEC Form D Startup Fundraising Leads + 409A & Tax Nexus (Cloud REST)',
      description:
        'Queries live SEC EDGAR Form D private-placement filings (primary_doc.xml) for newly funded companies, returning CEO/CFO signer contact, phone, HQ address, dollars closed, IRC Sec. 409A revaluation triggers, IRC Sec. 1202 QSBS status, and 57-state corporate tax nexus (requires RAPIDAPI_KEY).',
      annotations: READONLY_OPENWORLD,
      inputSchema: {
        days_back: z.number().int().min(1).max(90).default(14).describe('Lookback window in calendar days (1 to 90).'),
        max_results: z.number().int().min(1).max(100).default(25).describe('Max enriched Form D issuers to return (1 to 100).'),
        state_filter: z.string().default('').describe('Optional 2-letter US state filter (e.g. CA, NY, TX, MA).'),
        industry_keyword: z.string().default('').describe('Optional sector or keyword filter (e.g. Technology, Health Care, AI).'),
        min_amount_sold_usd: z.number().min(0).default(0).describe('Minimum closed capital sold in USD.'),
        exclude_pooled_funds: z.boolean().default(true).describe('Exclude hedge/VC/pooled funds to focus on operating companies.'),
      },
    },
    async (params) => {
      const res = await runCloudSecFormDLeads(params);
      return {
        isError: Boolean(res?.isError),
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 8. REST-Backed Cloud Tool: DOL Form 5500 CPA Benefit-Plan Audit & ERISA Sec. 408(b)(2) Fee Screener
  server.registerTool(
    'screen_dol_form_5500_erisa_audit_and_fee_triggers',
    {
      title: 'Screen DOL Form 5500 Plans for CPA Audit & ERISA Fee Triggers (Cloud REST)',
      description:
        'Screens 121,000+ official U.S. DOL EBSA EFAST2 Form 5500 & Schedule H/I retirement plans for 80-120 participant first-time CPA audit thresholds, missing audit opinions, ERISA Sec. 408(b)(2) excess fees, Line 4a late deferrals, and ERISA Sec. 412 bond shortfalls (requires RAPIDAPI_KEY).',
      annotations: READONLY_OPENWORLD,
      inputSchema: {
        plan_year: z.number().int().default(2025).describe('DOL EFAST2 plan year (2025 or 2024).'),
        trigger_filter: z.string().default('ALL_TRIGGERS').describe('ALL_TRIGGERS, FIRST_TIME_CPA_AUDIT_ZONE, MISSING_CPA_AUDIT_OPINION, LATE_DEFERRAL_VIOLATION, HIGH_FEE_BENCHMARK_ALERT, FIDELITY_BOND_SHORTFALL, or ALL_PLANS.'),
        state_filter: z.string().default('').describe('Optional 2-letter US state filter (e.g. CA, TX, NY, FL).'),
        sponsor_or_ein_query: z.string().default('').describe('Optional employer name, 9-digit EIN, CPA firm, or custodian.'),
        min_assets_usd: z.number().min(0).default(500000).describe('Minimum ending net plan assets in USD.'),
        max_results: z.number().int().min(1).max(100).default(25).describe('Max enriched Form 5500 plans to return (1 to 100).'),
      },
    },
    async (params) => {
      const res = await runCloudDolForm5500Screen(params);
      return {
        isError: Boolean(res?.isError),
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  registerResourcesAndPrompts(server);
  return server;
}

const entryHref = process.argv[1]
  ? pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href
  : '';
if (entryHref === import.meta.url) {
  const server = createQuantLedgerMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
