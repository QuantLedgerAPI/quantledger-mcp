import { z } from 'zod';
import { loadLocalCatalog } from './statutoryEngine.mjs';
import { loadTaxonomyBundle } from './taxonomyEngine.mjs';

export function registerResourcesAndPrompts(server) {
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
            text: `Prepare a deterministic FASB ASC 842 lease liability and Right-of-Use (ROU) audit workpaper for jurisdiction ${jurisdiction}. First call get_live_us_statutory_rates_and_57_jurisdictions(jurisdiction="${jurisdiction}") to pull live US Treasury / SOFR reference rates, inspect BI-17 via list_institutional_math_suites_73, and if RAPIDAPI_KEY is configured execute BI-17 on: ${lease_summary}`,
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
            text: `Run an IRC Sec 382 & Sec 409A corporate tax diagnostic for ${jurisdiction}. Call get_live_us_statutory_rates_and_57_jurisdictions(jurisdiction="${jurisdiction}") to confirm the current IRC Sec 382 long-term tax-exempt rate and blended effective tax rate, inspect BI-49 and BI-48 via list_institutional_math_suites_73, and evaluate: ${cap_table_notes}`,
          },
        },
      ],
    })
  );
}
