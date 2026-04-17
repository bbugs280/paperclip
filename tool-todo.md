# FundStarter Tool Buildout — Todo

**Last updated:** 2026-04-12 (Phase 2 complete)  
**Company:** FundStarter (`211243a4-3547-44fa-bc65-308b8982f5c8`)

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
| A1 | Talent Scout (5da4ff53) | X API tools inline in AGENTS.md | Phase 1 | ✅ Done |
| A2 | Research Analyst (0960a9d4) | Add X API (x-api:x-search per expert) | Phase 1 | ✅ Done |
| A3 | Investment Strategist (7b14ebde) | Add web-search verification section | Phase 1 | ✅ Done |
| A4 | Client Advisor (fb763109) | Add HK web-search research section | Phase 1 | ✅ Done |
| A5 | Research Analyst (0960a9d4) | Add RSS feed tool section | Phase 2 (after P4) | ✅ Done |
| A6 | Research Analyst (0960a9d4) | Add SEC EDGAR section | Phase 2 (after P5) | ✅ Done |
| A7 | Investment Strategist (7b14ebde) | Upgrade verification with financial-data plugin | Phase 2 (after P3) | ✅ Done |
| A8 | Client Advisor (fb763109) | Upgrade HK research with financial-data + hkex plugins | Phase 2 (after P3/P6) | ✅ Done (financial-data; P6/hkex still low priority) |

---

## Phase Summary

### Phase 1 — Quick Wins (no new plugins, working on now)
- [x] A1 — Talent Scout X tools
- [x] A2 — Research Analyst X tools
- [x] A3 — Investment Strategist verification tools (web search)
- [x] A4 — Client Advisor HK research tools (web search)

### Phase 2 — New Plugins (COMPLETE)
- [x] P3 — plugin-financial-data (built, installed, ID: b04ea985)
- [x] P4 — plugin-rss-reader (built, installed, ID: c476defc)
- [x] P5 — plugin-sec-edgar (built, installed, ID: 52789d53)
- [ ] P6 — plugin-hkex (low priority — web search covers most of this)
- [x] A5 — Research Analyst: rss-reader:fetch-finance-feeds (step 2)
- [x] A6 — Research Analyst: sec-edgar:search-filings + get-13f-holdings (step 5)
- [x] A7 — Investment Strategist: financial-data:stock-quote + stock-info + search-symbol
- [x] A8 — Client Advisor: financial-data:stock-quote (HKD ticker) + currency-rate (USD/HKD)

### Out of Scope (for now)
- Email / notification tool for daily brief delivery
