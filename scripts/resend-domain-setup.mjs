/**
 * Resend domain setup script for educhamp.app
 * Adds the domain to Resend and retrieves DNS verification records.
 */

import { readFileSync } from "fs";

// Load env from .env file if present, otherwise rely on process.env
let apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  try {
    const envContent = readFileSync("/home/ubuntu/.user_env", "utf8");
    const match = envContent.match(/RESEND_API_KEY=(.+)/);
    if (match) apiKey = match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // ignore
  }
}

if (!apiKey) {
  console.error("RESEND_API_KEY not found. Cannot call Resend API.");
  process.exit(1);
}

const BASE_URL = "https://api.resend.com";

async function resendFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}

// Step 1: List existing domains to see if educhamp.app is already added
console.log("\n=== Checking existing Resend domains ===");
const listResult = await resendFetch("/domains");
if (!listResult.ok) {
  console.error("Failed to list domains:", listResult.data);
  process.exit(1);
}

const domains = listResult.data.data ?? [];
console.log("Existing domains:", domains.map((d) => `${d.name} (${d.status})`).join(", ") || "none");

let domain = domains.find((d) => d.name === "educhamp.app");

// Step 2: Add domain if not already present
if (!domain) {
  console.log("\n=== Adding educhamp.app to Resend ===");
  const addResult = await resendFetch("/domains", "POST", {
    name: "educhamp.app",
    region: "us-east-1",
  });
  if (!addResult.ok) {
    console.error("Failed to add domain:", JSON.stringify(addResult.data, null, 2));
    process.exit(1);
  }
  domain = addResult.data;
  console.log("Domain added successfully. ID:", domain.id);
} else {
  console.log(`\nDomain educhamp.app already exists (id: ${domain.id}, status: ${domain.status})`);
  // Fetch full domain details including DNS records
  const detailResult = await resendFetch(`/domains/${domain.id}`);
  if (detailResult.ok) {
    domain = detailResult.data;
  }
}

// Step 3: Print DNS records
console.log("\n=== DNS Records to add at your registrar ===\n");
const records = domain.records ?? [];
if (records.length === 0) {
  console.log("No DNS records returned. Domain status:", domain.status);
  console.log("Full response:", JSON.stringify(domain, null, 2));
} else {
  for (const rec of records) {
    console.log(`Type:     ${rec.type}`);
    console.log(`Name:     ${rec.name}`);
    console.log(`Value:    ${rec.value}`);
    if (rec.ttl) console.log(`TTL:      ${rec.ttl}`);
    if (rec.priority) console.log(`Priority: ${rec.priority}`);
    console.log(`Status:   ${rec.status}`);
    console.log("---");
  }
}

console.log("\nDomain status:", domain.status);
console.log("Domain ID:", domain.id);
