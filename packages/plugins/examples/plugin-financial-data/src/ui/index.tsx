import React from "react";

export default function FinancialDataPluginUI() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h2>Financial Data Plugin</h2>
      <p>Provides the following tools to Paperclip agents:</p>
      <ul>
        <li>
          <strong>financial-data:stock-quote</strong> — Real-time price, change,
          volume, market cap, and 52-week range via Yahoo Finance
        </li>
        <li>
          <strong>financial-data:stock-info</strong> — Company fundamentals:
          sector, P/E, EPS, dividend yield, analyst target
        </li>
        <li>
          <strong>financial-data:search-symbol</strong> — Find ticker symbols by
          company name or keyword
        </li>
        <li>
          <strong>financial-data:currency-rate</strong> — Live FX rates (USD,
          HKD, EUR, GBP, …) via open.er-api.com
        </li>
      </ul>
      <p>
        <em>No API key required for Yahoo Finance or currency rates.</em> An
        optional Alpha Vantage key can be configured in plugin settings for
        enhanced fundamental data.
      </p>
    </div>
  );
}
