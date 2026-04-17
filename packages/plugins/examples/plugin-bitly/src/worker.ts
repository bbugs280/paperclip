import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const DEFAULT_CONFIG = {
  accessTokenRef: "bitly_access_token",
};

const BITLY_API = "https://api-ssl.bitly.com/v4";

function normalizeBitlink(raw: string): string {
  return raw.replace(/^https?:\/\//, "");
}

const plugin = definePlugin({
  async setup(ctx) {
    const config = await ctx.config.get() as { accessTokenRef?: string };
    const tokenRef = config?.accessTokenRef ?? DEFAULT_CONFIG.accessTokenRef;

    async function getToken(): Promise<string | null> {
      try {
        return await ctx.secrets.resolve(tokenRef);
      } catch {
        return null;
      }
    }

    ctx.tools.register(
      "bitly-shorten",
      {
        displayName: "Shorten URL",
        description: "Create a Bitly short link for a long URL. Returns the short link.",
        parametersSchema: {
          type: "object",
          properties: {
            longUrl: { type: "string", description: "The long URL to shorten" },
            title: { type: "string", description: "Optional title/label for the link" },
          },
          required: ["longUrl"],
        },
      },
      async (params) => {
        const token = await getToken();
        if (!token) return { error: "Bitly access token not configured. Set secret 'bitly_access_token'." };
        const p = params as { longUrl: string; title?: string };
        try {
          const body: Record<string, unknown> = { long_url: p.longUrl };
          if (p.title) body.title = p.title;
          const resp = await ctx.http.fetch(`${BITLY_API}/shorten`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!resp.ok) {
            const errBody = await resp.text();
            return { error: `Bitly API error ${resp.status}: ${errBody}` };
          }
          const data = await resp.json() as { link: string; id: string; long_url: string };
          return {
            content: `Short link created: ${data.link} → ${data.long_url}`,
            data: { shortLink: data.link, bitlinkId: data.id, longUrl: data.long_url },
          };
        } catch (err) {
          return { error: `Bitly request failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    );

    ctx.tools.register(
      "bitly-get-link-clicks",
      {
        displayName: "Get Link Clicks",
        description: "Get total click count for a Bitly short link over a time period",
        parametersSchema: {
          type: "object",
          properties: {
            bitlink: { type: "string", description: "The Bitly short link, e.g. bit.ly/abc123" },
            units: { type: "number", description: "Number of time units to look back (default: 7)" },
            unit: { type: "string", description: "Time unit: minute, hour, day, week, month (default: day)" },
          },
          required: ["bitlink"],
        },
      },
      async (params) => {
        const token = await getToken();
        if (!token) return { error: "Bitly access token not configured. Set secret 'bitly_access_token'." };
        const p = params as { bitlink: string; units?: number; unit?: string };
        const bitlink = normalizeBitlink(p.bitlink);
        const units = p.units ?? 7;
        const unit = p.unit ?? "day";
        const url = `${BITLY_API}/bitlinks/${encodeURIComponent(bitlink)}/clicks?unit=${unit}&units=${units}&rollup=true`;
        try {
          const resp = await ctx.http.fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
          if (!resp.ok) {
            const body = await resp.text();
            return { error: `Bitly API error ${resp.status}: ${body}` };
          }
          const data = await resp.json() as { link_clicks: number };
          return {
            content: `${bitlink}: ${data.link_clicks} total clicks (last ${units} ${unit}s)`,
            data,
          };
        } catch (err) {
          return { error: `Bitly request failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    );

    ctx.tools.register(
      "bitly-get-link-summary",
      {
        displayName: "Get Link Summary",
        description: "Get full stats summary for a Bitly link: clicks by day, referrers, and top countries",
        parametersSchema: {
          type: "object",
          properties: {
            bitlink: { type: "string", description: "The Bitly short link, e.g. bit.ly/abc123" },
            units: { type: "number", description: "Number of days to look back (default: 7)" },
          },
          required: ["bitlink"],
        },
      },
      async (params) => {
        const token = await getToken();
        if (!token) return { error: "Bitly access token not configured. Set secret 'bitly_access_token'." };
        const p = params as { bitlink: string; units?: number };
        const bitlink = normalizeBitlink(p.bitlink);
        const units = p.units ?? 7;
        try {
          const [clicksResp, referrersResp, countriesResp] = await Promise.all([
            ctx.http.fetch(`${BITLY_API}/bitlinks/${encodeURIComponent(bitlink)}/clicks?unit=day&units=${units}&rollup=false`, { method: "GET", headers: { Authorization: `Bearer ${token}` } }),
            ctx.http.fetch(`${BITLY_API}/bitlinks/${encodeURIComponent(bitlink)}/referrers?unit=day&units=${units}`, { method: "GET", headers: { Authorization: `Bearer ${token}` } }),
            ctx.http.fetch(`${BITLY_API}/bitlinks/${encodeURIComponent(bitlink)}/countries?unit=day&units=${units}`, { method: "GET", headers: { Authorization: `Bearer ${token}` } }),
          ]);
          const clicks = clicksResp.ok ? await clicksResp.json() as { link_clicks: Array<{ date: string; clicks: number }> } : null;
          const referrers = referrersResp.ok ? await referrersResp.json() as { referrers: Array<{ value: string; clicks: number }> } : null;
          const countries = countriesResp.ok ? await countriesResp.json() as { metrics: Array<{ value: string; clicks: number }> } : null;
          const totalClicks = clicks?.link_clicks?.reduce((s, d) => s + d.clicks, 0) ?? 0;
          const dailyLines = (clicks?.link_clicks ?? []).slice(-7).map((d) => `  ${d.date}: ${d.clicks}`).join("\n");
          const topReferrers = (referrers?.referrers ?? []).slice(0, 5).map((r) => `  ${r.value || "(direct)"}: ${r.clicks}`).join("\n");
          const topCountries = (countries?.metrics ?? []).slice(0, 5).map((c) => `  ${c.value}: ${c.clicks}`).join("\n");
          const content = [
            `## Bitly Summary: ${bitlink} (last ${units} days)`,
            `**Total clicks:** ${totalClicks}`,
            `**Daily breakdown:**\n${dailyLines || "  (no data)"}`,
            `**Top referrers:**\n${topReferrers || "  (no data)"}`,
            `**Top countries:**\n${topCountries || "  (no data)"}`,
          ].join("\n\n");
          return { content, data: { totalClicks, clicks: clicks?.link_clicks, referrers: referrers?.referrers, countries: countries?.metrics } };
        } catch (err) {
          return { error: `Bitly request failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    );
  },

  async onHealth() {
    return { status: "ok", message: "Bitly plugin worker is running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
