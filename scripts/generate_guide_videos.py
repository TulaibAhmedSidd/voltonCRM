import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
BASE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = BASE_DIR / "public" / "guide"
WALK_DIR = OUT_DIR / "walkthrough"
TEMP_DIR = BASE_DIR / "temp_video_build"

OUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def create_whatsapp_slide():
    """Create a high-impact presentation slide for WhatsApp API future capabilities."""
    w, h = 1920, 1080
    im = Image.new("RGB", (w, h), color=(15, 23, 42)) # Slate 900
    draw = ImageDraw.Draw(im)

    # Header bar
    draw.rectangle([(0, 0), (w, 140)], fill=(2, 6, 23)) # Slate 950
    draw.rectangle([(0, 136), (w, 140)], fill=(245, 158, 11)) # Amber accent

    # Title text
    try:
        # Default fonts
        font_large = ImageFont.truetype("arial.ttf", 46)
        font_med = ImageFont.truetype("arial.ttf", 32)
        font_small = ImageFont.truetype("arial.ttf", 26)
    except:
        font_large = ImageFont.load_default()
        font_med = font_large
        font_small = font_large

    draw.text((80, 42), "Volt On CRM - WhatsApp Cloud API Integration (Upcoming)", fill=(255, 255, 255), font=font_large)

    cards = [
        {
            "num": "01",
            "title": "Automated Meta Ad Lead Ingestion (CTWA)",
            "desc": "When Facebook & Instagram Click-to-WhatsApp ads run, leads flow directly into the CRM within seconds.",
            "sub": "Includes campaign name, ad creative ID, and customer referral headline automatically."
        },
        {
            "num": "02",
            "title": "Live 2-Way Chat Panel Inside CRM",
            "desc": "Agents chat with customers directly from the CRM web app. No personal phone or WhatsApp Web required.",
            "sub": "Full message history, media support, and official company phone verification badge."
        },
        {
            "num": "03",
            "title": "Instant Auto-Responses & WhatsApp Templates",
            "desc": "Automated welcome greeting, quotation PDFs, and smart follow-up reminders sent via official Meta API.",
            "sub": "Zero delay for customer inquiries, maintaining 100% engagement even after working hours."
        },
        {
            "num": "04",
            "title": "100% Secure Audit & Anti-Fraud Protection",
            "desc": "Customer phone numbers and chat transcripts remain safe in the company database, preventing lead leakage.",
            "sub": "Managers can review all communications and customer responses in real-time."
        }
    ]

    card_w, card_h = 840, 360
    positions = [
        (80, 200),
        (1000, 200),
        (80, 600),
        (1000, 600)
    ]

    for (x, y), c in zip(positions, cards):
        # Card background
        draw.rounded_rectangle([(x, y), (x + card_w, y + card_h)], radius=16, fill=(30, 41, 59), outline=(51, 65, 85), width=2)
        # Badge
        draw.rounded_rectangle([(x + 24, y + 24), (x + 80, y + 68)], radius=8, fill=(245, 158, 11))
        draw.text((x + 36, y + 28), c["num"], fill=(0, 0, 0), font=font_med)
        
        # Title
        draw.text((x + 96, y + 28), c["title"], fill=(255, 255, 255), font=font_med)
        # Desc
        draw.text((x + 24, y + 100), c["desc"], fill=(226, 232, 240), font=font_small)
        # Sub
        draw.text((x + 24, y + 180), c["sub"], fill=(148, 163, 184), font=font_small)

    out_file = WALK_DIR / "32_whatsapp_api_future_features.png"
    im.save(out_file)
    print(f"Created WhatsApp feature slide: {out_file}")
    return out_file

def get_audio_duration(audio_path):
    cmd = [
        FFMPEG, "-i", str(audio_path)
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, text=True, errors="replace")
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            parts = line.split("Duration:")[1].split(",")[0].strip().split(":")
            hours = float(parts[0])
            mins = float(parts[1])
            secs = float(parts[2])
            return hours * 3600 + mins * 60 + secs
    return 10.0

def build_scene_clip(scene_idx, images, audio_path, output_clip_path):
    duration = get_audio_duration(audio_path)
    img_count = len(images)
    time_per_img = duration / img_count

    # If single image, simple loop
    if img_count == 1:
        img = str(images[0])
        vf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B132B"
        cmd = [
            FFMPEG, "-y",
            "-loop", "1", "-i", img,
            "-i", str(audio_path),
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-vf", vf,
            "-t", f"{duration + 0.3:.2f}",
            str(output_clip_path)
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return

    # If multiple images, create a concat script for images
    concat_txt = TEMP_DIR / f"concat_{scene_idx}.txt"
    with open(concat_txt, "w", encoding="utf-8") as f:
        for im in images:
            f.write(f"file '{str(im).replace(chr(92), '/')}'\n")
            f.write(f"duration {time_per_img:.2f}\n")
        # ffmpeg concat demuxer requirement: repeat last file
        f.write(f"file '{str(images[-1]).replace(chr(92), '/')}'\n")

    vf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B132B"
    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_txt),
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-vf", vf,
        "-t", f"{duration + 0.3:.2f}",
        str(output_clip_path)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

async def generate_tts(text, output_path):
    from edge_tts import Communicate
    comm = Communicate(text, voice="ur-PK-AsadNeural", rate="-12%")
    await comm.save(str(output_path))

async def create_video(video_title, scenes, final_output_file):
    print(f"\n==========================================")
    print(f"Rendering: {video_title}")
    print(f"==========================================")
    clip_files = []

    for idx, sc in enumerate(scenes):
        print(f"-> Processing Scene {idx + 1}/{len(scenes)}: {sc['title']}")
        audio_file = TEMP_DIR / f"{video_title}_audio_{idx}.mp3"
        await generate_tts(sc["urdu"], audio_file)

        clip_file = TEMP_DIR / f"{video_title}_clip_{idx}.mp4"
        build_scene_clip(idx, sc["images"], audio_file, clip_file)
        clip_files.append(clip_file)

    # Concat all scene clips
    concat_list = TEMP_DIR / f"{video_title}_list.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for c in clip_files:
            f.write(f"file '{str(c).replace(chr(92), '/')}'\n")

    print(f"Stitching all clips into final video: {final_output_file}")
    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_list),
        "-c", "copy",
        str(final_output_file)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[OK] Video successfully generated: {final_output_file} ({os.path.getsize(final_output_file)} bytes)")

async def main():
    wa_slide = create_whatsapp_slide()

    # --- MANAGER SCENES ---
    manager_scenes = [
        {
            "title": "Welcome & Super Admin Dashboard",
            "images": [
                WALK_DIR / "01_login_page.png",
                WALK_DIR / "02_superadmin_credentials_entered.png",
                WALK_DIR / "03_superadmin_dashboard.png"
            ],
            "urdu": (
                "السلام علیکم۔ وولٹ آن سولر سی آر ایم کے مینیجر گائیڈ میں خوش آمدید۔ "
                "یہ موبائل فرسٹ ویب سسٹم خاص طور پر پاکستان کی سولر انڈسٹری کے لیے ڈیزائن کیا گیا ہے۔ "
                "سب سے پہلے کمپنی سپر ایڈمن لاگ ان کرتے ہیں۔ ڈیش بورڈ پر اہم کے پی آئیز اور آٹو اسائن کا ٹوگل موجود ہے جس کے ذریعے لیڈز کی خودکار تقسیم کو آن یا آف کیا جا سکتا ہے۔"
            )
        },
        {
            "title": "Creating Trading & Installation Managers",
            "images": [
                WALK_DIR / "04_company_admin_page.png",
                WALK_DIR / "05_create_trading_manager_form.png",
                WALK_DIR / "06_trading_manager_created.png",
                WALK_DIR / "07_create_installation_manager_form.png",
                WALK_DIR / "08_both_managers_created.png"
            ],
            "urdu": (
                "کمپنی ایڈمن سیکشن میں جا کر، سپر ایڈمن دونوں شعبوں کے لیے مینیجرز تیار کرتا ہے۔ "
                "یہاں ہم نے ٹریڈنگ ڈیپارٹمنٹ کے لیے حمزہ فاروق کو اور انسٹالیشن ڈیپارٹمنٹ کے لیے زبیر خان کو بطور مینیجر منتخب کیا، اور عارضی پاس ورڈ فراہم کیا۔ "
                "سی آر ایم کے اصول کے مطابق ہر مینیجر صرف اپنے ہی شعبے کے ایجنٹس اور لیڈز تک رسائی رکھتا ہے تاکہ دونوں ڈپارٹمنٹس آزادانہ اور محفوظ طریقے سے کام کر سکیں۔"
            )
        },
        {
            "title": "Manager First Login & Forced Password Reset",
            "images": [
                WALK_DIR / "09_manager_login_credentials.png",
                WALK_DIR / "10_manager_forced_password_reset.png",
                WALK_DIR / "11_manager_password_reset_filled.png",
                WALK_DIR / "12_trading_manager_dashboard.png"
            ],
            "urdu": (
                "اب مینیجر پہلی بار اپنے دیے گئے عارضی پاس ورڈ سے لاگ ان کرتا ہے۔ "
                "سسٹم فورا پاس ورڈ ری سیٹ اسکرین دکھاتا ہے کیونکہ سیکیورٹی قانون کے تحت کمپنی میں کسی بھی افسر کا پاس ورڈ ایڈمن کو بھی معلوم نہیں ہونا چاہیے۔ "
                "مینیجر اپنا نیا محفوظ پاس ورڈ سیٹ کرتا ہے اور اپنے ٹریڈنگ ڈیپارٹمنٹ کے مخصوص ڈیش بورڈ میں داخل ہو جاتا ہے۔"
            )
        },
        {
            "title": "Manager Adding Call Agents & Team Rotation",
            "images": [
                WALK_DIR / "13_manager_settings_page.png",
                WALK_DIR / "14_manager_add_call_agent_form.png",
                WALK_DIR / "15_call_agent_created_in_team.png",
                WALK_DIR / "16_manager_team_order_and_timings.png"
            ],
            "urdu": (
                "سیٹنگز کے صفحے پر جا کر مینیجر اپنے ڈیپارٹمنٹ کے لیے نئے کال ایجنٹ، جیسے بلال احمد، کو شامل کرتا ہے۔ "
                "ٹیم کے صفحے پر راؤنڈ رابن روٹیشن سیٹ کی جاتی ہے تاکہ لیڈز ایجنٹس میں باری باری برابر تقسیم ہوں۔ "
                "ساتھ ہی مینیجر ونڈو، پانچ منٹ کا ایکسیپٹ ٹائمر، اور فالو اپ کی حدود کا تعین کیا جاتا ہے۔ لیڈ صرف اسی ایجنٹ کو تفویض ہوتی ہے جو اپنی شفٹ میں باقاعدہ چیک ان ہو۔"
            )
        },
        {
            "title": "Quick Lead Creation & Lead Assignment",
            "images": [
                WALK_DIR / "17_manager_quick_add_lead_dialog.png",
                WALK_DIR / "18_manager_lead_detail_view.png",
                WALK_DIR / "19_manager_selecting_assigned_agent.png",
                WALK_DIR / "20_manager_assigned_lead_to_agent.png"
            ],
            "urdu": (
                "اگر کوئی گاہک واٹس ایپ یا فون پر ڈائریکٹ رابطہ کرے تو مینیجر کوئیک ایڈ لیڈ کے ذریعے کسٹمر، جیسے طارق محمود، کا اندراج کرتا ہے۔ "
                "مینیجر لیڈ کھول کر دستی طور پر بھی کسی مخصوص ایجنٹ کو لیڈ اسائن کر سکتا ہے۔ "
                "اینٹی فراڈ قانون کے تحت ایجنٹ خود سے کسی ڈیل کو فائنل نہیں کر سکتا۔ جب بھی کوئی ایجنٹ ڈیل ون کا دعویٰ کرے گا تو وہ مینیجر کے پروف ریویو میں جائے گی اور مینیجر کے تصدیق کے بعد ہی سیلز میں گنی جائے گی۔"
            )
        },
        {
            "title": "WhatsApp Cloud API Future Capabilities",
            "images": [
                wa_slide
            ],
            "urdu": (
                "ایک بہت اہم وضاحت واٹس ایپ اے پی آئی کے حوالے سے: "
                "فی الحال آفیشل میٹا واٹس ایپ کلاؤڈ اے پی آئی منسلک نہیں ہے، اس لیے ہم سسٹم سے بیرونی واٹس ایپ کھولتے ہیں۔ "
                "لیکن جیسے ہی میٹا اے پی آئی کے کریڈینشلز منسلک ہو جائیں گے، تو یہ سہولیات میسر ہوں گی: "
                "پہلا: فیس بک اور انسٹاگرام کے اشتہارات سے لیڈز فورا خودکار طریقے سے بغیر کسی تاخیر کے سی آر ایم میں درج ہو جائیں گی۔ "
                "دوسرا: سی آر ایم کے اندر ہی باضابطہ لائیو چیٹ پینل کھل جائے گا جس سے ایجنٹ بنا اپنے ذاتی واٹس ایپ کے کمپنی کے نمبر سے چیٹ کر سکیں گے۔ "
                "اور تیسرا: تصدیق شدہ کاروباری ٹیمپلیٹس، خودکار خوش آمدیدی پیغامات اور کوٹیشنز براہ راست سسٹم سے گاہک کو روانہ ہوں گی۔"
            )
        }
    ]

    # --- EMPLOYEE SCENES ---
    employee_scenes = [
        {
            "title": "Employee First Login & Password Security",
            "images": [
                WALK_DIR / "21_employee_login_screen.png",
                WALK_DIR / "22_employee_forced_password_reset.png",
                WALK_DIR / "23_employee_password_reset_filled.png"
            ],
            "urdu": (
                "السلام علیکم۔ وولٹ آن سولر سی آر ایم میں تمام کال ایجنٹس کا خیر مقدم ہے۔ "
                "جب مینیجر آپ کا اکاؤنٹ بناتا ہے تو آپ کو ایک عارضی پاس ورڈ ملتا ہے۔ "
                "پہلی بار لاگ ان کرتے ہی سسٹم آپ سے اپنا ذاتی خفیہ پاس ورڈ سیٹ کرواتا ہے۔ یہ اینٹی فراڈ سیکیورٹی کا حصہ ہے تاکہ آپ کا کام اور کمیشن صرف آپ کے کنٹرول میں رہے۔"
            )
        },
        {
            "title": "Shift Check-In & Duty Start",
            "images": [
                WALK_DIR / "24_employee_dashboard_unaccepted_lead.png",
                WALK_DIR / "25_employee_checked_in_active_shift.png"
            ],
            "urdu": (
                "پاس ورڈ سیٹ کرنے کے بعد آپ اپنے ڈیش بورڈ پر آ جاتے ہیں۔ "
                "یہاں سب سے اہم قدم چیک ان کا بٹن دبانا ہے۔ "
                "یاد رکھیں، جب تک آپ چیک ان نہیں ہوں گے، سسٹم آپ کو غیر حاضر سمجھے گا اور راؤنڈ رابن پول سے آپ کو کوئی بھی نئی لیڈ موصول نہیں ہوگی۔ چیک ان ہوتے ہی آپ کی ڈیوٹی اور دستیابی فعال ہو جاتی ہے۔"
            )
        },
        {
            "title": "Accepting Incoming Leads Within 5 Minutes",
            "images": [
                WALK_DIR / "24_employee_dashboard_unaccepted_lead.png",
                WALK_DIR / "26_employee_lead_accepted.png"
            ],
            "urdu": (
                "جب کوئی نئی لیڈ آپ کو اسائن ہوتی ہے، جیسے طارق محمود کی لیڈ، تو ڈیش بورڈ پر پانچ منٹ کا ٹائمر شروع ہو جاتا ہے۔ "
                "آپ نے فورا ایکسیپٹ کا بٹن دبانا ہے۔ "
                "اگر آپ پانچ منٹ کے اندر لیڈ قبول نہیں کریں گے، تو سسٹم کسٹمر کے تحفظ کے لیے وہ لیڈ آپ سے واپس لے کر اگلے ایجنٹ کو منتقل کر دے گا۔ اس لیے بروقت قبول کرنا لازمی ہے۔"
            )
        },
        {
            "title": "Contacting Customer, Masked Numbers & Proof Logging",
            "images": [
                WALK_DIR / "27_lead_detail_contact_options.png",
                WALK_DIR / "28_lead_detail_notes_and_proof.png",
                WALK_DIR / "29_lead_detail_audit_timeline.png"
            ],
            "urdu": (
                "لیڈ قبول کرنے کے بعد کسٹمر کی تفصیلات کھلتی ہیں۔ "
                "فون نمبر سیکیورٹی کے تحت ماسک یعنی جزوی طور پر چھپا ہوا ہوتا ہے۔ جیسے ہی آپ کال یا واٹس ایپ کا بٹن دباتے ہیں، رابطہ ہو جاتا ہے اور آپ کی کوشش کا ٹائم اور پروف سی آر ایم کے ٹائم لائن میں لاک ہو جاتا ہے۔ "
                "کال کے بعد کسٹمر کے تقاضے اور گفتگو کا احوال نوٹس میں لازمی درج کریں۔"
            )
        },
        {
            "title": "Pipeline Drag & Drop Navigation",
            "images": [
                WALK_DIR / "30_employee_pipeline_drag_scroll.png",
                WALK_DIR / "31_employee_dashboard_active_duty.png"
            ],
            "urdu": (
                "پائپ لائن اسکرین پر آپ اپنی تمام لیڈز کو مختلف مراحل میں باآسانی دیکھ سکتے ہیں۔ "
                "ہم نے ماؤس کے گریب کرسر اور موبائل سوائپ کے ساتھ افقی اسکرولنگ شامل کی ہے تاکہ پائپ لائن بغیر کسی دقت کے چل سکے۔ "
                "جب آپ کسٹمر کو کوٹیشن بھیجیں یا ڈیل فائنل کریں، تو مرحلہ اپڈیٹ کریں۔ ڈیل ون ہونے پر مینیجر کے پاس پروف ریویو جائے گا جو آپ کی سیلز کی تصدیق کرے گا۔"
            )
        },
        {
            "title": "Upcoming WhatsApp Features for Agents",
            "images": [
                wa_slide
            ],
            "urdu": (
                "اور آخر میں واٹس ایپ اے پی آئی کی سہولت: "
                "جب آفیشل میٹا واٹس ایپ کلاؤڈ اے پی آئی فعال ہو جائے گی، تو آپ کو اپنے ذاتی فون سے کسٹمر کو میسج کرنے کی ضرورت بالکل نہیں رہے گی۔ "
                "آپ براہ راست سی آر ایم کے اندر سے ہی کمپنی کے آفیشل نمبر سے کسٹمر کے ساتھ چیٹ کر سکیں گے اور کسٹمر کے پیغامات کا لائیو جواب دے سکیں گے۔ شکریہ اور آپ کا کام کامیاب رہے!"
            )
        }
    ]

    # Generate Manager Video
    manager_mp4 = OUT_DIR / "volton-crm-manager-guide-urdu.mp4"
    await create_video("manager_guide", manager_scenes, manager_mp4)

    # Generate Employee Video
    employee_mp4 = OUT_DIR / "volton-crm-employee-guide-urdu.mp4"
    await create_video("employee_guide", employee_scenes, employee_mp4)

    # Generate Combined Complete Video
    combined_scenes = manager_scenes + employee_scenes
    complete_mp4 = OUT_DIR / "volton-crm-complete-guide-urdu.mp4"
    await create_video("complete_guide", combined_scenes, complete_mp4)

    print("\n[SUCCESS] ALL VIDEOS GENERATED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
