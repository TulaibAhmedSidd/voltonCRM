import { chromium } from '@playwright/test';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Volt On CRM — Settings Administration Manual</title>
<style>
  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 11pt;
    margin: 0;
    padding: 0;
  }
  .header {
    border-bottom: 3px solid #f59e0b;
    padding-bottom: 12px;
    margin-bottom: 25px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-size: 24pt;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }
  .brand span {
    color: #f59e0b;
  }
  .doc-title {
    font-size: 14pt;
    color: #64748b;
    font-weight: 600;
  }
  .meta-strip {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 15px;
    margin-bottom: 25px;
    font-size: 9.5pt;
    display: flex;
    justify-content: space-between;
  }
  h2 {
    font-size: 15pt;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 25px;
    margin-bottom: 15px;
  }
  .card-box {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .card-box.highlight {
    border-left: 5px solid #f59e0b;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .card-title {
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 9999px;
    font-size: 8.5pt;
    font-weight: 600;
  }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #e0f2fe; color: #075985; }
  .badge-gray { background: #f1f5f9; color: #475569; }

  .subhead {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.5px;
    margin-top: 10px;
    margin-bottom: 4px;
  }
  p {
    margin: 4px 0 8px 0;
  }
  ol, ul {
    margin: 6px 0 10px 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }
  .callout {
    background: #fefce8;
    border-left: 4px solid #f59e0b;
    padding: 8px 12px;
    font-size: 9pt;
    color: #713f12;
    margin-top: 10px;
    border-radius: 0 6px 6px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    margin: 15px 0;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
  }
  th {
    background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
  }
  .page-break {
    page-break-before: always;
  }
  .footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">Volt<span>•</span>On</div>
    <div class="doc-title">Solar Energy CRM — System Administration Guide</div>
  </div>
  <div style="text-align: right; font-size: 9pt; color: #64748b;">
    <strong>Target Route:</strong> /settings<br>
    <strong>Updated:</strong> October 2026<br>
    <strong>Confidential &amp; Proprietary</strong>
  </div>
</div>

<div class="meta-strip">
  <div><strong>Audience:</strong> Super Admin, Admins, Department Managers</div>
  <div><strong>Departments Covered:</strong> Trading &amp; Installation</div>
  <div><strong>Total Settings Modules:</strong> 10 Cards</div>
</div>

<p>The <strong>Settings Hub</strong> (<code>/settings</code>) provides unified, centralized administration over CRM operations, multi-channel lead ingestion, database storage limits, official communications, and appearance styling. Below is the comprehensive operational guide for every card on the Settings page.</p>

<h2>Settings Hub Summary Matrix</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Card Title</th>
      <th>Access Level</th>
      <th>Primary Functionality</th>
      <th>Live Hub Badge</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1</strong></td>
      <td>System notifications</td>
      <td>Admin / Manager</td>
      <td>Master kill switch for all web push alerts and notifications</td>
      <td><span class="badge badge-amber">Muted</span> / <span class="badge badge-green">Active</span></td>
    </tr>
    <tr>
      <td><strong>2</strong></td>
      <td>My alerts</td>
      <td>All Users</td>
      <td>Personal subscriptions to specific employee actions and lead events</td>
      <td><span class="badge badge-blue">Custom</span></td>
    </tr>
    <tr>
      <td><strong>3</strong></td>
      <td>Proof storage</td>
      <td>Admin / Manager</td>
      <td>Cloudinary private storage monitor for call/chat proof screenshots</td>
      <td><span class="badge badge-gray">Usage Bar</span></td>
    </tr>
    <tr>
      <td><strong>4</strong></td>
      <td>Database Storage &amp; Backups</td>
      <td>Admin / Manager</td>
      <td>512 MB Atlas Cluster gauge, Google Drive OAuth 2.0, Junk cleanup</td>
      <td><span class="badge badge-amber">5.42 MB used</span></td>
    </tr>
    <tr>
      <td><strong>5</strong></td>
      <td>Google Sheets</td>
      <td>Admin / Manager</td>
      <td>60s polling sync for inbound Google Sheet rows to Trading/Install</td>
      <td><span class="badge badge-green">1 connected</span></td>
    </tr>
    <tr>
      <td><strong>6</strong></td>
      <td>Meta lead forms</td>
      <td>Admin Only</td>
      <td>Instant webhook for Facebook / Instagram Lead Ads (no Zapier)</td>
      <td><span class="badge badge-green">Connected</span></td>
    </tr>
    <tr>
      <td><strong>7</strong></td>
      <td>WhatsApp numbers</td>
      <td>Admin Only</td>
      <td>Meta Cloud API numbers with Coexistence on agent mobile phones</td>
      <td><span class="badge badge-gray">None connected</span></td>
    </tr>
    <tr>
      <td><strong>8</strong></td>
      <td>Appearance</td>
      <td>Admin Only</td>
      <td>Brand &amp; dark ink colors with automatic accessibility contrast</td>
      <td><span class="badge badge-amber">Preset</span></td>
    </tr>
    <tr>
      <td><strong>9</strong></td>
      <td>Working hours</td>
      <td>Admin Only</td>
      <td>PKT office hours, night lead holding queue, automatic checkout</td>
      <td><span class="badge badge-blue">Schedule</span></td>
    </tr>
    <tr>
      <td><strong>10</strong></td>
      <td>Users &amp; roles</td>
      <td>Super Admin / Admin</td>
      <td>Employee hierarchy, permissions, check-in eligibility, passwords</td>
      <td><span class="badge badge-gray">Link to /team</span></td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<h2>Card-by-Card Operational Guide</h2>

<!-- CARD 1 -->
<div class="card-box highlight">
  <div class="card-header">
    <div class="card-title">1. System Notifications</div>
    <span class="badge badge-amber">Master Switch</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Yeh company-wide <strong>Global Master Switch</strong> hai. Is se poore CRM ki tamaam in-app bell notifications, sound alerts aur browser Web Push notifications ko ek click me mute ya turn on kiya ja sakta hai.</p>
  
  <div class="subhead">Kab Use Karna Hai:</div>
  <ul>
    <li><strong>Bulk Lead Import:</strong> Jab hazaron historical leads Excel ya Sheet se import ki ja rahi hon, isko mute kar dein taake agents ke mobile par bar bar be-fuzool notification popups na jayein.</li>
    <li><strong>System Maintenance:</strong> Server restart ya testing ke doraan mute karein.</li>
    <li><strong>Normal Routine:</strong> Is switch ko hamesha ON rakhna chahiye taake alerts foran pohonchein.</li>
  </ul>

  <div class="subhead">Kese Configure Karein (Step-by-Step):</div>
  <ol>
    <li>Card par click karein.</li>
    <li>Checkbox <em>"Enable system notifications and push alerts"</em> ko check (ON) ya uncheck (MUTE) karein.</li>
    <li>Dark button <strong>"Save notification settings"</strong> dabayein.</li>
  </ol>
  <div class="callout"><strong>Important Rule:</strong> Mute hone ke bawajood leads ka aana, round-robin assignment aur background jobs bilkul normal chalti rehti hain; sirf screen alerts khamosh rehte hain.</div>
</div>

<!-- CARD 2 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">2. My Alerts (Personal Subscriptions)</div>
    <span class="badge badge-blue">Personal Preferences</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Har manager aur agent apni marzi se select kar sakta hai ke usko kin specific events ki notification chahiye (maslan jab new lead assign ho, customer reply kare, follow-up overdue ho, ya quotation send ho).</p>

  <div class="subhead">Kese Configure Karein (Step-by-Step):</div>
  <ol>
    <li>Card par click karein.</li>
    <li>Select karein: <em>"Everyone in my department"</em> (Managers ke liye) ya <em>"Only my leads"</em> (Agents ke liye).</li>
    <li>Jin events ke alerts chahiye unke checkboxes tick karein aur <strong>"Save alert preferences"</strong> dabayein.</li>
  </ol>
</div>

<!-- CARD 3 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">3. Proof Storage (Cloudinary Quota Monitor)</div>
    <span class="badge badge-gray">Cloudinary Free Tier</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Volt On CRM me fraud rokne ke liye har call attempt par screenshot ya audio recording proof mandatory hoti hai. Yeh proofs Cloudinary ke private encrypted cloud me save hotay hain. Yeh card live MB/GB usage monitor karta hai.</p>

  <div class="subhead">Storage Full Hone Par Kya Karein:</div>
  <ol>
    <li>Card open karke <strong>Usage Bar</strong> check karein.</li>
    <li>Storage free karne ke liye <strong>"Clear Old Proofs (Older than 90 days)"</strong> click karein.</li>
    <li>Confirm karne par Cloudinary se puraani images delete ho jayengi, jabke CRM database me call ka time, date aur remarks hamesha mehfooz rahenge.</li>
  </ol>
</div>

<!-- CARD 4 -->
<div class="card-box highlight">
  <div class="card-header">
    <div class="card-title">4. Database Storage &amp; Backups (Atlas M0 &amp; Google Drive)</div>
    <span class="badge badge-green">OAuth 2.0 &amp; M0 Monitor</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>MongoDB Atlas M0 Free Tier ka <strong>total 512 MB shared limit</strong> hota hai. Yeh module Main DB (<code>volton_crm</code>), Dev DB (<code>volton_crm_dev</code>), aur Backup DB (<code>volton_crm_backup</code>) ka combined MB size live gauge me dikhata hai. Sath hi Google Drive me direct backup upload karta hai.</p>

  <div class="subhead">Char Aham Features:</div>
  <ul>
    <li><strong>Cluster Storage Gauge:</strong> Live MB bar (e.g. <code>12.37 MB / 512 MB</code>) aur individual databases ka hissa.</li>
    <li><strong>1-Click Wipe:</strong> Dev aur Backup DB ko 1 click me khali karke Atlas space reclaim karna.</li>
    <li><strong>Google Drive Backup:</strong> Direct <code>voltonsolarenergy@gmail.com</code> ke Google Drive folder <em>VoltOn CRM Backups</em> me 15 GB free quota ke tehat automated JSON snapshots upload karna.</li>
    <li><strong>Data Pruning:</strong> Purge All Junk Leads button jo dead leads ko delete karke space bachata hai.</li>
  </ul>

  <div class="subhead">Google Drive Backup Kese Karein:</div>
  <ol>
    <li>Pehle <strong>"1-Click Connect Google Drive"</strong> dabayein aur apna Gmail allow karein.</li>
    <li>Green badge aa jayega: <strong>OAuth 2.0 Connected (15 GB Quota)</strong>.</li>
    <li>Button dabayein: <strong>"Backup All Leads to Google Drive"</strong> ya <strong>"Backup Full Database to Google Drive"</strong>. File direct Drive me save ho jayegi.</li>
  </ol>
</div>

<div class="page-break"></div>

<!-- CARD 5 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">5. Google Sheets (Inbound Lead Sync)</div>
    <span class="badge badge-green">Cron Tick: 60 Seconds</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Har 60 seconds me company ki Google Sheets se nayi leads pull karta hai. Trading aur Installation dono departments ki alag alag sheets connect ho sakti hain.</p>

  <div class="subhead">Kese Setup Karein:</div>
  <ol>
    <li>Google Sheet open karke URL se Spreadsheet ID copy karein.</li>
    <li>Card me <strong>Spreadsheet ID</strong> aur <strong>Tab Name</strong> enter karein.</li>
    <li>Department select karein (Trading ya Installation).</li>
    <li>Columns map karein (Customer Name, Phone, City, Monthly Bill/kW) aur <strong>"Save Sheet Source"</strong> click karein.</li>
  </ol>
  <div class="callout"><strong>Anti-Fraud Rule:</strong> Har lead SHA-256 fingerprint se check hoti hai; duplicate submissions existing lead ki activity timeline me add hoti hain, duplicate lead create nahi hoti.</div>
</div>

<!-- CARD 6 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">6. Meta Lead Forms (Facebook &amp; Instagram Ads)</div>
    <span class="badge badge-green">Real-time Webhook</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Facebook aur Instagram Lead Ads se aane wali leads bina kisi paid service (jaise Zapier) ke seedha <strong>2 se 3 seconds ke andar</strong> CRM me create ho kar checked-in agents ko assign ho jati hain.</p>

  <div class="subhead">Kese Setup Karein:</div>
  <ol>
    <li>Meta Business Suite me webhook URL set karein: <code>https://crm.voltonsolar.com/api/webhooks/meta-leads</code>.</li>
    <li>Settings card me Meta Form ko department ke sath map karein:
      <ul>
        <li>Rooftop Systems Form &rarr; <strong>Installation</strong></li>
        <li>Wholesale Panels Form &rarr; <strong>Trading</strong></li>
      </ul>
    </li>
  </ol>
</div>

<!-- CARD 7 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">7. WhatsApp Numbers (Meta Cloud API)</div>
    <span class="badge badge-blue">Coexistence Mode</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Company ke official WhatsApp Business API numbers connect karta hai. <strong>Coexistence Mode</strong> ke zariye number agent ke physical mobile phone par bhi chalta rehta hai jabke CRM parallel me chats aur status track karta hai.</p>
</div>

<!-- CARD 8 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">8. Appearance (Theme Customizer)</div>
    <span class="badge badge-amber">Instant Live Refresh</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Poori company ke CRM ki theme aur branding colors badalne ke liye. Presets (Volt On Gold, Emerald, Sapphire, Slate) ya Custom Color pickers provide karta hai. Built-in engine contrast khud calculate karta hai taake text hamesha saaf parha ja sake.</p>
</div>

<!-- CARD 9 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">9. Working Hours (Office Schedule &amp; Fair SLA)</div>
    <span class="badge badge-blue">Pakistan Standard Time (PKT)</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Company ke office khulne aur band hone ka time aur working days define karta hai.</p>
  <div class="subhead">Night Holding Queue Protection:</div>
  <p>Raat ko aane wali leads (e.g. 11:30 PM) ko hold kar liya jata hai aur agle din subah 9:00 AM par agents ke check-in karte hi round-robin me release kiya jata hai. Is se agents ka 15-minute response SLA be-wajah fail nahi hota.</p>
</div>

<!-- CARD 10 -->
<div class="card-box">
  <div class="card-header">
    <div class="card-title">10. Users &amp; Roles (Team Management)</div>
    <span class="badge badge-gray">Shortcut to /team</span>
  </div>
  <div class="subhead">Kia Karta Hai (Purpose):</div>
  <p>Yeh card seedha <code>/team</code> page open karta hai jahan naye users (Agents, Managers, Field Agents) add kiye jate hain, unki department assignment set hoti hai, aur round-robin me check-in eligibility toggle ki jati hai.</p>
</div>

<div class="footer">
  Volt On Solar Energy CRM &bull; Settings Administration Manual &bull; Confidential
</div>

</body>
</html>
`;

async function generatePdf() {
  const outputPath = 'd:/ReactProjects/CRMvolt/public/docs/VoltOn-CRM-Settings-Manual.pdf';
  console.log('Launching headless browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  console.log('Printing to PDF...');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm',
    },
  });
  
  await browser.close();
  console.log('PDF successfully created at:', outputPath);
}

generatePdf().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
