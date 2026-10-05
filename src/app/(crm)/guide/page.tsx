import Image from 'next/image'
import { MapPin, ShieldAlert, Smartphone, Zap } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata = { title: 'App Guide & Manual' }

export default function GuidePage() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="App Guide & Walkthrough"
        description="Complete step-by-step instructions for Employees (Call & Field Agents) and Managers in English and Urdu."
      />

      <Tabs defaultValue="urdu" className="w-full">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <span className="text-sm font-medium text-muted-foreground">Select Language / زبان منتخب کریں:</span>
          <TabsList className="bg-muted">
            <TabsTrigger value="urdu" className="font-semibold">اردو (Urdu)</TabsTrigger>
            <TabsTrigger value="english" className="font-semibold">English</TabsTrigger>
          </TabsList>
        </div>

        {/* ── URDU GUIDE ── */}
        <TabsContent value="urdu" className="space-y-6 pt-4 text-right" dir="rtl">
          {/* Section: Call Agents */}
          <SectionCard title="1. کال ایجنٹس کے لیے مکمل طریقہ کار (Call Agents Guide)" description="ہر روز لیڈز وصول کرنے، کال کرنے اور ڈیل کلوز کرنے کے بنیادی اقدامات">
            <div className="space-y-6 text-sm text-foreground">
              {/* Step 1 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۱</span>
                  <h3 className="font-bold text-base">صبح حاضری لگائیں (Check-in)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  صبح دفتر پہنچتے ہی ڈیش بورڈ پر <strong>Check in</strong> کا بٹن دبائیں۔ جب تک آپ چیک ان نہیں ہوں گے، سسٹم آپ کو نئی لیڈز اسائن نہیں کرے گا۔ اگر کھانے کا وقفہ یا نماز کا وقت ہو تو <strong>Start break</strong> دبائیں۔
                </p>
                <div className="flex items-center gap-2 pe-9 pt-1">
                  <StatusBadge label="حاضر (Checked in)" tone="success" size="sm" />
                  <StatusBadge label="وقفہ (On break)" tone="warning" size="sm" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۲</span>
                  <h3 className="font-bold text-base">نئی لیڈ قبول کریں (Accept Lead within 5 Minutes)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  جب سسٹم راؤنڈ رابن (Round-Robin) کے تحت آپ کو لیڈ دے گا تو ڈیش بورڈ پر پیلے رنگ میں <strong>Accept [Lead No]</strong> کا بڑا بٹن آئے گا۔ گاہک کا فون نمبر اس وقت تک چھپا رہتا ہے جب تک آپ <strong>Accept</strong> کا بٹن نہیں دباتے۔ ۵ منٹ کے اندر قبول کرنا ضروری ہے، ورنہ لیڈ اگلے ایجنٹ کے پاس چلی جائے گی۔
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۳</span>
                  <h3 className="font-bold text-base">واٹس ایپ یا فون کال شروع کریں (Tap WhatsApp / Call)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  لیڈ اوپن کریں اور <strong>WhatsApp</strong> یا <strong>Phone call</strong> کا بٹن دبائیں۔ 
                  <br />
                  <strong className="text-tone-danger-soft-foreground">اہم اصول (اینٹی فراڈ):</strong> بٹن دبانے کا ٹائم سرور خود ریکارڈ کرتا ہے۔ آپ واٹس ایپ پر کسٹمر سے بات کریں، اور بات ختم ہونے کے بعد واپس CRM ایپ پر آئیں۔ ایپ سے کم از کم ۳۰ سیکنڈ دور رہنا ضروری ہے ورنہ کال فیک سمجھی جائے گی۔
                </p>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۴</span>
                  <h3 className="font-bold text-base">کال کا نتیجہ اور اسکرین شاٹ محفوظ کریں (Log Outcome & Screenshot)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  بات کے بعد نیچے سے فارم کھلے گا:
                  <br />• <strong>کال کا رزلٹ منتخب کریں:</strong> ملا (Connected)، نمبر بند ہے (Number off)، مصروف ہے (Busy)، یا جواب نہیں آیا (No answer)۔
                  <br />• <strong>گاہک کا جواب:</strong> دلچسپی رکھتا ہے (Interested)، ڈیل ہو گئی (Deal won)، یا دلچسپی نہیں (Not interested)۔
                  <br />• <strong>اسکرین شاٹ ثبوت:</strong> واٹس ایپ چیٹ یا کال لاگ کا تازہ اسکرین شاٹ اپلوڈ کریں۔ پرانا یا ری یوز کیا گیا اسکرین شاٹ سسٹم پکڑ لیتا ہے۔
                </p>
              </div>

              {/* Step 5 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۵</span>
                  <h3 className="font-bold text-base">ڈیل فائنل ہونے پر (Deal Done & Manager Approval)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  اگر کسٹمر نے سسٹم فائنل کر لیا ہو تو <strong>Deal won</strong> منتخب کریں اور کل رقم درج کریں۔ یہ ڈیل فوراً مینجر کے <strong>Proof Review</strong> باکس میں جائے گی۔ جب مینجر آپ کا اپلوڈ کیا گیا ثبوت اور کوٹیشن اوکے کرے گا، تب آپ کی سیلز کاؤنٹ ہوگی۔
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Section: Field Agents */}
          <SectionCard title="2. فیلڈ ایجنٹس کے لیے طریقہ کار (Field Agents Guide)" description="سائٹ سروے اور آؤٹ ڈور وزٹس کا طریقہ کار">
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-tone-installation" />
                  <h3 className="font-bold text-base">کم ترین کلو واٹ (Least active kW) پر وزٹ کی تقسیم</h3>
                </div>
                <p className="text-muted-foreground">
                  سسٹم خود بخود سائٹ وزٹ اس فیلڈ ایجنٹ کو دیتا ہے جس کے پاس اس وقت سب سے کم کلو واٹ (kW) کے وزٹ پینڈنگ ہوں۔
                </p>
                <ol className="list-decimal list-inside space-y-1 pe-2 text-muted-foreground">
                  <li>صبح چیک ان کریں۔</li>
                  <li><strong>Site visits</strong> مینو میں جا کر اپنا مقررہ وزٹ، کسٹمر کا پتہ اور لوکیشن دیکھیں۔</li>
                  <li>سائٹ سروے مکمل کرنے کے بعد نتیجہ اور تفصیل درج کریں تاکہ کوٹیشن تیار کی جا سکے۔</li>
                </ol>
              </div>
            </div>
          </SectionCard>

          {/* Section: Managers */}
          <SectionCard title="3. مینجرز کے لیے مکمل گائیڈ (Managers Guide)" description="ٹیم مانیٹرنگ، آٹو اسائن ٹوگل اور ثبوت کی منظوری">
            <div className="space-y-6 text-sm text-foreground">
              {/* Picture of Manager Dashboard */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">ڈیش بورڈ کا منظر (Manager Dashboard Overview)</h3>
                <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
                  <Image
                    src="/guide/manager-dashboard.png"
                    alt="Volt On Manager Dashboard"
                    width={1000}
                    height={600}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  تصویر: مینجر ڈیش بورڈ پر ویٹنگ لیڈز، ٹیم کی حاضری اور اوپر آٹو اسائن ٹوگل دیکھا جا سکتا ہے۔
                </p>
              </div>

              {/* Auto Assign Toggle Feature */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-tone-brand" />
                  <h3 className="font-bold text-base">ڈیش بورڈ پر آٹو اسائن ٹوگل (Auto-Assign Leads Toggle)</h3>
                </div>
                <p className="text-muted-foreground">
                  آپ کے ڈیش بورڈ پر <strong>Auto-assign leads</strong> کا نیا سوئچ دیا گیا ہے:
                </p>
                <div className="space-y-2 pe-3 text-muted-foreground">
                  <p>
                    🟢 <strong>جب ٹوگل آن (Active) ہو:</strong> تمام نئی لیڈز اور قطار میں رکی ہوئی لیڈز خود بخود حاضر ایجنٹس کو مل جائیں گی، مینجر کی مینوئل مداخلت کے بغیر۔
                  </p>
                  <p>
                    🟡 <strong>جب ٹوگل آف (Manual) ہو:</strong> لیڈز <strong>Waiting for assignment</strong> باکس میں رک جائیں گی تاکہ مینجر خود دیکھ کر مرضی کے ایجنٹ کو دے سکے۔
                  </p>
                </div>
              </div>

              {/* Review Queue */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-5 text-tone-danger" />
                  <h3 className="font-bold text-base">پروف ریویو (Proof Review)</h3>
                </div>
                <p className="text-muted-foreground">
                  مین بار میں <strong>Proof review</strong> میں جائیں:
                  <br />• جو ایجنٹ لیڈ بند کرے (Deal Won, Dead, Not interested) وہ آپ کی منظوری کا منتظر ہوتا ہے۔
                  <br />• مشکوک کالز (بہت جلدی لاگ کی گئی، یا جعلی اسکرین شاٹ) ریڈ فلیگ کے ساتھ سب سے اوپر نظر آتی ہیں۔
                  <br />• <strong>Mark OK</strong> کرنے پر سیلز منظور ہو جاتی ہے، جبکہ <strong>Dispute</strong> کرنے پر لیڈ دوبارہ کسی اور ایجنٹ کو دی جا سکتی ہے۔
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Section: Mobile App Install */}
          <SectionCard title="4. موبائل ایپ انسٹالیشن (Install App on Phone)" description="اینڈرائیڈ اور آئی فون پر ہوم اسکرین پر لگانے کا آسان طریقہ">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Smartphone className="size-4 text-tone-info" /> اینڈرائیڈ (Android)
                </h4>
                <p className="text-muted-foreground">
                  کروم براؤزر میں ایپ کھولیں، پیلے رنگ کے بینر پر <strong>Install app</strong> دبائیں، یا اوپر تین نقطوں پر کلک کر کے <strong>Add to Home screen</strong> منتخب کریں۔
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Smartphone className="size-4 text-tone-brand" /> آئی فون (iPhone)
                </h4>
                <p className="text-muted-foreground">
                  سفاری (Safari) براؤزر میں ایپ کھولیں، نیچے شیئر (Share) کا بٹن دبائیں اور لسٹ میں سے <strong>Add to Home Screen</strong> پر کلک کریں۔ ایپ بغیر براؤزر بار کے فل اسکرین چلے گی۔
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── ENGLISH GUIDE ── */}
        <TabsContent value="english" className="space-y-6 pt-4 text-left" dir="ltr">
          {/* Section: Call Agents */}
          <SectionCard title="1. Call Agents Step-by-Step Guide" description="Daily shift workflow from check-in to lead closure">
            <div className="space-y-6 text-sm text-foreground">
              {/* Step 1 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">1</span>
                  <h3 className="font-bold text-base">Shift Check-In</h3>
                </div>
                <p className="text-muted-foreground ps-9">
                  Upon starting your day, tap the <strong>Check in</strong> button on your dashboard. You will only receive leads when checked in. Use <strong>Start break</strong> during lunch or prayer intervals.
                </p>
                <div className="flex items-center gap-2 ps-9 pt-1">
                  <StatusBadge label="Checked in" tone="success" size="sm" />
                  <StatusBadge label="On break" tone="warning" size="sm" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">2</span>
                  <h3 className="font-bold text-base">Accept Lead within 5 Minutes</h3>
                </div>
                <p className="text-muted-foreground ps-9">
                  When a lead is routed to you via round-robin, a prominent amber <strong>Accept [Lead No]</strong> button appears on your dashboard. Customer phone numbers remain masked until accepted. You have 5 minutes to accept before the lead bounces to the next agent.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">3</span>
                  <h3 className="font-bold text-base">Contact Customer (Tap WhatsApp / Call)</h3>
                </div>
                <p className="text-muted-foreground ps-9">
                  Open the lead and tap <strong>WhatsApp</strong> or <strong>Phone call</strong>.
                  <br />
                  <strong className="text-tone-danger-soft-foreground">Anti-fraud rule:</strong> The server records the exact tap timestamp. Conduct your call or WhatsApp conversation, then return to the CRM. The system requires at least 30 seconds away from the app for connected calls.
                </p>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">4</span>
                  <h3 className="font-bold text-base">Log Outcome & Upload Proof</h3>
                </div>
                <p className="text-muted-foreground ps-9">
                  Fill the two-tap outcome sheet:
                  <br />• <strong>Call Result:</strong> Connected, Busy, Number off, or No answer.
                  <br />• <strong>Customer Response:</strong> Interested, Deal won, or Not interested.
                  <br />• <strong>Screenshot Proof:</strong> Upload a fresh screenshot of the call log or WhatsApp conversation. Reused screenshots will be flagged automatically.
                </p>
              </div>

              {/* Step 5 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">5</span>
                  <h3 className="font-bold text-base">Closing Deals (Manager Approval)</h3>
                </div>
                <p className="text-muted-foreground ps-9">
                  When a deal is finalized, select <strong>Deal won</strong> and enter the PKR value. The lead enters the manager&apos;s Proof Review queue and will count toward your sales numbers once approved by your manager.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Section: Field Agents */}
          <SectionCard title="2. Field Agents Guide" description="Site surveys and outdoor visits">
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-tone-installation" />
                  <h3 className="font-bold text-base">Least Active kW Dispatch</h3>
                </div>
                <p className="text-muted-foreground">
                  The system automatically dispatches site visits to the checked-in field agent with the lowest active kW load.
                </p>
                <ol className="list-decimal list-inside space-y-1 ps-2 text-muted-foreground">
                  <li>Check in every morning.</li>
                  <li>Go to <strong>Site visits</strong> to view customer addresses, Google Maps locations, and requirements.</li>
                  <li>Log site measurements, roof type, and site survey photos to finalize quotes.</li>
                </ol>
              </div>
            </div>
          </SectionCard>

          {/* Section: Managers */}
          <SectionCard title="3. Managers Guide" description="Team live board, auto-assign toggle, and review approvals">
            <div className="space-y-6 text-sm text-foreground">
              {/* Picture of Manager Dashboard */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Manager Dashboard Overview</h3>
                <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
                  <Image
                    src="/guide/manager-dashboard.png"
                    alt="Volt On Manager Dashboard"
                    width={1000}
                    height={600}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Manager Dashboard showing waiting leads, team attendance, and the Auto-assign leads toggle.
                </p>
              </div>

              {/* Auto Assign Toggle */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-tone-brand" />
                  <h3 className="font-bold text-base">Auto-Assign Leads Toggle</h3>
                </div>
                <p className="text-muted-foreground">
                  Located directly on your dashboard:
                </p>
                <div className="space-y-2 ps-3 text-muted-foreground">
                  <p>
                    🟢 <strong>When ON (Active):</strong> All new incoming leads and queued leads are automatically distributed in round-robin order to checked-in agents without requiring manager intervention.
                  </p>
                  <p>
                    🟡 <strong>When OFF (Manual):</strong> Leads pause in the <strong>Waiting for assignment</strong> box so you can manually review and assign them to specific agents.
                  </p>
                </div>
              </div>

              {/* Proof Review Queue */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-5 text-tone-danger" />
                  <h3 className="font-bold text-base">Proof Review Queue</h3>
                </div>
                <p className="text-muted-foreground">
                  Navigate to <strong>Proof review</strong> in the main navigation:
                  <br />• Inspect closed deals and verify screenshots.
                  <br />• Closes made by agents require manager approval before sales credit is tallied.
                  <br />• Click <strong>Mark OK</strong> to approve or <strong>Dispute</strong> to re-assign the lead.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Section: App Installation */}
          <SectionCard title="4. Mobile PWA Installation" description="How to add the app to Android and iOS home screens">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Smartphone className="size-4 text-tone-info" /> Android Devices
                </h4>
                <p className="text-muted-foreground">
                  Open Chrome, tap the yellow <strong>Install app</strong> button at the top banner, or open the browser menu (⋮) and tap <strong>Install app / Add to Home screen</strong>.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Smartphone className="size-4 text-tone-brand" /> iPhone / iPad
                </h4>
                <p className="text-muted-foreground">
                  Open Safari, tap the <strong>Share</strong> button (square with arrow), scroll down and select <strong>Add to Home Screen</strong>. It runs standalone like a native app.
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
