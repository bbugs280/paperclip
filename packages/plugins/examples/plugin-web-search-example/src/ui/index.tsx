/**
 * Web Search Plugin UI
 *
 * This plugin is tool-only and doesn't require UI components.
 * The web-search tool is automatically available to agents via the MCP bridge.
 */

export function WebSearchPluginUI() {
  return (
    <div style={{ padding: "16px" }}>
      <h2>Web Search Plugin</h2>
      <p>
        This plugin provides a <code>web-search</code> tool to agents.
      </p>
      <p>
        Configure the search provider and API credentials in Instance Settings.
      </p>
      <ul>
        <li>
          <strong>Tavily</strong> (recommended): Simpler setup, good for general web search
        </li>
        <li>
          <strong>Google Custom Search</strong>: More control, requires custom search engine setup
        </li>
      </ul>
    </div>
  );
}
