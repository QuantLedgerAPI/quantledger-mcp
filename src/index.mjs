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
import { runCloudMathEngine, runCloudSec10kAudit } from './cloudComputeClient.mjs';
import { getStatutoryRatesAndJurisdictions, loadLocalCatalog } from './statutoryEngine.mjs';
import { loadTaxonomyBundle, resolveIndustryTaxonomy } from './taxonomyEngine.mjs';

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
    version: '2.1.0',
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

  // MCP Resources (Keyless Local)
  server.registerResource(
    'catalog-suites',
    'quantledger://catalog/suites',
    {
      title: 'QuantLedger 73-Engine Statutory & Accounting Catalog',
      description: 'Complete index of 10 suites and 73 deterministic accounting, tax, valuation, and credit calculation blueprints.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(loadLocalCatalog().suites, null, 2) }],
    })
  );

  server.registerResource(
    'us-57-jurisdictions',
    'quantledger://statutory/us-57-jurisdictions',
    {
      title: 'US 57-Jurisdiction Corporate Tax & Apportionment Table',
      description: 'Corporate statutory tax rates, apportionment formulas, and labor multipliers across all 57 US jurisdictions.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(loadLocalCatalog().us_jurisdictions, null, 2) }],
    })
  );

  server.registerResource(
    'taxonomy-counts',
    'quantledger://taxonomy/summary',
    {
      title: 'NAICS / SIC / GICS Master Crosswalk Summary',
      description: 'Universe counts across 1,012 NAICS-6, 1,184 SIC-4, and 163 GICS-8 industry codes.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(loadTaxonomyBundle().counts, null, 2) }],
    })
  );

  // CPA, Tax & Credit Analyst MCP Prompts (Keyless Local)
  server.registerPrompt(
    'asc842-lease-audit-workpaper',
    {
      title: 'FASB ASC 842 Lease Liability & ROU Workpaper Audit',
      description: 'Structured CPA audit prompt for re-computing ASC 842 present-value lease liabilities and CAM/NNN reconciliations.',
      argsSchema: {
        jurisdiction: z.string().default('NY').describe('2-letter US jurisdiction code.'),
        lease_summary: z.string().describe('Key lease terms, base rent escalations, discount rate, or CAM clause text.'),
      },
    },
    async ({ jurisdiction, lease_summary }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Prepare a deterministic FASB ASC 842 lease liability and Right-of-Use (ROU) audit workpaper for jurisdiction ${jurisdiction}. First call get_live_us_statutory_rates_and_57_jurisdictions(jurisdiction="${jurisdiction}") to pull live US Treasury / SOFR reference rates, inspect BI-59 and BI-17 via list_institutional_math_suites_73, and if RAPIDAPI_KEY is configured execute BI-59 on: ${lease_summary}`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'irc-382-409a-tax-valuation-check',
    {
      title: 'IRC Sec 382 NOL Limitation & Sec 409A Valuation Check',
      description: 'Corporate tax specialist workflow for ownership-change NOL caps (IRC Sec 382) and OPM/PWERM strike valuations (IRC Sec 409A).',
      argsSchema: {
        jurisdiction: z.string().default('DE').describe('Corporate state of incorporation / nexus.'),
        cap_table_notes: z.string().describe('Summary of equity rounds, NOL balance, or ownership shift percentages.'),
      },
    },
    async ({ jurisdiction, cap_table_notes }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Run an IRC Sec 382 & Sec 409A corporate tax diagnostic for ${jurisdiction}. Call get_live_us_statutory_rates_and_57_jurisdictions(jurisdiction="${jurisdiction}") to confirm the current IRC Sec 382 long-term tax-exempt rate and blended effective tax rate, inspect BI-47 and BI-48 via list_institutional_math_suites_73, and evaluate: ${cap_table_notes}`,
          },
        },
      ],
    })
  );

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
