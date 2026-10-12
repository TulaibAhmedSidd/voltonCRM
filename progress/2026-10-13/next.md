# Next — 2026-10-13

1. **Redis / Upstash In-Memory Caching (Free Tier)**:
   - Connect Upstash Redis via Serverless REST API (`@upstash/redis` or HTTP fetch).
   - Cache frequent, read-heavy queries: Lead Board counts, Team Member lists, active settings, and rate-limiting.
   - Result: 0ms database latency for repeat views on mobile devices; stays 100% within free tier (10,000 commands/day free).

2. **Agent Ease-of-Use & Quick Actions**:
   - One-Tap Call Outcomes & Notes chips on lead cards (*"No Answer / Ringing"*, *"Customer Busy"*, *"Interested / Send Quote"*, *"Wrong Number"*).
   - One-Tap WhatsApp Click-to-Chat with pre-filled greeting and company profile.
   - Follow-up call scheduler & snooze.

3. **Manager Supervision & Ease Options**:
   - SLA Uncontacted Lead Alert: Visual badge for leads sitting >30 mins without first contact.
   - One-Tap Bulk Reassign for absent/offline agents who didn't check in today.

4. **Meta Conversions API (CAPI) Integration**:
   - CRM Server event webhook dispatching qualified lead events to Meta Dataset ID `1105656635448583`.
