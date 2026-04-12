import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginContext, ToolResult } from "@paperclipai/plugin-sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface FinancialDataConfig {
  alphavantageApiKeyRef?: string;
}

async function getConfig(ctx: PluginContext): Promise<FinancialDataConfig> {
  const raw = await ctx.config.get();
  return (raw ?? {}) as FinancialDataConfig;
}

// ---------------------------------------------------------------------------
// Yahoo Finance helpers
// ---------------------------------------------------------------------------

const YF_BASE = "https://query1.finance.yahoo.com";
const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; FundStarter/1.0)",
  Accept: "application/json",
};

interface YFQuoteResult {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  currency?: string;
  exchangeName?: string;
  quoteType?: string;
  regularMarketTime?: number;
}

interface YFSummaryResult {
  symbol: string;
  sector?: string;
  industry?: string;
  longBusinessSummary?: string;
  trailingPE?: number;
  forwardPE?: number;
  trailingEps?: number;
  dividendYield?: number;
  targetMeanPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  fullTimeEmployees?: number;
  website?: string;
  country?: string;
}

async function fetchYFQuote(
  ctx: PluginContext,
  symbol: string
): Promise<YFQuoteResult | null> {
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=false`;
  const resp = await ctx.http.fetch(url, { method: "GET", headers: YF_HEADERS });
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          symbol?: string;
          shortName?: string;
          regularMarketPrice?: number;
          previousClose?: number;
          regularMarketVolume?: number;
          marketCap?: number;
          fiftyTwoWeekLow?: number;
          fiftyTwoWeekHigh?: number;
          currency?: string;
          exchangeName?: string;
          instrumentType?: string;
          regularMarketTime?: number;
        };
      }>;
      error?: { code: string; description: string };
    };
  };
  if (data.chart?.error) return null;
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = meta.regularMarketPrice ?? 0;
  const prev = meta.previousClose ?? price;
  const change = price - prev;
  const changePct = prev !== 0 ? (change / prev) * 100 : 0;
  return {
    symbol: meta.symbol ?? symbol.toUpperCase(),
    shortName: meta.shortName,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketVolume: meta.regularMarketVolume,
    marketCap: meta.marketCap,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    currency: meta.currency,
    exchangeName: meta.exchangeName,
    quoteType: meta.instrumentType,
    regularMarketTime: meta.regularMarketTime,
  };
}

async function fetchYFSummary(
  ctx: PluginContext,
  symbol: string
): Promise<YFSummaryResult | null> {
  const modules =
    "summaryProfile,financialData,defaultKeyStatistics,assetProfile";
  const url = `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  const resp = await ctx.http.fetch(url, { method: "GET", headers: YF_HEADERS });
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    quoteSummary?: {
      result?: Array<{
        summaryProfile?: {
          sector?: string;
          industry?: string;
          longBusinessSummary?: string;
          fullTimeEmployees?: number;
          website?: string;
          country?: string;
        };
        financialData?: {
          currentPrice?: { raw?: number };
          targetMeanPrice?: { raw?: number };
          targetHighPrice?: { raw?: number };
          targetLowPrice?: { raw?: number };
          recommendationKey?: string;
          numberOfAnalystOpinions?: { raw?: number };
          earningsGrowth?: { raw?: number };
          revenueGrowth?: { raw?: number };
        };
        defaultKeyStatistics?: {
          trailingEps?: { raw?: number };
          forwardEps?: { raw?: number };
          trailingPE?: { raw?: number };
          forwardPE?: { raw?: number };
          dividendYield?: { raw?: number };
        };
      }>;
      error?: { code: string; description: string };
    };
  };
  if (data.quoteSummary?.error) return null;
  const r = data.quoteSummary?.result?.[0];
  if (!r) return null;
  return {
    symbol: symbol.toUpperCase(),
    sector: r.summaryProfile?.sector,
    industry: r.summaryProfile?.industry,
    longBusinessSummary: r.summaryProfile?.longBusinessSummary,
    fullTimeEmployees: r.summaryProfile?.fullTimeEmployees,
    website: r.summaryProfile?.website,
    country: r.summaryProfile?.country,
    trailingPE: r.defaultKeyStatistics?.trailingPE?.raw,
    forwardPE: r.defaultKeyStatistics?.forwardPE?.raw,
    trailingEps: r.defaultKeyStatistics?.trailingEps?.raw,
    dividendYield: r.defaultKeyStatistics?.dividendYield?.raw
      ? (r.defaultKeyStatistics.dividendYield.raw * 100)
      : undefined,
    targetMeanPrice: r.financialData?.targetMeanPrice?.raw,
    targetHighPrice: r.financialData?.targetHighPrice?.raw,
    targetLowPrice: r.financialData?.targetLowPrice?.raw,
    recommendationKey: r.financialData?.recommendationKey,
    numberOfAnalystOpinions: r.financialData?.numberOfAnalystOpinions?.raw,
  };
}

async function searchYFSymbol(
  ctx: PluginContext,
  query: string
): Promise<Array<{ symbol: string; shortName: string; exchange: string; quoteType: string }>> {
  const url = `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0&enableFuzzyQuery=false&enableCb=false`;
  const resp = await ctx.http.fetch(url, { method: "GET", headers: YF_HEADERS });
  if (!resp.ok) return [];
  const data = (await resp.json()) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      quoteType?: string;
    }>;
  };
  return (data.quotes ?? [])
    .filter((q) => q.symbol && q.quoteType !== "OPTION")
    .slice(0, 10)
    .map((q) => ({
      symbol: q.symbol!,
      shortName: q.shortname ?? q.longname ?? "",
      exchange: q.exchange ?? "",
      quoteType: q.quoteType ?? "",
    }));
}

// ---------------------------------------------------------------------------
// Currency rate helper (open.er-api.com — free, no key)
// ---------------------------------------------------------------------------

interface ERApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc?: string;
}

async function fetchCurrencyRates(
  ctx: PluginContext,
  base: string,
  targets: string[]
): Promise<{ base: string; rates: Record<string, number>; updatedAt?: string } | null> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base.toUpperCase())}`;
  const resp = await ctx.http.fetch(url, {
    method: "GET",
    headers: { "User-Agent": "FundStarter/1.0" },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as ERApiResponse;
  if (data.result !== "success") return null;
  const filteredRates: Record<string, number> = {};
  for (const t of targets) {
    const key = t.toUpperCase();
    if (data.rates[key] !== undefined) {
      filteredRates[key] = data.rates[key];
    }
  }
  return { base: data.base_code, rates: filteredRates, updatedAt: data.time_last_update_utc };
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function stockQuote(
  ctx: PluginContext,
  params: { symbol: string }
): Promise<ToolResult> {
  const { symbol } = params;
  if (!symbol?.trim()) {
    return { content: "Error: symbol is required." };
  }
  const q = await fetchYFQuote(ctx, symbol.trim().toUpperCase());
  if (!q) {
    return { content: `Could not retrieve quote for "${symbol}". Check the symbol and try again.`,
    };
  }
  const lines: string[] = [
    `## ${q.symbol}${q.shortName ? ` — ${q.shortName}` : ""}`,
    `**Price**: ${q.regularMarketPrice?.toFixed(2) ?? "N/A"} ${q.currency ?? ""}`,
    `**Change**: ${q.regularMarketChange !== undefined ? (q.regularMarketChange >= 0 ? "+" : "") + q.regularMarketChange.toFixed(2) : "N/A"} (${q.regularMarketChangePercent !== undefined ? (q.regularMarketChangePercent >= 0 ? "+" : "") + q.regularMarketChangePercent.toFixed(2) + "%" : "N/A"})`,
    `**Volume**: ${q.regularMarketVolume?.toLocaleString() ?? "N/A"}`,
    `**Market Cap**: ${q.marketCap ? (q.marketCap / 1e9).toFixed(2) + "B " + (q.currency ?? "") : "N/A"}`,
    `**52-Week Range**: ${q.fiftyTwoWeekLow?.toFixed(2) ?? "N/A"} – ${q.fiftyTwoWeekHigh?.toFixed(2) ?? "N/A"}`,
    `**Exchange**: ${q.exchangeName ?? "N/A"}`,
    `**Quote Type**: ${q.quoteType ?? "N/A"}`,
  ];
  if (q.regularMarketTime) {
    lines.push(`**As of**: ${new Date(q.regularMarketTime * 1000).toUTCString()}`);
  }
  return { content: lines.join("\n") };
}

async function stockInfo(
  ctx: PluginContext,
  params: { symbol: string }
): Promise<ToolResult> {
  const { symbol } = params;
  if (!symbol?.trim()) {
    return { content: "Error: symbol is required." };
  }
  const s = await fetchYFSummary(ctx, symbol.trim().toUpperCase());
  if (!s) {
    return { content: `Could not retrieve info for "${symbol}". Check the symbol and try again.`,
    };
  }
  const lines: string[] = [
    `## ${s.symbol} — Company Info`,
    `**Sector**: ${s.sector ?? "N/A"}`,
    `**Industry**: ${s.industry ?? "N/A"}`,
    `**Country**: ${s.country ?? "N/A"}`,
    `**Employees**: ${s.fullTimeEmployees?.toLocaleString() ?? "N/A"}`,
    `**Website**: ${s.website ?? "N/A"}`,
    "",
    `### Valuation`,
    `**Trailing P/E**: ${s.trailingPE?.toFixed(2) ?? "N/A"}`,
    `**Forward P/E**: ${s.forwardPE?.toFixed(2) ?? "N/A"}`,
    `**Trailing EPS**: ${s.trailingEps?.toFixed(2) ?? "N/A"}`,
    `**Dividend Yield**: ${s.dividendYield !== undefined ? s.dividendYield.toFixed(2) + "%" : "N/A"}`,
    "",
    `### Analyst Consensus (${s.numberOfAnalystOpinions ?? 0} analysts)`,
    `**Recommendation**: ${s.recommendationKey?.toUpperCase() ?? "N/A"}`,
    `**Target (mean)**: ${s.targetMeanPrice?.toFixed(2) ?? "N/A"}`,
    `**Target range**: ${s.targetLowPrice?.toFixed(2) ?? "N/A"} – ${s.targetHighPrice?.toFixed(2) ?? "N/A"}`,
  ];
  if (s.longBusinessSummary) {
    lines.push("", `### Business`, s.longBusinessSummary.slice(0, 600) + (s.longBusinessSummary.length > 600 ? "…" : ""));
  }
  return { content: lines.join("\n") };
}

async function searchSymbol(
  ctx: PluginContext,
  params: { query: string }
): Promise<ToolResult> {
  const { query } = params;
  if (!query?.trim()) {
    return { content: "Error: query is required." };
  }
  const results = await searchYFSymbol(ctx, query.trim());
  if (results.length === 0) {
    return { content: `No symbols found for "${query}".` };
  }
  const lines = [`## Symbol Search: "${query}"`, ""];
  for (const r of results) {
    lines.push(
      `- **${r.symbol}** — ${r.shortName} (${r.exchange}, ${r.quoteType})`
    );
  }
  return { content: lines.join("\n") };
}

async function currencyRate(
  ctx: PluginContext,
  params: { base: string; targets: string[] }
): Promise<ToolResult> {
  const { base, targets } = params;
  if (!base?.trim()) {
    return { content: "Error: base currency is required." };
  }
  const targetList =
    targets?.length > 0
      ? targets.map((t) => t.trim().toUpperCase()).filter(Boolean)
      : ["USD", "HKD", "EUR", "GBP", "JPY", "CNY", "SGD", "AUD"];

  const result = await fetchCurrencyRates(ctx, base.trim().toUpperCase(), targetList);
  if (!result) {
    return { content: `Could not retrieve exchange rates for "${base}". Check the currency code and try again.`,
    };
  }
  const lines = [
    `## Exchange Rates: ${result.base}`,
    result.updatedAt ? `*Updated: ${result.updatedAt}*` : "",
    "",
  ];
  for (const [code, rate] of Object.entries(result.rates)) {
    lines.push(`**${code}**: ${rate.toFixed(6)}`);
  }
  return { content: lines.filter((l) => l !== undefined).join("\n") };
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

async function registerToolHandlers(ctx: PluginContext): Promise<void> {
  await ctx.tools.register(
    "stock-quote",
    {
      displayName: "Stock Quote",
      description:
        "Get real-time trading price, change, volume, market cap, and 52-week range for a ticker symbol.",
      parametersSchema: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Ticker symbol (e.g. AAPL, MSFT, 0700.HK, BRK-B)",
          },
        },
        required: ["symbol"],
      },
    },
    async (params: unknown, _runCtx) => {
      return stockQuote(ctx, params as { symbol: string });
    }
  );

  await ctx.tools.register(
    "stock-info",
    {
      displayName: "Stock Info",
      description:
        "Get company fundamentals: sector, industry, P/E, EPS, dividend yield, analyst consensus, and business description.",
      parametersSchema: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Ticker symbol (e.g. AAPL, 0700.HK)",
          },
        },
        required: ["symbol"],
      },
    },
    async (params: unknown, _runCtx) => {
      return stockInfo(ctx, params as { symbol: string });
    }
  );

  await ctx.tools.register(
    "search-symbol",
    {
      displayName: "Search Symbol",
      description:
        "Search for stock ticker symbols by company name, keyword, or partial name.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Company name or keyword to search (e.g. 'Tencent', 'Apple', 'BHP')",
          },
        },
        required: ["query"],
      },
    },
    async (params: unknown, _runCtx) => {
      return searchSymbol(ctx, params as { query: string });
    }
  );

  await ctx.tools.register(
    "currency-rate",
    {
      displayName: "Currency Rate",
      description:
        "Get current exchange rates from a base currency to one or more target currencies.",
      parametersSchema: {
        type: "object",
        properties: {
          base: {
            type: "string",
            description: "Base currency code (e.g. USD, HKD, EUR)",
          },
          targets: {
            type: "array",
            items: { type: "string" },
            description:
              "List of target currency codes. Defaults to [USD, HKD, EUR, GBP, JPY, CNY, SGD, AUD] if omitted.",
          },
        },
        required: ["base"],
      },
    },
    async (params: unknown, _runCtx) => {
      return currencyRate(ctx, params as { base: string; targets: string[] });
    }
  );
}

const plugin = definePlugin({ setup: registerToolHandlers });
runWorker(plugin, import.meta.url);
