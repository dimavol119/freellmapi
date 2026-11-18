# -*- coding: utf-8 -*-
"""
בוט קריין לשידור חי בטיקטוק.
רואה את המסך -> חושב מה להגיד (Gemini) -> מדבר (edge-tts) -> הקול נכנס לשידור דרך VB-Cable.
קורא גם את הצ'אט של הלייב ועונה לצופים.

מקשים:
  F8  = השתק / בטל השתקה של הבוט
  F9  = "תגיד משהו עכשיו"
  F10 = יציאה
"""
import asyncio
import io
import os
import random
import tempfile
import time

import mss
import sounddevice as sd
import soundfile as sf
import edge_tts
import keyboard
from PIL import Image
from google import genai
from google.genai import types

# ===================== הגדרות - תשנה כאן =====================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")   # או תדביק כאן את המפתח בין המירכאות
TIKTOK_USERNAME = ""          # שם המשתמש שלך בטיקטוק בלי @ (ריק = בלי קריאת צ'אט)
GAME_NAME = "המשחק"           # למשל: "Fortnite", "Minecraft"
VOICE = "he-IL-AvriNeural"    # קול גברי. קול נשי: "he-IL-HilaNeural"
VOICE_RATE = "+10%"           # מהירות דיבור
OUTPUT_DEVICE = "CABLE Input" # לאן לשלוח את הקול. None = לרמקולים (לבדיקה)
INTERVAL_SECONDS = (8, 20)    # כשאין אקשן - מדבר כל 8-20 שניות (אקראי, כמו בן אדם)
REACT_ON_ACTION = True        # כשמשהו גדול קורה במסך - מגיב מיד
ACTION_THRESHOLD = 28.0       # כמה המסך צריך להשתנות כדי להיחשב "אקשן" (נמוך = רגיש יותר)
MIN_GAP_SECONDS = 4           # מינימום שניות בין משפט למשפט
MODEL = "gemini-2.5-flash"

PERSONALITY = f"""
אתה סטרימר ישראלי אמיתי שמשדר עכשיו לייב בטיקטוק ומשחק ב{GAME_NAME}.
אתה מדבר בגוף ראשון, בזמן אמת, בדיוק כמו שבן אדם מדבר כשהוא משחק ומשדר.

איך אתה נשמע:
- עברית מדוברת, טבעית, של צעיר ישראלי. לא עברית של ספר.
- משתמש במילים כמו: אחי, יאללה, וואלה, רגע רגע רגע, מה זה, אין מצב, סבבה, נו באמת, חחח, אוף, יס!
- יש לך רגשות אמיתיים: מתלהב, מתעצבן כשמתים, צוחק על עצמך, נלחץ ברגעים קשים, חוגג ניצחונות.
- לפעמים אתה מתחיל משפט, עוצר וממשיך ("רגע... לא, לא, לא, תראו מה הוא עושה").
- לפעמים רק תגובה קצרה ("וואו!", "אוי לא", "יאללה יאללה יאללה"), ולפעמים משפט או שניים. תגוון באורך.
- זוכר מה קרה קודם בשידור ומתייחס לזה ("שוב פעם אותו בחור שהרג אותי קודם?!").
- מדבר עם הצופים כמו עם חברים: שואל אותם שאלות, מבקש עצות, צוחק איתם.
- מדי פעם, לא כל הזמן, מבקש לייקים או עוקבים בצורה טבעית ("אם הגענו ל-100 לייקים אני עושה ...").

חוקים:
- מקסימום 30 מילים. זה מוקרא בקול בלייב.
- תגיב למה שבאמת רואים על המסך עכשיו.
- לא חוזר על משפטים או פתיחות שכבר אמרת.
- אם יש הודעות בצ'אט, תענה לאחת מהן בשם של הכותב, בטבעיות.
- בלי אימוג'ים, בלי כוכביות, בלי סוגריים, בלי תיאורי פעולה. רק את המילים שאתה אומר.
- בלי קללות קשות, בלי תוכן פוגעני או גזעני.
- אם מישהו בצ'אט שואל ברצינות אם אתה בוט או AI, תענה בכנות ובהומור שאתה הקול ה-AI של הערוץ.
"""
# ============================================================

client = genai.Client(api_key=GEMINI_API_KEY)
muted = False
speak_now = asyncio.Event()
running = True
history: list[str] = []
pending_chat: list[str] = []


def grab_image() -> Image.Image:
    with mss.mss() as s:
        shot = s.grab(s.monitors[1])
    img = Image.frombytes("RGB", shot.size, shot.rgb)
    img.thumbnail((1024, 1024))
    return img


def to_jpeg(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return buf.getvalue()


def screen_change(a: Image.Image, b: Image.Image) -> float:
    """כמה המסך השתנה (0-255). משמש לזיהוי רגעי אקשן."""
    sa = a.convert("L").resize((64, 36))
    sb = b.convert("L").resize((64, 36))
    pa, pb = sa.tobytes(), sb.tobytes()
    return sum(abs(x - y) for x, y in zip(pa, pb)) / len(pa)


def think(image: bytes, action: bool = False) -> str:
    prompt = PERSONALITY
    if history:
        prompt += "\nמה שאמרת עד עכשיו בשידור (מהישן לחדש, אל תחזור):\n" + "\n".join(history[-12:])
    if action:
        prompt += "\nמשהו גדול הרגע קרה על המסך! תגיב מהר ובהתלהבות או בתסכול, תגובה קצרה."
    if pending_chat:
        prompt += "\nהודעות חדשות מהצ'אט:\n" + "\n".join(pending_chat[-5:])
        pending_chat.clear()
    prompt += "\nמה אתה אומר עכשיו? תחזיר רק את הטקסט שתגיד."
    resp = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=image, mime_type="image/jpeg"), prompt],
        config=types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=300,
            thinking_config=types.ThinkingConfig(thinking_budget=0),  # מהיר יותר, בלי "חשיבה"
        ),
    )
    return (resp.text or "").strip().strip('"')


def find_device():
    if not OUTPUT_DEVICE:
        return None
    for i, d in enumerate(sd.query_devices()):
        if OUTPUT_DEVICE.lower() in d["name"].lower() and d["max_output_channels"] > 0:
            return i
    print(f"[!] לא נמצא התקן '{OUTPUT_DEVICE}' - מנגן לרמקולים. התקנת VB-Cable?")
    return None


async def speak(text: str, device):
    path = os.path.join(tempfile.gettempdir(), "live_bot_say.mp3")
    # קצת שינוי במהירות ובגובה בכל משפט, כדי שלא יישמע רובוטי ואחיד
    base = int(VOICE_RATE.replace("%", ""))
    rate = f"{base + random.randint(-5, 10):+d}%"
    pitch = f"{random.randint(-4, 6):+d}Hz"
    await edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch).save(path)
    data, sr = sf.read(path, dtype="float32")
    await asyncio.to_thread(lambda: (sd.play(data, sr, device=device), sd.wait()))


async def chat_listener():
    if not TIKTOK_USERNAME:
        return
    try:
        from TikTokLive import TikTokLiveClient
        from TikTokLive.events import CommentEvent, ConnectEvent, FollowEvent, GiftEvent

        tk = TikTokLiveClient(unique_id="@" + TIKTOK_USERNAME.lstrip("@"))

        @tk.on(ConnectEvent)
        async def _c(_):
            print("[צ'אט] מחובר ללייב!")

        @tk.on(CommentEvent)
        async def _m(e):
            print(f"[צ'אט] {e.user.nickname}: {e.comment}")
            pending_chat.append(f"{e.user.nickname} כתב: {e.comment}")

        @tk.on(FollowEvent)
        async def _f(e):
            pending_chat.append(f"{e.user.nickname} התחיל לעקוב! תודה לו.")

        @tk.on(GiftEvent)
        async def _g(e):
            pending_chat.append(f"{e.user.nickname} שלח מתנה! תודה לו בהתלהבות.")

        await tk.connect()
    except Exception as ex:
        print(f"[!] קריאת הצ'אט נכשלה ({ex}). הבוט ממשיך בלי צ'אט. ודא שאתה כבר בלייב.")


def setup_hotkeys(loop):
    def toggle():
        global muted
        muted = not muted
        print("[🔇 מושתק]" if muted else "[🔊 פעיל]")

    def now():
        loop.call_soon_threadsafe(speak_now.set)

    def quit_():
        global running
        running = False
        loop.call_soon_threadsafe(speak_now.set)

    keyboard.add_hotkey("f8", toggle)
    keyboard.add_hotkey("f9", now)
    keyboard.add_hotkey("f10", quit_)


async def main():
    if not GEMINI_API_KEY:
        print("חסר GEMINI_API_KEY! קבל מפתח חינם ב- https://aistudio.google.com/apikey")
        return
    device = find_device()
    setup_hotkeys(asyncio.get_running_loop())
    asyncio.create_task(chat_listener())
    print("הבוט רץ! F8=השתקה  F9=דבר עכשיו  F10=יציאה")

    prev = await asyncio.to_thread(grab_image)
    last_spoke = 0.0
    next_idle = time.time() + random.uniform(*INTERVAL_SECONDS)

    while running:
        # בודק את המסך כל שנייה וחצי - מגיב מיד לאקשן, אחרת מדבר מדי פעם
        try:
            await asyncio.wait_for(speak_now.wait(), timeout=1.5)
        except asyncio.TimeoutError:
            pass
        forced = speak_now.is_set()
        speak_now.clear()
        if not running:
            break
        if muted:
            continue
        try:
            img = await asyncio.to_thread(grab_image)
            change = screen_change(prev, img)
            prev = img
            now = time.time()
            action = REACT_ON_ACTION and change > ACTION_THRESHOLD and now - last_spoke > MIN_GAP_SECONDS
            chat_waiting = bool(pending_chat) and now - last_spoke > MIN_GAP_SECONDS + 2
            if not (forced or action or chat_waiting or now >= next_idle):
                continue

            t0 = time.time()
            text = await asyncio.to_thread(think, to_jpeg(img), action)
            if not text:
                continue
            tag = "אקשן" if action else "צ'אט" if chat_waiting else "בוט"
            print(f"[{tag}] {text}  ({time.time()-t0:.1f}s)")
            history.append(text)
            await speak(text, device)
            last_spoke = time.time()
            next_idle = last_spoke + random.uniform(*INTERVAL_SECONDS)
            prev = await asyncio.to_thread(grab_image)  # לא להגיב לשינוי שקרה בזמן שדיבר
        except Exception as ex:
            print(f"[!] שגיאה: {ex}")
            await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(main())
