# QuantLedger 73-Engine CPA, FASB GAAP, IRC Tax, Valuation & SEC 10-K MCP Server

mcp-name: io.github.QuantLedgerAPI/quantledger-cpa-accounting-gaap-asc842-irc-tax-409a-dcaa-sec-10-k-credit-finance

**Zero LLM Math Drift. Sub-Millisecond Deterministic Python & NumPy Accounting, Tax, Credit & Valuation Solvers Across All 57 US Jurisdictions + Live Quote-Verified SEC Form 10-K Footnote Audits.**

[![RapidAPI Hub](https://img.shields.io/badge/RapidAPI-Subscribe%20(5%20Free%2FMo)-0055FF?style=for-the-badge)](https://rapidapi.com/quantledger/api/quantledger-73-engine-financial-and-statutory-api)
[![MCP Protocol](https://img.shields.io/badge/MCP-Streamable--HTTP%20%26%20Stdio-10A37F?style=for-the-badge)](https://rapidapi.com/quantledger/api/quantledger-73-engine-financial-and-statutory-api)

Built specifically for **AI Agents (`Claude Desktop`, `Cursor`, `VS Code Copilot`, `Windsurf`, `ChatGPT Actions`, `LangGraph`, `CrewAI`)** operating inside **CPA firms, corporate tax departments, commercial banks, private credit funds, valuation practices, and government contractors**.

---

## 30-Second Setup for Any AI Agent

### Step 1: Get Your API Key (`$0/mo` BASIC Tier Includes 5 Calls/Month)
Subscribe in 1 click on RapidAPI Hub:
👉 **[https://rapidapi.com/quantledger/api/quantledger-73-engine-financial-and-statutory-api](https://rapidapi.com/quantledger/api/quantledger-73-engine-financial-and-statutory-api)**

### Step 2A: Zero-Install Remote MCP (`Claude`, `Cursor`, `VS Code`, `Windsurf`)
No Node.js or Python needed — point your MCP client directly to the live Streamable-HTTP gateway:

```json
{
  "mcpServers": {
    "quantledger": {
      "type": "streamable-http",
      "url": "https://quantledger-73-engine-financial-and-statutory-api.p.rapidapi.com/mcp",
      "headers": {
        "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
        "X-RapidAPI-Host": "quantledger-73-engine-financial-and-statutory-api.p.rapidapi.com"
      }
    }
  }
}
```

### Step 2B: Local Stdio Bridge (`npx -y quantledger-mcp`)
For stdio-only MCP hosts:

```json
{
  "mcpServers": {
    "quantledger": {
      "command": "npx",
      "args": ["-y", "quantledger-mcp"],
      "env": {
        "RAPIDAPI_KEY": "YOUR_RAPIDAPI_KEY"
      }
    }
  }
}
```

---

## Included Tools for CPA & Financial Institution Agents

| Tool Name | What Your AI Agent Can Execute |
| :--- | :--- |
| **`execute_institutional_math_engine`** | Runs any of the **73 deterministic CPU engines (`BI-01`–`BI-73`, 292 laws)** in `< 1 ms` CPU time across **57 US jurisdictions** (`50` States + `DC` + `PR`, `GU`, `VI`, `AS`, `MP` + `US` Federal) with stateless zero-retention RAM privacy. |
| **`analyze_sec_credit_covenants_and_tariffs`** | Pulls any public company's live **SEC EDGAR Form 10-K XBRL + footnotes**, ties out GAAP Operating Income to Adjusted EBITDA, computes Altman Z-Score, DSCR & `19 U.S.C. § 1401a` tariff stress, and substring-verifies every extracted debt covenant quote (`18/18` verified). |
| **`get_live_us_statutory_rates_and_57_jurisdictions`** | Returns live official `.gov` benchmarks (**NY Fed SOFR & EFFR**, **FOMC Prime**, **US Treasury 2Y/5Y/10Y/30Y Curve**, **IRC § 382 Rate**, **BLS CPI-U**, **CMS MPFS**, **FAR 31.205-6(p) Cap**) + state corporate tax & apportionment formulas. |
| **`list_institutional_math_suites_73`** | Lists all 10 suites, governing statutes, input slots, and mathematical laws across `BI-01`–`BI-73`. |
| **`resolve_universal_industry_taxonomy`** | Deterministic bidirectional crosswalk across `1,012` 6-digit NAICS, `163` 8-digit GICS, and `1,184` 4-digit SIC codes. |

---

## All 10 CPA, Tax, GAAP, GovCon & Institutional Credit Suites (`BI-01` to `BI-73`)

1. **Suite 01 (`BI-01`–`BI-05`) — Commercial Credit & Working Capital:** 13-Week Cash Runway, Altman Z'-Score, Merton Distance-to-Default, Borrowing Base / AR Stress & Unit Economics.
2. **Suite 02 (`BI-06`–`BI-10`) — Federal GovCon & DCAA Compliance:** CAS 410/418 3-Pool Indirect Wrap Rates, FAR 31.205 Unallowable Scrub, Price-to-Win Logit, Buy American Act (`FAR Part 25`), CMMC 2.0 / NIST 800-171 SPRS.
3. **Suite 03 (`BI-11`–`BI-15`) — Healthcare & CMS Reimbursement:** CMS Medicare Physician Fee Schedule (`RBRVS / GPCI`), 340B Drug Pricing, Stark / Anti-Kickback Fair Market Value & Clinic Queueing.
4. **Suite 04 (`BI-16`–`BI-20`) — Commercial Real Estate (CRE) & Hospitality:** Debt Rescue / A-B Hope Note Sizing, Commercial Lease CAM/NNN Reconciliation & Tipped Wage Phase-Out (`Initiative 82`).
5. **Suite 05 (`BI-21`–`BI-25`) — M&A Quality of Earnings (QoE) & SaaS:** GAAP-to-Normalized EBITDA Proof-of-Cash, SaaS Net Dollar Retention / LTV:CAC, Working Capital Peg & TSA Carve-Out Costing.
6. **Suite 06 (`BI-26`–`BI-30`) — Litigation Damages, Antitrust & Tax Appeal:** Lost Profits Yardstick/Before-and-After, DOJ/FTC Merger HHI & GUPPI Screens, Commercial Property Assessment Appeals.
7. **Suite 07 (`BI-31`–`BI-33`) — Nonprofit Form 990 & Endowments:** IRC § 512 Unrelated Business Taxable Income (`UBIT`) Siloing, Member Churn & Tobin Endowment Spending Rules.
8. **Suite 08 (`BI-34`–`BI-43`) — Regulatory Defense, REA & Utilities:** EPA ABEL Ability-to-Pay, DCAA Eichleay / Measured-Mile REA Quantum, USDA OneRD `7 CFR 5001` Parity & AWWA M1 Utility Rate Design.
9. **Suite 09 (`BI-44`–`BI-58`) — National IRC Tax Code & Valuation:** IRC § 179D Energy Deduction, IRC § 41 R&D Credit, IRC § 174 Amortization, IRC § 382 Ownership Change NOL Cap, IRC § 409A OPM/PWERM Valuation, IRC § 280G Golden Parachute, IRC § 163(j) Interest Limitation, IRC § 704(c) / § 754 Partnership Waterfalls, IRC § 1202 QSBS & Multi-State Nexus Apportionment.
10. **Suite 10 (`BI-59`–`BI-73`) — Technical FASB GAAP, ERISA & Customs:** ASC 842 Lease ROU/Liability Schedules, ASC 606 Standalone Selling Price (`SSP`), ASC 326 CECL Credit Loss, ASC 740 Income Tax Provision / Valuation Allowance, ASC 805 Purchase Price Allocation (`PPA`), ASC 350 Goodwill Impairment, ASC 718 Stock Comp, ASC 815 Derivatives, ERISA Withdrawal Liability, `19 U.S.C. § 1401a` Customs Valuation & FAIR Cyber Loss.

---

## Disclaimers & Privacy
* **Stateless Zero-Retention Processing:** Inputs are processed strictly in volatile container RAM to return the JSON calculation and are never stored, logged, or used for model training.
* **Computational Utility Only:** Outputs provide deterministic statutory and mathematical calculations for professional review and do not constitute CPA attest/assurance opinions, formal tax opinions, legal advice, or registered investment advice.
