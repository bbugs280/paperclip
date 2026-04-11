# Web Search Plugin (Example)

A reference Paperclip plugin that provides `web-search` and `web-crawl` tools to agents.

- **web-search**: Search the web and get relevant results with titles, URLs, and snippets
- **web-crawl**: Fetch a URL and extract full readable article content (strips HTML/scripts)

## Features

- **Multi-provider support**: Choose between Tavily or Google Custom Search
- **Configurable limits**: Control max results per search
- **Secret management**: Uses Paperclip's secret system for API credentials
- **Error handling**: Graceful fallbacks when APIs fail

## Setup

### Option 1: Tavily (Recommended)

1. Get a free API key from [tavily.com](https://tavily.com)
2. Add the API key as a secret in Paperclip (`Instance Settings > Secrets`):
   - Name: `tavily_api_key`
   - Value: your Tavily API key
3. Edit the plugin config to set `provider: "tavily"`

### Option 2: Google Custom Search

1. Set up a Custom Search Engine at [programmablesearchengine.google.com](https://programmablesearchengine.google.com)
2. Get API credentials from [Google Cloud Console](https://console.cloud.google.com)
3. Add secrets in Paperclip:
   - `google_search_api_key`: your API key
   - `google_search_engine_id`: your search engine ID
4. Edit the plugin config to set `provider: "google"`

## Usage

Once installed, agents automatically have access to both tools:

**web-search** — Find articles and links:
```
Agent invokes web-search tool with query: "latest AI news 2026"
Tool returns: top 5 web results with URLs and snippets
```

**web-crawl** — Read full article content:
```
Agent invokes web-crawl tool with URL: "https://news.example.com/article123"
Tool returns: full readable text from the page (HTML stripped, ~8000 char limit)
```

Typical workflow:
1. Use `web-search` to find relevant articles
2. Use `web-crawl` on promising URLs to read full content
3. Agent synthesizes information from multiple sources

## Configuration

Access plugin configuration in **Instance Settings > Plugins > Web Search**:

- **Search Provider**: Choose `tavily` or `google`
- **API Key References**: Customize which secrets to use
- **Max Results**: Limit results per search (1-20)

## Development

Build the plugin:

```bash
pnpm --filter @paperclipai/plugin-web-search-example build
```

Install locally for testing:

```bash
curl -X POST http://localhost:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/path/to/plugin-web-search-example"}'
```

Watch for changes:

```bash
pnpm --filter @paperclipai/plugin-web-search-example build --watch
```

The server watches the plugin directory and restarts the worker on changes.
