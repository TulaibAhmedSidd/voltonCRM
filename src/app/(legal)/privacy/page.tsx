import Link from 'next/link'
import { COMPANY } from '@/domain/company'

export const metadata = {
  title: 'Privacy policy',
  description: `How ${COMPANY.legalName} collects, uses and protects personal information in its customer system.`,
}

const UPDATED = '10 October 2026'

/** Public privacy policy. Required by Meta (Facebook / Instagram Lead Ads, WhatsApp Business Platform) for the app to go Live. */
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-muted-foreground">Last updated: {UPDATED}</p>
      <p>
        This policy explains how <b>{COMPANY.legalName}</b> (“Volton Solar”, “we”, “us”), {COMPANY.address}, collects, uses, shares and protects personal information when you ask us about
        solar systems — through our Facebook or Instagram forms, WhatsApp, phone, our website {COMPANY.website}, or in person — and how our staff use our customer management system
        (the “Volton CRM”).
      </p>

      <h2>1. Information we collect</h2>
      <h3>From customers and people who contact us</h3>
      <ul>
        <li>
          <b>Contact details:</b> your name, mobile number, WhatsApp number, email address, city, area and address.
        </li>
        <li>
          <b>Your enquiry:</b> the answers you give in our forms (for example the solar system size you want, where and when you plan to install it, your monthly electricity bill or units),
          and the campaign, advert or form you used.
        </li>
        <li>
          <b>Messages:</b> WhatsApp messages you send to our business numbers and our replies, including photos or documents you share. When we connect a business number that already
          runs in the WhatsApp Business app, WhatsApp may share up to the last 6 months of chats on that number and its contact names with our system, if we choose to allow it.
        </li>
        <li>
          <b>Calls and visits:</b> the date and result of our calls and chats with you (for example “interested” or “call back”) and notes our staff write. We do <b>not</b> record the audio
          of phone calls. For a site survey we may record your address, location pin, roof details and photos of the site.
        </li>
        <li>
          <b>Quotations and sales:</b> the system we quote, prices, payment terms and, if you buy, installation and after-sales details.
        </li>
      </ul>
      <h3>From our staff (users of the Volton CRM)</h3>
      <ul>
        <li>Name, username, email, phone, role and department; sign-in times, attendance (check-in / check-out) and work activity on leads.</li>
        <li>Screenshots staff upload as proof of a call or chat, and the time they left and returned to the app.</li>
        <li>Technical data needed for security: IP address and browser / device type at sign-in, and, if they turn notifications on, a device notification address.</li>
      </ul>

      <h2>2. Where the information comes from</h2>
      <ul>
        <li>
          <b>Facebook and Instagram lead forms</b> (Meta Lead Ads): when you submit one of our forms, Meta sends us the answers you entered.
        </li>
        <li>
          <b>WhatsApp</b> (WhatsApp Business Platform by Meta): when you message one of our business numbers.
        </li>
        <li>
          <b>You directly</b> — by phone, at our office or during a site visit — and our own spreadsheets of enquiries.
        </li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To contact you about your enquiry, answer your questions and send you quotations.</li>
        <li>To arrange site surveys, installation, net-metering paperwork and after-sales service.</li>
        <li>To assign your enquiry to a member of staff, follow up at the times you prefer, and check the quality of our service (for example that you were really contacted).</li>
        <li>To keep accounts and records, prevent fraud and misuse, and meet our legal obligations.</li>
      </ul>
      <p>We use your information only for these purposes. We do not sell it, and we do not use it for unrelated advertising.</p>

      <h2>4. Information from Meta (Facebook, Instagram, WhatsApp)</h2>
      <p>
        Information we receive through Meta’s products — lead form answers and WhatsApp messages — is used <b>only</b> to communicate with you about your enquiry and the services you ask for.
        We do not sell it, share it with data brokers, or use it to build profiles for other purposes. We follow the Meta Platform Terms, the WhatsApp Business Terms and the WhatsApp Business
        Messaging Policy. You can stop WhatsApp messages from us at any time by replying <b>STOP</b> or by blocking our number.
      </p>

      <h2>5. Who we share it with</h2>
      <p>Only with service providers that run our system for us, under contract, and only as needed:</p>
      <ul>
        <li>Meta Platforms (WhatsApp Business Platform, Facebook / Instagram Lead Ads) — to receive your enquiries and exchange messages with you.</li>
        <li>MongoDB Atlas (database hosting), Vercel (application hosting) and Cloudinary (storage of photos and documents).</li>
        <li>Google (spreadsheets we use to collect enquiries) and the notification services of Google, Apple and Mozilla (to alert our staff on their devices).</li>
      </ul>
      <p>We may also disclose information when the law requires it, or to protect our rights, our customers or our staff.</p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>Enquiries that do not become a sale: up to 24 months after our last contact with you.</li>
        <li>Customers: for as long as needed for warranty, after-sales service and our accounts (normally up to 5 years after installation).</li>
        <li>Proof screenshots: cleared regularly, and at the latest when the enquiry record is deleted.</li>
        <li>Staff accounts: while the person works with us, and up to 12 months after.</li>
      </ul>
      <p>After that we delete the information or make it anonymous.</p>

      <h2>7. How we protect it</h2>
      <ul>
        <li>All connections use encryption (HTTPS). Passwords are stored as one-way hashes; access keys to Meta are kept encrypted.</li>
        <li>Each staff member has a personal login and sees only the enquiries they need (agents see only their own leads; managers see their department).</li>
        <li>Important actions — assigning, deleting, exporting — are logged.</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>
        You can ask us to tell you what information we hold about you, to correct it, or to delete it, and you can withdraw your consent to be contacted at any time. See{' '}
        <Link href="/data-deletion">how to ask us to delete your data</Link>. We reply within 30 days.
      </p>

      <h2>9. Where it is stored</h2>
      <p>Our service providers may store information on servers outside Pakistan. They protect it under their own security and privacy commitments.</p>

      <h2>10. Children</h2>
      <p>Our services are for adults. We do not knowingly collect information from anyone under 18.</p>

      <h2>11. Changes</h2>
      <p>We may update this policy. The date at the top shows the latest version.</p>

      <h2>12. Contact us</h2>
      <p>
        {COMPANY.legalName}, {COMPANY.address}
        <br />
        Phone / WhatsApp: <a href={`tel:${COMPANY.whatsapp}`}>{COMPANY.phone}</a>
        <br />
        Email: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
    </>
  )
}
