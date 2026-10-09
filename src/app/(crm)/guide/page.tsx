import Image from 'next/image'
import { PlayCircle, Video } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata = { title: 'App Guide & Video Walkthrough' }

export default function GuidePage() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="App Guide & Video Walkthrough"
        description="Comprehensive video walkthroughs, screenshots, and step-by-step operational manuals for Managers and Employees in English and Urdu."
      />

      {/* ── VIDEO WALKTHROUGH SECTION ── */}
      <SectionCard
        title="Video Walkthroughs with Urdu Explanation / ویڈیو رہنمائی اردو میں"
        description="Watch slow, step-by-step video explanations of the entire system architecture, workflows, and anti-fraud rules."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Manager Video Card */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <Video className="size-5 text-tone-brand" aria-hidden />
                <h3 className="font-heading font-semibold text-base">Manager Video Guide (اردو)</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Super Admin setup, Trading & Installation managers, password reset, agent creation, round-robin team rotation & WhatsApp API overview.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
                <video
                  controls
                  preload="metadata"
                  className="h-full w-full object-contain"
                  poster="/guide/walkthrough/03_superadmin_dashboard.png"
                >
                  <source src="/guide/volton-crm-manager-guide-urdu.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Duration: ~3 mins</span>
                <span className="font-medium text-foreground">Urdu Voiceover (سلو وضاحت)</span>
              </div>
            </div>
          </div>

          {/* Employee Video Card */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <Video className="size-5 text-tone-brand" aria-hidden />
                <h3 className="font-heading font-semibold text-base">Employee & Call Agent Guide (اردو)</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                First login, mandatory password reset, shift check-in, 5-minute lead accept window, masked phone calls, proof logging & pipeline scroll.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
                <video
                  controls
                  preload="metadata"
                  className="h-full w-full object-contain"
                  poster="/guide/walkthrough/24_employee_dashboard_unaccepted_lead.png"
                >
                  <source src="/guide/volton-crm-employee-guide-urdu.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Duration: ~2.5 mins</span>
                <span className="font-medium text-foreground">Urdu Voiceover (سلو وضاحت)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Full Video */}
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-medium text-sm">Looking for the Complete Master Guide? / مکمل جامع ویڈیو</h4>
              <p className="text-xs text-muted-foreground">
                Includes both Manager and Employee walkthroughs plus upcoming WhatsApp Cloud API features in one full video.
              </p>
            </div>
            <a
              href="/guide/volton-crm-complete-guide-urdu.mp4"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <PlayCircle className="size-4" />
              Open Complete Video (6.5 MB)
            </a>
          </div>
        </div>
      </SectionCard>

      {/* ── UPCOMING WHATSAPP API SECTION ── */}
      <SectionCard
        title="WhatsApp Cloud API Integration (What Unlocks Upon Connection)"
        description="The official Meta WhatsApp Cloud API credentials will connect our business phone number. Here is what becomes active:"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-tone-brand/10 text-tone-brand font-bold text-sm">
              01
            </div>
            <h4 className="font-semibold text-sm">Automated Meta CTWA Lead Ingestion</h4>
            <p className="text-xs text-muted-foreground">
              When customer clicks your Facebook/Instagram Click-to-WhatsApp ads, their lead is ingested into the CRM within seconds with referral campaign, ad ID, and headline.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-tone-brand/10 text-tone-brand font-bold text-sm">
              02
            </div>
            <h4 className="font-semibold text-sm">Live 2-Way Chat Inside CRM</h4>
            <p className="text-xs text-muted-foreground">
              Agents chat with customers directly inside the CRM web app using the official company number. No personal phones or WhatsApp Web needed.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-tone-brand/10 text-tone-brand font-bold text-sm">
              03
            </div>
            <h4 className="font-semibold text-sm">Instant Template Auto-Responses</h4>
            <p className="text-xs text-muted-foreground">
              Instant welcome greetings, quotation PDFs, and smart follow-up templates delivered via verified Meta API without any manual delay.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-tone-brand/10 text-tone-brand font-bold text-sm">
              04
            </div>
            <h4 className="font-semibold text-sm">Lead Protection & Anti-Fraud Audit</h4>
            <p className="text-xs text-muted-foreground">
              Customer phone numbers stay safely masked and transcripts stored in company database, preventing lead leakage or private bypassing.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── STEP-BY-STEP VISUAL MANUAL TABS (EN / UR) ── */}
      <Tabs defaultValue="urdu" className="w-full">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <span className="text-sm font-medium text-muted-foreground">Select Manual Language / زبان منتخب کریں:</span>
          <TabsList className="bg-muted">
            <TabsTrigger value="urdu" className="font-semibold">اردو (Urdu)</TabsTrigger>
            <TabsTrigger value="english" className="font-semibold">English</TabsTrigger>
          </TabsList>
        </div>

        {/* ── URDU MANUAL ── */}
        <TabsContent value="urdu" className="space-y-6 pt-4 text-right" dir="rtl">
          {/* Urdu Section 1: Super Admin & Managers */}
          <SectionCard title="۱. مینیجر اور سپر ایڈمن کا مکمل طریقہ کار (Manager Workflow)" description="شعبہ جاتی مینیجرز بنانے، پاس ورڈ ری سیٹ، اور ٹیم سیٹ اپ کے تفصیلی اقدامات">
            <div className="space-y-6 text-sm">
              {/* Step 1 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۱</span>
                  <h3 className="font-bold text-base">سپر ایڈمن لاگ ان اور ڈیش بورڈ</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  سپر ایڈمن (کمپنی اونر) لاگ ان کرتا ہے۔ ڈیش بورڈ پر فوری ایکشن ٹائلز، کے پی آئیز اور آٹو اسائن کا ٹوگل بٹن موجود ہے جس سے خودکار تفویض کو کنٹرول کیا جاتا ہے۔
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/03_superadmin_dashboard.png" alt="Super Admin Dashboard" fill className="object-contain" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۲</span>
                  <h3 className="font-bold text-base">ٹریڈنگ اور انسٹالیشن مینیجرز کا اندراج (Company Admin)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  سپر ایڈمن <strong>Company admin</strong> پر جا کر ٹریڈنگ ڈیپارٹمنٹ کے لیے مینیجر (حمزہ فاروق) اور انسٹالیشن ڈیپارٹمنٹ کے لیے مینیجر (زبیر خان) بناتا ہے اور عارضی پاس ورڈ فراہم کرتا ہے۔ ہر مینیجر صرف اپنے ہی شعبے کی لیڈز اور عملے کو دیکھ سکتا ہے۔
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/05_create_trading_manager_form.png" alt="Create Trading Manager" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/08_both_managers_created.png" alt="Both Managers Active" fill className="object-contain" />
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۳</span>
                  <h3 className="font-bold text-base">مینیجر کا پہلا لاگ ان اور لازمی پاس ورڈ تبدیلی (Forced Reset)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  جب مینیجر پہلی بار دیے گئے عارضی پاس ورڈ سے لاگ ان کرتا ہے، تو سسٹم فوری طور پر پاس ورڈ تبدیل کرنے کا تقاضا کرتا ہے۔ یہ اینٹی فراڈ سیکیورٹی کا اصول ہے تاکہ کمپنی میں کسی کا پاس ورڈ ایڈمن کو بھی معلوم نہ ہو۔
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/10_manager_forced_password_reset.png" alt="Manager Forced Password Reset" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/12_trading_manager_dashboard.png" alt="Manager Scoped Dashboard" fill className="object-contain" />
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۴</span>
                  <h3 className="font-bold text-base">کال ایجنٹس کا اندراج اور ٹیم روٹیشن (Settings & Team)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  مینیجر <strong>Settings</strong> میں جا کر اپنے شعبے کے لیے کال ایجنٹ (جیسے بلال احمد) شامل کرتا ہے۔ پھر <strong>Team</strong> اسکرین پر راؤنڈ رابن روٹیشن آرڈر، مینیجر ونڈو اور ۵ منٹ کا قبولیت ٹائمر سیٹ کرتا ہے۔
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/14_manager_add_call_agent_form.png" alt="Add Agent Form" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/16_manager_team_order_and_timings.png" alt="Team Order & Timings" fill className="object-contain" />
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۵</span>
                  <h3 className="font-bold text-base">کوئیک لیڈ اندراج اور ایجنٹ تفویض (Quick Add & Assign)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  فون کال یا واٹس ایپ پر آنے والی نئی لیڈ کا مینیجر <strong>Add lead</strong> بٹن کے ذریعے فوری اندراج کرتا ہے اور اسے متعلقہ ایجنٹ کو تفویض کر سکتا ہے۔ ایجنٹ کے کلوز کرنے پر وہ مینیجر کے پروف ریویو میں جائے گی۔
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/17_manager_quick_add_lead_dialog.png" alt="Quick Add Lead" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/20_manager_assigned_lead_to_agent.png" alt="Assigned to Agent" fill className="object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Urdu Section 2: Call Agents */}
          <SectionCard title="۲. کال ایجنٹس کا روزمرہ طریقہ کار (Employee / Agent Workflow)" description="ڈیوٹی چیک ان، ۵ منٹ کا لیڈ ٹائمر، فون ماسکنگ، کال لاگ اور پائپ لائن">
            <div className="space-y-6 text-sm">
              {/* Step 1 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۱</span>
                  <h3 className="font-bold text-base">پہلا لاگ ان اور اپنا خفیہ پاس ورڈ سیٹ کرنا</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  ایجنٹ پہلی بار اپنے دیے گئے عارضی پاس ورڈ سے لاگ ان کرتا ہے اور فوراً اپنا نیا خفیہ پاس ورڈ سیٹ کرتا ہے۔ یہ پاس ورڈ کسی کے ساتھ شیئر نہ کریں۔
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/22_employee_forced_password_reset.png" alt="Employee Forced Password Reset" fill className="object-contain" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۲</span>
                  <h3 className="font-bold text-base">صبح شفٹ کا آغاز (Check-In Button)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  ڈیش بورڈ پر <strong>Check in</strong> کا بٹن دبائیں۔ بغیر چیک ان کے سسٹم آپ کو ڈیوٹی پر نہیں سمجھے گا اور آپ کو کوئی بھی نئی لیڈ موصول نہیں ہوگی۔
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/25_employee_checked_in_active_shift.png" alt="Employee Checked In" fill className="object-contain" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۳</span>
                  <h3 className="font-bold text-base">نئی لیڈ قبول کریں (۵ منٹ کی الٹی گنتی)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  جب آپ کو لیڈ ملتی ہے تو ڈیش بورڈ پر ۵ منٹ کا ٹائمر شروع ہوتا ہے۔ <strong>Accept [Lead No]</strong> کا بٹن دبائیں ورنہ لیڈ اگلے ایجنٹ کو چلی جائے گی۔
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/24_employee_dashboard_unaccepted_lead.png" alt="5 Minute Accept Countdown" fill className="object-contain" />
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۴</span>
                  <h3 className="font-bold text-base">فون ماسکنگ، کال کی کوشش اور ثبوت کا اندراج</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  قبول کرنے کے بعد کسٹمر کا فون نمبر ظاہر ہوتا ہے۔ <strong>WhatsApp</strong> یا <strong>Call</strong> کا بٹن دبانے پر سسٹم کوشش کا ٹائم اور پروف لاک کر لیتا ہے۔ گفتگو کے بعد رزلٹ اور نوٹس محفوظ کریں۔
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/27_lead_detail_contact_options.png" alt="Contact Options and Masked Phone" fill className="object-contain" />
                </div>
              </div>

              {/* Step 5 */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-tone-brand font-bold text-tone-brand-foreground text-xs">۵</span>
                  <h3 className="font-bold text-base">پائپ لائن افقی اسکرول (Drag to Scroll)</h3>
                </div>
                <p className="text-muted-foreground pe-9">
                  پائپ لائن اسکرین پر ماؤس کو پکڑ کر آسانی سے ڈریگ کریں یا فون پر سوائپ کریں۔ مختلف مراحل (New, Contacted, Qualified, Survey, Proposal) میں اپنی لیڈز کو فالو کریں۔
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/30_employee_pipeline_drag_scroll.png" alt="Pipeline Horizontal Scroll" fill className="object-contain" />
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── ENGLISH MANUAL ── */}
        <TabsContent value="english" className="space-y-6 pt-4 text-left" dir="ltr">
          {/* English Section 1: Managers & Super Admin */}
          <SectionCard title="1. Manager & Administrator Operational Manual" description="Departmental manager creation, first login, forced password change, team rotation, and proof review">
            <div className="space-y-6 text-sm">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 1: Super Admin Portal & Dashboard Controls</h3>
                <p className="text-muted-foreground">
                  The company owner (Super Admin) logs in at <code>/login</code>. The dashboard features KPI metrics, pending proof approvals, and the Auto-Assign Toggle to manage round-robin automation without manual intervention.
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/03_superadmin_dashboard.png" alt="Super Admin Dashboard" fill className="object-contain" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 2: Department Managers Creation (Trading & Installation)</h3>
                <p className="text-muted-foreground">
                  Navigate to <strong>Company admin</strong> (<code>/admin</code>). Add a manager for Trading (e.g., Hamza Farooq) and a manager for Installation (e.g., Zubair Khan). Strict scoping guarantees that each manager only accesses leads and personnel of their own department.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/05_create_trading_manager_form.png" alt="Trading Manager Form" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/08_both_managers_created.png" alt="Both Managers Active" fill className="object-contain" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 3: Manager First Login & Mandatory Password Change</h3>
                <p className="text-muted-foreground">
                  Upon first login with their temporary password, the system intercepts the session and forces a password reset to ensure zero unauthorized password sharing. Once saved, the manager enters their department dashboard.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/10_manager_forced_password_reset.png" alt="Manager Forced Password Reset" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/12_trading_manager_dashboard.png" alt="Manager Department Dashboard" fill className="object-contain" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 4: Registering Call Agents & Round-Robin Rotation</h3>
                <p className="text-muted-foreground">
                  In <strong>Settings &rarr; Users</strong>, the manager adds agents (e.g., Bilal Ahmed). In <strong>Team</strong> (<code>/team</code>), configure the sequence (1 &rarr; 2 &rarr; 3), the 5-minute agent accept SLA, and contact timeouts.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/14_manager_add_call_agent_form.png" alt="Add Agent Form" fill className="object-contain" />
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image src="/guide/walkthrough/16_manager_team_order_and_timings.png" alt="Team Order & Timings" fill className="object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* English Section 2: Call Agents */}
          <SectionCard title="2. Call Agent Daily Operational Manual" description="Shift check-in, 5-minute accept countdown, contact logging, phone masking & drag-to-scroll pipeline">
            <div className="space-y-6 text-sm">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 1: First Login & Mandatory Personal Password Reset</h3>
                <p className="text-muted-foreground">
                  Sign in with the temporary password given by your manager. You are redirected to <code>/change-password</code> to pick your permanent private password.
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/22_employee_forced_password_reset.png" alt="Employee Forced Password Reset" fill className="object-contain" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 2: Morning Shift Check-In (Mandatory)</h3>
                <p className="text-muted-foreground">
                  At the beginning of your shift, tap <strong>Check in</strong> on the Dashboard. If you are checked out or on break, the auto-assignment engine will skip you and you will receive zero leads.
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/25_employee_checked_in_active_shift.png" alt="Employee Checked In" fill className="object-contain" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 3: Accepting Incoming Leads (5-Minute Window)</h3>
                <p className="text-muted-foreground">
                  When a lead lands in your queue, a prominent yellow banner displays a 5-minute countdown timer. Tap <strong>Accept [Lead No]</strong> immediately. Unaccepted leads auto-bounce to the next agent in the round-robin order.
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/24_employee_dashboard_unaccepted_lead.png" alt="5 Minute Accept Countdown" fill className="object-contain" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 4: Phone Masking & Atomic Call Attempt Claim</h3>
                <p className="text-muted-foreground">
                  The phone number is unmasked upon accepting. Tapping <strong>WhatsApp</strong> or <strong>Call</strong> writes an atomic attempt log into the database with timestamp proof. Log your call outcome and customer notes immediately after speaking.
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/27_lead_detail_contact_options.png" alt="Contact Options and Masked Phone" fill className="object-contain" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-base">Step 5: Pipeline Horizontal Scroll with Grab Cursor</h3>
                <p className="text-muted-foreground">
                  Navigate to <strong>Pipeline</strong> (<code>/pipeline</code>). Click and drag across stages on desktop, or swipe effortlessly on mobile. When closing a lead (Won/Lost), it requires Manager Proof Review before commission or KPIs are recognized.
                </p>
                <div className="relative aspect-[16/10] max-w-2xl overflow-hidden rounded-xl border border-border bg-muted/20">
                  <Image src="/guide/walkthrough/30_employee_pipeline_drag_scroll.png" alt="Pipeline Horizontal Scroll" fill className="object-contain" />
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
