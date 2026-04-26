# FundStarter Company Todo

**Focus:** FundStarter agent company buildout — tools, plugins, agent configuration.  
**Company ID:** `211243a4-3547-44fa-bc65-308b8982f5c8`

**Last updated:** 2026-04-25 (Phase 3 — routines + WhatsApp delivery complete)

---

## Plugins

| # | Plugin | Package | Status | Agents |
|---|--------|---------|--------|--------|
| P1 | Web Search + Crawl | `@paperclipai/plugin-web-search-example` | ✅ Installed (ready) | All |
| P2 | X / Twitter API | `@bbugs280/plugin-x-api` | ✅ Installed (ready) | Talent Scout (prompt done), Research Analyst (prompt todo → Phase 1) |
| P3 | Financial Data API | `@bbugs280/plugin-financial-data` | ✅ Built + Installed (ready) | Investment Strategist, Client Advisor |
| P4 | RSS Feed Reader | `@bbugs280/plugin-rss-reader` | ✅ Built + Installed (ready) | Research Analyst |
| P5 | SEC EDGAR API | `@bbugs280/plugin-sec-edgar` | ✅ Built + Installed (ready) | Research Analyst |
| P6 | HKEX Data | `plugin-hkex` (to build, low priority) | ❌ Not started | Research Analyst, Client Advisor |

### Plugin Build Notes

**P3 — plugin-financial-data**
- Path: `packages/plugins/examples/plugin-financial-data/`
- APIs: Yahoo Finance (no key), Alpha Vantage (free key), exchangerate.host (free)
- Tools: `financial-data:stock-quote`, `financial-data:currency-rate`, `financial-data:search-symbol`, `financial-data:stock-info`

**P4 — plugin-rss-reader**
- Path: `packages/plugins/examples/plugin-rss-reader/`
- API: Public RSS/Atom feeds — no keys needed
- Tools: `rss-reader:fetch-feed`, `rss-reader:fetch-multi-feeds`
- Pre-wired sources: Bloomberg, Reuters, CNBC, FT, HKEX, SCMP

**P5 — plugin-sec-edgar**
- Path: `packages/plugins/examples/plugin-sec-edgar/`
- API: SEC EDGAR public API (`efts.sec.gov`) — no key required
- Tools: `sec-edgar:search-filings`, `sec-edgar:get-13f-holdings`, `sec-edgar:get-company-filings`

**P6 — plugin-hkex** (low priority — web search covers most of this today)
- Path: `packages/plugins/examples/plugin-hkex/`
- Tools: `hkex:search-securities`, `hkex:get-news`

---

## Agent Prompt Updates

> **Important:** Only `AGENTS.md` is injected into the agent's prompt at run time.
> All tool call instructions must be **inlined in AGENTS.md** — separate .md files
> are not loaded by the agent (confirmed by failed run).

| # | Agent | Update | Phase | Status |
|---|-------|--------|-------|--------|

---

## Urgent (Priority 1)

- [ ] Add Vincent's actual portfolio holdings to `client-vincent` document in FUN-81
- [ ] Consider switching `dmPolicy` from `allowlist` → `open` so clients can reply to briefs without per-number config (see analysis: outbound works regardless, only inbound is gated)

---

## Planned (Priority 2)

- [ ] Build plugin-hkex (P6) — low priority, web search covers most today
- [ ] Add agent prompt update table entries now that all 6 agents have AGENTS.md

---

## Backlog

- [ ] Dedicated FundStarter WhatsApp number (WAHA) — only if sending from personal number becomes a problem at scale

---

## Completed

- [x] Phase 2 plugin buildout complete (P1–P5 installed)
- [x] Client Registry (FUN-81) created — permanent standing issue, Client Advisor owns it
- [x] Client document template (`client-example`) with portfolio holdings table
- [x] Portfolio Manager agent created — daily price updates, reports to Client Advisor
- [x] Backtesting Agent created — weekly accuracy scoring, reports to Investment Strategist
- [x] All 6 reporting lines set in Paperclip API
- [x] All 6 agents set to `github-copilot/gpt-5-mini`
- [x] Daily Portfolio Pricing routine — cron `30 22 * * *` (22:30 UTC = 6:30am HKT)
- [x] Weekly Backtesting Run routine — cron `0 0 * * 1` (Monday 00:00 UTC = 8am HKT)
- [x] WhatsApp delivery added to Client Advisor AGENTS.md (sends brief summary per active client)
- [x] `dmPolicy` changed to `allowlist`; `allowFrom` seeded with Vincent's number
- [x] Client `client-vincent` registered in FUN-81 (WhatsApp: +85260780428)
- [x] WhatsApp delivery tested — message confirmed delivered to Vincent

---

## Notes

Document FundStarter-specific work items, design decisions, and blockers here.
