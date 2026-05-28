/**
 * check-resend-dns.mjs
 *
 * Checks the Resend domain verification status for educhamp.app
 * and prints the required DNS records if the domain is not yet verified.
 *
 * Usage:
 *   node scripts/check-resend-dns.mjs
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error("❌  RESEND_API_KEY is not set.");
  process.exit(1);
}

async function main() {
  console.log("🔍  Fetching domains from Resend…\n");

  const res = await fetch("https://api.resend.com/domains", {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌  Resend API error (${res.status}): ${body}`);
    process.exit(1);
  }

  const { data: domains } = await res.json();

  if (!domains || domains.length === 0) {
    console.log("⚠️   No domains found in your Resend account.");
    console.log("    Add educhamp.app at https://resend.com/domains");
    return;
  }

  const target = domains.find(
    (d) => d.name === "educhamp.app" || d.name.endsWith(".educhamp.app")
  );

  if (!target) {
    console.log("⚠️   educhamp.app is NOT registered in Resend.");
    console.log("    Go to https://resend.com/domains → Add Domain → enter: educhamp.app");
    console.log("    Then re-run this script to see the required DNS records.\n");
    console.log("    All domains registered:");
    domains.forEach((d) => console.log(`    • ${d.name} (${d.status})`));
    return;
  }

  console.log(`📧  Domain: ${target.name}`);
  console.log(`    Status: ${target.status}`);
  console.log(`    Region: ${target.region ?? "us-east-1"}\n`);

  if (target.status === "verified") {
    console.log("✅  Domain is fully verified. Transactional email is live.");
    return;
  }

  console.log("⚠️   Domain is NOT verified. Add the following DNS records:\n");

  if (target.records && target.records.length > 0) {
    console.log("┌─────────────────────────────────────────────────────────────────────────────────┐");
    console.log("│  Required DNS Records                                                           │");
    console.log("├──────────┬──────────────────────────────┬──────────────────────────────────────┤");
    console.log("│  Type    │  Name                        │  Value                               │");
    console.log("├──────────┼──────────────────────────────┼──────────────────────────────────────┤");
    for (const rec of target.records) {
      const type  = (rec.type  ?? "").padEnd(8);
      const name  = (rec.name  ?? "").substring(0, 28).padEnd(28);
      const value = (rec.value ?? "").substring(0, 36).padEnd(36);
      console.log(`│  ${type}  │  ${name}  │  ${value}  │`);
    }
    console.log("└──────────┴──────────────────────────────┴──────────────────────────────────────┘");
    console.log("\n    Full record values (for copy-paste):");
    for (const rec of target.records) {
      console.log(`\n    [${rec.type}] ${rec.name}`);
      console.log(`    Value: ${rec.value}`);
      if (rec.ttl) console.log(`    TTL:   ${rec.ttl}`);
      if (rec.priority) console.log(`    Priority: ${rec.priority}`);
    }
  } else {
    console.log("    No record details returned by Resend API.");
    console.log("    Log in to https://resend.com/domains to see the required records.");
  }

  console.log("\n    After adding the records, click 'Verify DNS Records' in the Resend dashboard.");
  console.log("    Verification typically completes within 5–30 minutes.\n");
  console.log("    Also add a DMARC record (start with p=none to monitor):");
  console.log("    [TXT] _dmarc.educhamp.app");
  console.log("    Value: v=DMARC1; p=none; rua=mailto:dmarc@educhamp.app;");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
