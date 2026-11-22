import { z } from 'zod';
import { runCloudTrialBalanceBridge } from './cloudComputeClient.mjs';

function parseMoney(val) {
  if (val === null || val === undefined || typeof val === 'boolean') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  let s = String(val).trim();
  if (!s || s === '-' || s === '--') return 0;
  let neg = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$€£,\s]/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

export function verifyLocalTrialBalanceTieOut(rawLedgerData) {
  let rows = [];
  if (Array.isArray(rawLedgerData)) {
    rows = rawLedgerData.map((r) => ({
      account: String(r.account_name || r.Account || r.name || ''),
      debit: parseMoney(r.debit ?? r.Debit ?? 0),
      credit: parseMoney(r.credit ?? r.Credit ?? 0),
    }));
  } else if (typeof rawLedgerData === 'string' && rawLedgerData.trim()) {
    const lines = rawLedgerData.trim().split(/\r?\n/).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 3 && !cols[0].toLowerCase().startsWith('total')) {
        rows.push({
          account: cols[1] ? `${cols[0]} ${cols[1]}`.trim() : cols[0].trim(),
          debit: parseMoney(cols[cols.length - 2]),
          credit: parseMoney(cols[cols.length - 1]),
        });
      }
    }
  }
  const totalDebits = Number(rows.reduce((a, r) => a + r.debit, 0).toFixed(2));
  const totalCredits = Number(rows.reduce((a, r) => a + r.credit, 0).toFixed(2));
  const variance = Number((totalDebits - totalCredits).toFixed(2));
  return {
    execution_mode: 'LOCAL_KEYLESS_TB_TIEOUT',
    accounts_checked: rows.length,
    total_debits_usd: totalDebits,
    total_credits_usd: totalCredits,
    out_of_balance_variance_usd: variance,
    is_in_balance: Math.abs(variance) <= 1.0,
    next_step: 'Call bridge_quickbooks_xero_trial_balance_to_engine to map accounts into any BI-01..BI-73 statutory solver.',
  };
}

export function registerLedgerBridgeTools(server) {
  server.registerTool(
    'validate_quickbooks_xero_trial_balance_tieout',
    {
      title: 'Verify QuickBooks / Xero Trial Balance Debits == Credits Tie-Out (Keyless Local)',
      description:
        'Runs locally with no API key required. Verifies AICPA AU-C Sec. 500 double-entry balance (Total Debits == Total Credits) on QuickBooks, Xero, or NetSuite Trial Balance CSVs or JSON row arrays before statutory solver execution.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      inputSchema: {
        raw_ledger_data: z.union([z.string(), z.array(z.record(z.any()))]).describe('Raw QuickBooks/Xero Trial Balance CSV string or array of {account_name, debit, credit} objects.'),
      },
    },
    async ({ raw_ledger_data }) => ({
      content: [{ type: 'text', text: JSON.stringify(verifyLocalTrialBalanceTieOut(raw_ledger_data), null, 2) }],
    })
  );

  server.registerTool(
    'bridge_quickbooks_xero_trial_balance_to_engine',
    {
      title: 'Bridge QuickBooks, Xero or NetSuite Trial Balance into BI-01..BI-73 Solvers (Cloud REST)',
      description:
        'Accepts raw QuickBooks Online CSV or quickbooks-mcp-server Report JSON, Xero CSV or @xeroapi/xero-mcp-server Trial Balance JSON, or NetSuite CSV; verifies Debits == Credits, rolls up US GAAP & IRC accounts, and executes any BI-01..BI-73 statutory solver (requires RAPIDAPI_KEY).',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      inputSchema: {
        raw_ledger_data: z.any().optional().describe('Raw QuickBooks/Xero/NetSuite CSV text or MCP JSON object (omit to run built-in 22-account sample Trial Balance).'),
        source_format: z.string().default('auto').describe('auto, quickbooks_csv, quickbooks_mcp_json, xero_mcp_json, xero_csv, or netsuite_csv.'),
        engine_code: z.string().default('BI-21').describe('Target solver (BI-01..BI-73), e.g. BI-21 (QoE), BI-01 (Borrowing Base), BI-07 (DCAA), BI-17 (ASC 842), BI-50 (R&D), BI-63 (ASC 740).'),
        jurisdiction: z.string().default('DE').describe('2-letter US State, DC, Territory, or US code.'),
        naics_or_sic: z.string().default('332710').describe('6-digit NAICS or 4-digit SIC code.'),
        override_inputs: z.record(z.any()).default({}).describe('Optional explicit parameter overrides merged after Chart-of-Accounts mapping.'),
      },
    },
    async (params) => {
      const res = await runCloudTrialBalanceBridge(params);
      return {
        isError: Boolean(res?.isError),
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );
}
