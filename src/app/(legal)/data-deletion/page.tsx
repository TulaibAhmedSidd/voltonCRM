import Link from 'next/link'
import { COMPANY } from '@/domain/company'

export const metadata = {
  title: 'Data deletion',
  description: `How to ask ${COMPANY.legalName} to delete your personal information.`,
}

/** Public data-deletion instructions. Meta asks for this link ("Data deletion instructions URL"). */
export default function DataDeletionPage() {
  const text = encodeURIComponent('Assalam o Alaikum, please delete my data from Volton Solar. My name: ___ · My phone number: ___')
  return (
    <>
      <h1>Delete your data</h1>
      <p>
        You can ask <b>{COMPANY.legalName}</b> to delete the personal information we hold about you — for example details you sent through our Facebook or Instagram forms, or WhatsApp chats
        with our business numbers.
      </p>

      <h2>How to ask</h2>
      <ol>
        <li>
          Send us a message on WhatsApp to <a href={`https://wa.me/${COMPANY.whatsapp.replace(/\D/g, '')}?text=${text}`}>{COMPANY.phone}</a>, or an email to{' '}
          <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Delete my data')}`}>{COMPANY.email}</a>, with the subject “Delete my data”.
        </li>
        <li>Tell us your name and the phone number you used with us, so we can find your records.</li>
        <li>We may ask you to confirm the request from that phone number, to protect you from someone else asking in your name.</li>
      </ol>

      <h2>What happens next</h2>
      <ul>
        <li>
          Within <b>30 days</b> we delete your name, phone numbers, email, address, form answers, messages, photos and notes from our customer system, and we stop contacting you.
        </li>
        <li>We confirm on WhatsApp or by email when it is done.</li>
        <li>
          If you are already our customer, we may keep what the law requires for accounts and warranty (for example an invoice), but only for that purpose and only for as long as required.
        </li>
      </ul>

      <h2>Stop messages only</h2>
      <p>
        If you only want us to stop messaging you, reply <b>STOP</b> on WhatsApp or block our number — we will not contact you again.
      </p>

      <p>
        More details: <Link href="/privacy">Privacy policy</Link>.
      </p>
    </>
  )
}
