import { loadLocalCatalog } from './statutoryEngine.mjs';

export function searchCatalogSuites({ suiteId, keyword, engineCode } = {}) {
  const cat = loadLocalCatalog();
  const engines = cat.engines || {};

  if (engineCode) {
    const norm = String(engineCode).trim().toUpperCase();
    if (engines[norm]) {
      return {
        execution_mode: 'LOCAL_KEYLESS_CATALOG',
        engine: engines[norm],
      };
    }
  }

  let entries = Object.values(engines);
  if (suiteId) {
    const sid = String(suiteId).trim().toLowerCase();
    entries = entries.filter((e) => e.suite_id.toLowerCase() === sid);
  }
  if (keyword) {
    const kw = String(keyword).trim().toLowerCase();
    entries = entries.filter((e) => {
      const hay = `${e.engine_code} ${e.engine_title} ${e.governing_statutes} ${(e.domain_mathematical_laws || []).join(' ')}`.toLowerCase();
      return hay.includes(kw);
    });
  }

  return {
    execution_mode: 'LOCAL_KEYLESS_CATALOG',
    catalog_version: cat.catalog_version,
    total_suites: cat.total_suites,
    matching_engines_count: entries.length,
    suites: cat.suites,
    engines: entries.map((e) => ({
      engine_code: e.engine_code,
      suite_id: e.suite_id,
      engine_title: e.engine_title,
      governing_statutes: e.governing_statutes,
      electronic_standard: e.electronic_standard,
      domain_mathematical_laws: e.domain_mathematical_laws,
      expected_payload_datasets: e.expected_payload_datasets,
      output_worksheet_schedules: e.output_worksheet_schedules,
    })),
  };
}
