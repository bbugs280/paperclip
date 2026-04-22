# FundStarter Company Todo

**Focus:** FundStarter agent company buildout — tools, plugins, agent configuration.  
**Company ID:** `211243a4-3547-44fa-bc65-308b8982f5c8`

**Last updated:** 2026-04-12 (Phase 2 complete)

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

- [ ] 

---

## Planned (Priority 2)

- [ ] 

---

## Backlog

- [ ] 

---

## Completed

- [x] Phase 2 plugin buildout complete

---

## Notes

Document FundStarter-specific work items, design decisions, and blockers here.
