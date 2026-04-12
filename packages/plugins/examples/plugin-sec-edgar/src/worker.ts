import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";

// ---------------------------------------------------------------------------
// SEC EDGAR public API — no key required; User-Agent required per SEC ToS
// ---------------------------------------------------------------------------

const EDGAR_HEADERS = {
  "User-Agent": "FundStarter/1.0 research@fundstarter.com",
  Accept: "application/json",
};

const EDGAR_EFTS = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_DATA = "https://data.sec.gov";

// ---------------------------------------------------------------------------
// Search filings
// ---------------------------------------------------------------------------

interface EdgarSearchHit {
  _id?: string;
  _source?: {
    period_of_report?: string;
    entity_name?: string;
    file_date?: string;
    form_type?: string;
    file_num?: string;
    period?: string;
    biz_location?: string;
    inc_states?: string;
  };
}

interface EdgarSearchResponse {
  hits?: {
    total?: { value?: number };
    hits?: EdgarSearchHit[];
  };
}

async function searchEdgarFilings(
  ctx: PluginContext,
  query: string,
  formType?: string,
  startDate?: string,
  endDate?: string,
  maxResults = 10
): Promise<ToolResult> {
  if (!query?.trim()) {
    return { content: "Error: query is required." };
  }

  const params = new URLSearchParams();
  params.set("q", query.trim());
  if (formType) params.set("forms", formType.trim());
  if (startDate) {
    params.set("dateRange", "custom");
    params.set("startdt", startDate.trim());
    if (endDate) params.set("enddt", endDate.trim());
  }
  params.set("hits.hits.total.relation", "eq");
  params.set("hits.hits._source.period_of_report", "");

  const url = `${EDGAR_EFTS}?${params.toString()}`;

  let resp: Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
  try {
    resp = await ctx.http.fetch(url, { method: "GET", headers: EDGAR_HEADERS });
  } catch (err) {
    return { content: `Network error: ${String(err)}` };
  }

  if (!resp.ok) {
    return { content: `EDGAR search returned HTTP ${resp.status}.` };
  }

  const data = (await resp.json()) as EdgarSearchResponse;
  const hits = data.hits?.hits ?? [];
  const total = data.hits?.total?.value ?? 0;

  if (hits.length === 0) {
    return { content: `No EDGAR filings found for query "${query}"${formType ? ` (form: ${formType})` : ""}.`,
    };
  }

  const lines: string[] = [
    `## EDGAR Filing Search: "${query}"${formType ? ` — Form: ${formType}` : ""}`,
    `*${total} total matches; showing ${Math.min(hits.length, maxResults)}*`,
    "",
  ];

  for (const hit of hits.slice(0, maxResults)) {
    const src = hit._source;
    const entityName = src?.entity_name ?? "Unknown entity";
    const fileDate = src?.file_date ?? "Unknown date";
    const formTypeStr = src?.form_type ?? "Unknown form";
    const period = src?.period_of_report ?? src?.period ?? "";
    const id = hit._id ?? "";
    // Build EDGAR filing URL from accession number (id)
    const filingUrl = id
      ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${encodeURIComponent(id)}&type=${encodeURIComponent(formTypeStr)}&dateb=&owner=include&count=1`
      : "";

    lines.push(
      `**${entityName}** — ${formTypeStr}`,
      `Filed: ${fileDate}${period ? ` | Period: ${period}` : ""}`,
      id ? `ID: \`${id}\`` : "",
      filingUrl ? `[View on EDGAR](${filingUrl})` : "",
      ""
    );
  }

  return { content: lines.filter((l) => l !== undefined).join("\n") };
}

// ---------------------------------------------------------------------------
// Get company filings by CIK
// ---------------------------------------------------------------------------

interface EdgarSubmissionsResponse {
  name?: string;
  cik?: string;
  sic?: string;
  sicDescription?: string;
  stateOfIncorporation?: string;
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
      primaryDocDescription?: string[];
    };
  };
}

async function getCompanyFilings(
  ctx: PluginContext,
  cik: string,
  formFilter?: string,
  maxResults = 20
): Promise<ToolResult> {
  if (!cik?.trim()) {
    return { content: "Error: cik is required." };
  }

  // CIK must be zero-padded to 10 digits for the API
  const paddedCik = cik.trim().replace(/^0+/, "").padStart(10, "0");
  const url = `${EDGAR_DATA}/submissions/CIK${paddedCik}.json`;

  let resp: Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
  try {
    resp = await ctx.http.fetch(url, { method: "GET", headers: EDGAR_HEADERS });
  } catch (err) {
    return { content: `Network error: ${String(err)}` };
  }

  if (!resp.ok) {
    return { content: `EDGAR company data returned HTTP ${resp.status}. Check that CIK "${cik}" is valid.`,
    };
  }

  const data = (await resp.json()) as EdgarSubmissionsResponse;
  const recent = data.filings?.recent;

  if (!recent?.accessionNumber?.length) {
    return { content: `No filings found for CIK ${cik} (${data.name ?? "unknown entity"}).`,
    };
  }

  const lines: string[] = [
    `## SEC Filings: ${data.name ?? "Unknown"} (CIK: ${data.cik ?? cik})`,
    `SIC: ${data.sic ?? "N/A"} — ${data.sicDescription ?? "N/A"}`,
    `State: ${data.stateOfIncorporation ?? "N/A"}`,
    "",
  ];

  const total = recent.accessionNumber.length;
  let shown = 0;

  for (let i = 0; i < total && shown < maxResults; i++) {
    const form = recent.form?.[i] ?? "?";
    if (formFilter && !form.toUpperCase().includes(formFilter.toUpperCase())) {
      continue;
    }
    const accession = recent.accessionNumber?.[i] ?? "";
    const fileDate = recent.filingDate?.[i] ?? "?";
    const reportDate = recent.reportDate?.[i];
    const primaryDoc = recent.primaryDocument?.[i];

    const accessionFormatted = accession.replace(/-/g, "");
    const docUrl = accession && primaryDoc
      ? `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${accessionFormatted}/${primaryDoc}`
      : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=${encodeURIComponent(form)}&dateb=&owner=include&count=1`;

    lines.push(
      `**${form}** — Filed: ${fileDate}${reportDate ? ` | Period: ${reportDate}` : ""}`,
      `Accession: \`${accession}\``,
      `[View filing](${docUrl})`,
      ""
    );
    shown++;
  }

  lines.push(`*Showing ${shown} of ${total} total filings${formFilter ? ` (filtered by "${formFilter}")` : ""}*`);

  return { content: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Get 13F holdings
// ---------------------------------------------------------------------------

async function get13fHoldings(
  ctx: PluginContext,
  cik: string,
  accessionNumber?: string
): Promise<ToolResult> {
  if (!cik?.trim()) {
    return { content: "Error: cik is required." };
  }

  const paddedCik = cik.trim().replace(/^0+/, "").padStart(10, "0");
  let accession = accessionNumber?.trim();

  // If no accession provided, find latest 13F-HR filing
  if (!accession) {
    const subUrl = `${EDGAR_DATA}/submissions/CIK${paddedCik}.json`;
    let resp: Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
    try {
      resp = await ctx.http.fetch(subUrl, {
        method: "GET",
        headers: EDGAR_HEADERS,
      });
    } catch (err) {
      return { content: `Network error fetching submissions: ${String(err)}` };
    }

    if (!resp.ok) {
      return { content: `EDGAR returned HTTP ${resp.status} for CIK ${cik}.` };
    }

    const sub = (await resp.json()) as EdgarSubmissionsResponse;
    const recent = sub.filings?.recent;

    if (!recent?.form) {
      return { content: `No filings found for CIK ${cik}.` };
    }

    // Find most recent 13F-HR
    const idx = recent.form.findIndex((f) => f === "13F-HR");
    if (idx === -1) {
      return { content: `No 13F-HR filings found for ${sub.name ?? cik}. This filer may not be an institutional investment manager.`,
      };
    }

    accession = recent.accessionNumber?.[idx];
    if (!accession) {
      return { content: `Could not find accession number for 13F filing.` };
    }
  }

  // Fetch the filing index to find the infotable XML document
  const accessionClean = accession.replace(/-/g, "");
  const indexUrl = `${EDGAR_DATA}/submissions/CIK${paddedCik}.json`;
  const filingIndexUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${accessionClean}/${accession}-index.json`;

  let indexResp: Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
  try {
    indexResp = await ctx.http.fetch(filingIndexUrl, {
      method: "GET",
      headers: EDGAR_HEADERS,
    });
  } catch (_err) {
    // Fall back: try the standard infotable naming convention
    indexResp = { ok: false } as Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
  }

  // Parse filing index to find the infotable
  let infotableUrl: string | null = null;
  if (indexResp.ok) {
    try {
      const idx2 = (await indexResp.json()) as {
        documents?: Array<{ name?: string; type?: string; url?: string }>;
      };
      const infotableDoc = idx2.documents?.find(
        (d) =>
          d.type === "INFORMATION TABLE" ||
          d.name?.toLowerCase().includes("infotable") ||
          d.name?.toLowerCase().endsWith(".xml")
      );
      if (infotableDoc?.url) {
        infotableUrl = `https://www.sec.gov${infotableDoc.url}`;
      }
    } catch (_) {
      // ignore parse error
    }
  }

  // If we couldn't find via index, try common naming conventions
  if (!infotableUrl) {
    infotableUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${accessionClean}/infotable.xml`;
  }

  let xmlResp: Awaited<ReturnType<PluginContext["http"]["fetch"]>>;
  try {
    xmlResp = await ctx.http.fetch(infotableUrl, {
      method: "GET",
      headers: { ...EDGAR_HEADERS, Accept: "application/xml, text/xml, */*" },
    });
  } catch (err) {
    return { content: `Network error fetching holdings: ${String(err)}` };
  }

  if (!xmlResp.ok) {
    return { content: `Could not retrieve 13F holdings XML (HTTP ${xmlResp.status}). The accession number may be wrong or the filing may use a non-standard filename.\n\nTry accessing the filing directly: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=13F-HR&dateb=&owner=include&count=5`,
    };
  }

  const xml = await xmlResp.text();

  // Parse 13F infotable XML holdings
  const holdings = parse13fXml(xml);

  if (holdings.length === 0) {
    return { content: `Could not parse holdings from the 13F infotable XML. The filing may use a non-standard format.\n\nRaw XML snippet (first 500 chars):\n\`\`\`\n${xml.slice(0, 500)}\n\`\`\``,
    };
  }

  const totalValue = holdings.reduce((sum, h) => sum + (h.value ?? 0), 0);

  const lines: string[] = [
    `## 13F Holdings — CIK: ${cik} | Accession: ${accession}`,
    `**Total positions**: ${holdings.length}`,
    `**Total value (×$1000)**: $${totalValue.toLocaleString()}k`,
    "",
    `| # | Issuer | Class | CUSIP | Value ($k) | Shares | Put/Call |`,
    `|---|--------|-------|-------|-----------|--------|----------|`,
  ];

  for (let i = 0; i < Math.min(holdings.length, 50); i++) {
    const h = holdings[i];
    lines.push(
      `| ${i + 1} | ${h.issuerName ?? ""} | ${h.titleOfClass ?? ""} | ${h.cusip ?? ""} | ${h.value?.toLocaleString() ?? ""} | ${h.shrsOrPrnAmt?.toLocaleString() ?? ""} | ${h.putCall ?? ""} |`
    );
  }

  if (holdings.length > 50) {
    lines.push(`\n*… and ${holdings.length - 50} more positions*`);
  }

  return { content: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// 13F XML parser (no external deps)
// ---------------------------------------------------------------------------

interface Holding13F {
  issuerName?: string;
  titleOfClass?: string;
  cusip?: string;
  value?: number;
  shrsOrPrnAmt?: number;
  putCall?: string;
}

function extractXmlTag(chunk: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = chunk.match(re);
  return m ? m[1].trim() : undefined;
}

function parse13fXml(xml: string): Holding13F[] {
  const holdings: Holding13F[] = [];
  // Handle namespace prefixes: ns1:infoTable, infoTable, etc.
  const entryRe = /<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi;
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(xml)) !== null) {
    const chunk = m[1];
    const shrsRaw =
      extractXmlTag(chunk, "sshPrnamt") ??
      extractXmlTag(chunk, "sshPrnamtType") ??
      undefined;
    const shrs = shrsRaw ? parseInt(shrsRaw.replace(/[^0-9]/g, ""), 10) : undefined;
    const valueRaw = extractXmlTag(chunk, "value");
    const value = valueRaw ? parseInt(valueRaw.replace(/[^0-9]/g, ""), 10) : undefined;

    holdings.push({
      issuerName: extractXmlTag(chunk, "nameOfIssuer"),
      titleOfClass: extractXmlTag(chunk, "titleOfClass"),
      cusip: extractXmlTag(chunk, "cusip"),
      value: isNaN(value as number) ? undefined : value,
      shrsOrPrnAmt: isNaN(shrs as number) ? undefined : shrs,
      putCall: extractXmlTag(chunk, "putCall"),
    });
  }

  // Sort by value descending
  holdings.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return holdings;
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

async function registerToolHandlers(ctx: PluginContext): Promise<void> {
  await ctx.tools.register(
    "search-filings",
    {
      displayName: "Search EDGAR Filings",
      description:
        "Full-text search SEC EDGAR filings. Filter by form type (13F-HR, 13D, S-1, 10-K, etc.) and optional date range.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query (company name, ticker, keywords, filer name, etc.)",
          },
          form_type: {
            type: "string",
            description:
              "Optional SEC form type filter (e.g. 13F-HR, 13D, S-1, 10-K, 8-K)",
          },
          start_date: {
            type: "string",
            description: "Optional start date filter (YYYY-MM-DD format)",
          },
          end_date: {
            type: "string",
            description: "Optional end date filter (YYYY-MM-DD format)",
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return (default 10)",
          },
        },
        required: ["query"],
      },
    },
    async (params: unknown, _runCtx) => {
      const p = params as { query: string; form_type?: string; start_date?: string; end_date?: string; max_results?: number };
      return searchEdgarFilings(ctx, p.query, p.form_type, p.start_date, p.end_date, p.max_results ?? 10);
    }
  );

  await ctx.tools.register(
    "get-company-filings",
    {
      displayName: "Get Company Filings",
      description:
        "Retrieve SEC filings for a company by CIK number. Returns recent filings with form type, date, and document links.",
      parametersSchema: {
        type: "object",
        properties: {
          cik: {
            type: "string",
            description:
              "SEC CIK (Central Index Key) number for the company. Can include or omit leading zeros.",
          },
          form_filter: {
            type: "string",
            description:
              "Optional form type filter (e.g. 13F-HR, 10-K, 8-K). Partial match.",
          },
          max_results: {
            type: "number",
            description: "Maximum number of filings to return (default 20)",
          },
        },
        required: ["cik"],
      },
    },
    async (params: unknown, _runCtx) => {
      const p = params as { cik: string; form_filter?: string; max_results?: number };
      return getCompanyFilings(ctx, p.cik, p.form_filter, p.max_results ?? 20);
    }
  );

  await ctx.tools.register(
    "get-13f-holdings",
    {
      displayName: "Get 13F Holdings",
      description:
        "Retrieve portfolio holdings from a 13F-HR institutional disclosure. Provide CIK to get the most recent filing, or supply a specific accession number.",
      parametersSchema: {
        type: "object",
        properties: {
          cik: {
            type: "string",
            description:
              "CIK (Central Index Key) of the institutional investment manager.",
          },
          accession_number: {
            type: "string",
            description:
              "Optional specific accession number (e.g. 0001234567-24-000123). If omitted, uses the most recent 13F-HR.",
          },
        },
        required: ["cik"],
      },
    },
    async (params: unknown, _runCtx) => {
      const p = params as { cik: string; accession_number?: string };
      return get13fHoldings(ctx, p.cik, p.accession_number);
    }
  );
}

const plugin = definePlugin({ setup: registerToolHandlers });
runWorker(plugin, import.meta.url);
