import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "sec-edgar",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "SEC EDGAR",
  description:
    "Query the SEC EDGAR public API. Search full-text filings, retrieve 13F institutional holdings disclosures, and look up a company's filing history by CIK.",
  author: "bbugs280",
  categories: ["connector"],
  capabilities: ["agent.tools.register", "http.outbound"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui/",
  },
  tools: [
    {
      name: "search-filings",
      displayName: "Search EDGAR Filings",
      description:
        "Full-text search EDGAR for filings matching a query. Filter by form type (13F-HR, 13D, S-1, 10-K, etc.) and date range.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          form_type: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          max_results: { type: "number" },
        },
        required: ["query"],
      },
    },
    {
      name: "get-13f-holdings",
      displayName: "Get 13F Holdings",
      description:
        "Retrieve the portfolio holdings from a 13F-HR filing. Provide the accession number or CIK to get the latest filing.",
      parametersSchema: {
        type: "object",
        properties: {
          cik: { type: "string" },
          accession_number: { type: "string" },
        },
        required: ["cik"],
      },
    },
    {
      name: "get-company-filings",
      displayName: "Get Company Filings",
      description:
        "Retrieve all SEC filings for a company by CIK number. Returns the most recent filings with form type, date, and document links.",
      parametersSchema: {
        type: "object",
        properties: {
          cik: { type: "string" },
          form_filter: { type: "string" },
          max_results: { type: "number" },
        },
        required: ["cik"],
      },
    },
  ],
};

export default manifest;
