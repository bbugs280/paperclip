import React from "react";

export default function SecEdgarPluginUI() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h2>SEC EDGAR Plugin</h2>
      <p>Provides the following tools to Paperclip agents:</p>
      <ul>
        <li>
          <strong>sec-edgar:search-filings</strong> — Full-text search SEC
          EDGAR filings by company name, ticker, or keyword. Filter by form
          type (13F-HR, 10-K, S-1, 13D, etc.) and date range.
        </li>
        <li>
          <strong>sec-edgar:get-company-filings</strong> — Look up all SEC
          filings for a company by CIK number. Returns recent filings with
          form type, date, and document links.
        </li>
        <li>
          <strong>sec-edgar:get-13f-holdings</strong> — Retrieve portfolio
          holdings from a 13F-HR institutional disclosure. Find the largest
          positions held by hedge funds and investment managers.
        </li>
      </ul>
      <p>
        <em>No API key required.</em> Uses SEC EDGAR public APIs (
        <code>efts.sec.gov</code> and <code>data.sec.gov</code>).
      </p>
    </div>
  );
}
