/**
 * test-resend-email.mjs
 *
 * Sends a test email via Resend to verify the API key and domain are working.
 * If the send succeeds, the domain SPF/DKIM records are correctly configured.
 * If it fails with a domain error, the DNS records need to be added.
 *
 * Usage:
 *   node scripts/test-resend-email.mjs <recipient-email>
 *
 * Example:
 *   node scripts/test-resend-email.mjs admin@educhamp.app
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const recipient = process.argv[2] || "delivered@resend.dev"; // Resend's test inbox

if (!RESEND_API_KEY) {
  console.error("❌  RESEND_API_KEY is not set.");
  process.exit(1);
}

async function main() {
  console.log(`📧  Sending test email to ${recipient} via Resend…\n`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EduChamp <noreply@educhamp.app>",
      to: [recipient],
      subject: "EduChamp DNS Verification Test",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4f46e5;">EduChamp Email Verification Test</h2>
          <p>This email was sent to verify that the <strong>educhamp.app</strong> domain is correctly configured in Resend.</p>
          <p>If you received this email, SPF and DKIM records are working correctly.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    }),
  });

  const body = await res.json();

  if (res.ok) {
    console.log("✅  Email sent successfully!");
    console.log(`    Email ID: ${body.id}`);
    console.log(`    From:     noreply@educhamp.app`);
    console.log(`    To:       ${recipient}`);
    console.log("\n    ✅  DNS records (SPF/DKIM) are correctly configured for educhamp.app.");
    console.log("    Transactional email is working.");
  } else {
    console.log("❌  Email send failed.");
    console.log(`    Status: ${res.status}`);
    console.log(`    Error:  ${JSON.stringify(body, null, 2)}`);

    if (body.message?.includes("domain") || body.name?.includes("domain")) {
      console.log("\n⚠️   Domain verification issue detected.");
      console.log("    The educhamp.app domain needs DNS records added in Resend.");
      console.log("\n    Steps:");
      console.log("    1. Go to https://resend.com/domains");
      console.log("    2. Click 'Add Domain' and enter: educhamp.app");
      console.log("    3. Copy the SPF, DKIM, and DMARC records shown");
      console.log("    4. Add them to your DNS provider (Cloudflare, Route53, etc.)");
      console.log("    5. Click 'Verify DNS Records' in Resend");
      console.log("\n    Required record types:");
      console.log("    • SPF  — TXT record at @ or mail subdomain");
      console.log("    • DKIM — TXT record at resend._domainkey.educhamp.app");
      console.log("    • DMARC — TXT record at _dmarc.educhamp.app");
      console.log("              Value: v=DMARC1; p=none; rua=mailto:dmarc@educhamp.app;");
    }
  }
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
