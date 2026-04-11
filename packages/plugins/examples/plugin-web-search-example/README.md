# Web Search Plugin for Paperclip

[![npm version](https://img.shields.io/npm/v/@bbugs280/plugin-web-search-example)](https://www.npmjs.com/package/@bbugs280/plugin-web-search-example)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

A powerful Paperclip plugin that extends AI agents with **web search** and **web article extraction** capabilities.

- **`web-search`** — Search the web using Tavily or Google Custom Search, get ranked results with titles, URLs, and snippets
- **`web-crawl`** — Fetch any publicly accessible URL and extract readable article text (removes HTML, scripts, navigation clutter)

Perfect for agents that need to research, verify information, or gather current data during task execution.

## Quick Start

### Installation

```bash
# Install the plugin into your Paperclip instance
npm install @bbugs280/plugin-web-search-example
```

Or in the **Paperclip UI**:
1. Go to **Instance Settings > Plugins**
2. Click **Install Plugin**
3. Enter: `@bbugs280/plugin-web-search-example`

### Configure Your Search Provider

Choose between two search backends — both are free tier available.

#### Option 1: Tavily Search (Recommended)

1. **Get a free API key:**
   - Visit [tavily.com](https://tavily.com)
   - Sign up and copy your API key

2. **Add the secret to Paperclip:**
   - Go to **Instance Settings > Secrets**
   - Click **Add Secret**
   - Name: `tavily_api_key`
   - Value: paste your key

3. **Configure the plugin:**
   - Go to **Instance Settings > Plugins > Web Search**
   - Set **Search Provider** to `tavily`
   - Leave API key reference as `tavily_api_key`

#### Option 2: Google Custom Search

1. **Set up a Custom Search Engine:**
   - Visit [programmablesearchengine.google.com](https://programmablesearchengine.google.com)
   - Create a new search engine (customize to search "the entire web")
   - Copy your **Search Engine ID**

2. **Get API credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable **Custom Search API**
   - Create an **API Key** (restriction: Custom Search API)

3. **Add secrets to Paperclip:**
   - Go to **Instance Settings > Secrets**
   - Add two secrets:
     - Name: `google_search_api_key` → Value: your API Key
     - Name: `google_search_engine_id` → Value: your Search Engine ID

4. **Configure the plugin:**
   - Go to **Instance Settings > Plugins > Web Search**
   - Set **Search Provider** to `google`
   - Verify API key and engine ID references match your secret names

## Tool Reference

### `web-search`

Search the web and retrieve ranked results.

**Parameters:**
- `query` (string, required) — Search query (e.g., "latest AI breakthroughs 2026")
- `maxResults` (number, optional) — Maximum results to return (1-20, default: 5)

**Response:**
```json
{
  "content": "title: Example News Article\nurl: https://example.com/article\nsnippet: First 200 chars of page content...\n\n..."
}
```

**Example:**
```javascript
// Agent calls:
await toolDispatcher.executeTool(
  "web-search:web-search",
  { query: "Paperclip AI agent framework", maxResults: 5 },
  runContext
);

// Returns top 5 results with summaries and URLs
```

### `web-crawl`

Fetch a URL and extract readable article text.

**Parameters:**
- `url` (string, required) — Full URL to crawl (e.g., "https://example.com/article")

**Response:**
```json
{
  "content": "Full readable text from the page, HTML stripped, ~8000 character limit..."
}
```

**Example:**
```javascript
// Agent calls:
await toolDispatcher.executeTool(
  "web-search:web-crawl",
  { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  runContext
);

// Returns extracted article text suitable for agent processing
```

## Usage Patterns

### Pattern 1: Research & Synthesis
```
Agent task: "Summarize the latest advancements in AI for 2026"
1. web-search("AI advancements 2026", maxResults=10)
   → Gets top URLs and summaries
2. web-crawl(top_url_from_results)
   → Reads full article
3. Synthesize findings into summary
```

### Pattern 2: Fact Verification
```
Agent task: "Verify if Company X released Product Y on Date Z"
1. web-search("Company X Product Y release Date Z")
   → Checks if news exists
2. web-crawl(official_announcement_url)
   → Verifies details from source
```

### Pattern 3: Current Data Gathering
```
Agent task: "Get today's stock price for TECH"
1. web-search("TECH stock price today")
   → Gets current financial data
2. web-crawl(financial_website)
   → Extracts latest quotes
```

## Configuration

Edit plugin settings in **Instance Settings > Plugins > Web Search**:

| Setting | Default | Description |
|---------|---------|-------------|
| **Search Provider** | `tavily` | Which API to use: `tavily` or `google` |
| **Max Results Per Search** | 5 | Max results returned (1-20) |
| **Tavily API Key Ref** | `tavily_api_key` | Secret name for Tavily key |
| **Google API Key Ref** | `google_search_api_key` | Secret name for Google key |
| **Google Engine ID Ref** | `google_search_engine_id` | Secret name for Search Engine ID |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Failed to fetch: HTTP 403` | Site blocks automated requests | Try a different URL or search for different sources |
| `Invalid API key` | Secret not configured correctly | Verify secret name and value in Instance Settings |
| `Tool not found` | Plugin not installed | Install plugin and restart server |

## Development

### Local Setup

```bash
# Clone repo
git clone https://github.com/paperclipai/paperclip.git
cd paperclip

# Install dependencies
pnpm install

# Build plugin
pnpm --filter @bbugs280/plugin-web-search-example build

# Watch mode (rebuilds on file changes)
pnpm --filter @bbugs280/plugin-web-search-example build --watch
```

### Install Locally for Testing

```bash
# Start dev server
pnpm dev

# In another terminal, install plugin from local path
curl -X POST http://localhost:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "/Users/home/paperclip/packages/plugins/examples/plugin-web-search-example",
    "isLocalPath": true
  }'
```

The dev server watches `dist/` changes and auto-restarts the plugin worker.

### Testing Tools

```bash
# Test web-search tool
curl -X POST http://localhost:3100/api/plugins/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web-search:web-search",
    "parameters": { "query": "test query", "maxResults": 3 },
    "runContext": {
      "agentId": "test-agent",
      "runId": "test-run",
      "companyId": "test-company",
      "projectId": "test-project"
    }
  }'

# Test web-crawl tool
curl -X POST http://localhost:3100/api/plugins/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web-search:web-crawl",
    "parameters": { "url": "https://example.com" },
    "runContext": {
      "agentId": "test-agent",
      "runId": "test-run",
      "companyId": "test-company",
      "projectId": "test-project"
    }
  }'
```

## Architecture

- **Manifest** (`src/manifest.ts`) — Plugin metadata, tool declarations,configuration schema
- **Worker** (`src/worker.ts`) — Tool handlers, API calls, text extraction logic
- **UI** (`src/ui/index.tsx`) — Plugin info page (minimal in this example)

## Limitations

- **Web crawl** is limited to ~8000 characters of readable text per page
- **Wikipedia** and some sites block automated requests (returns HTTP 403)
- **Search results** vary by provider; Tavily is generally more comprehensive
- **Requires internet access** — plugin must be able to make outbound HTTPS requests

## Contributing

Found a bug or want a feature? Open an issue or PR on GitHub.

## License

MIT

## Support

- **Paperclip Docs:** [docs](https://github.com/paperclipai/paperclip/tree/master/docs)
- **Plugin SDK:** [@paperclipai/plugin-sdk](https://github.com/paperclipai/paperclip/tree/master/packages/plugins/sdk)
- **Issues:** [GitHub Issues](https://github.com/paperclipai/paperclip/issues)
