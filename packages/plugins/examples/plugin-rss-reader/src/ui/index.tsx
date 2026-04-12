import React from "react";

export default function RssReaderPluginUI() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h2>RSS Reader Plugin</h2>
      <p>Provides the following tools to Paperclip agents:</p>
      <ul>
        <li>
          <strong>rss-reader:fetch-feed</strong> — Fetch any RSS or Atom feed
          URL and return recent items with title, link, date, and summary
        </li>
        <li>
          <strong>rss-reader:fetch-finance-feeds</strong> — Fetch a curated
          bundle of financial/market news feeds (MarketWatch, Bloomberg, CNBC, FT,
          SCMP, Seeking Alpha, Nikkei Asia) in parallel, merged and sorted
          newest-first
        </li>
      </ul>
      <p>
        <em>No API key required.</em> All feeds are public RSS/Atom sources.
      </p>
    </div>
  );
}
