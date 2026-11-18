# בוט קריין ללייב בטיקטוק – הוראות התקנה (Windows)

בוט AI שמדבר במקומך בלייב גיימינג מהמחשב: רואה את המסך, מגיב לאקשן, עונה לצ'אט, ומדבר בעברית בקול טבעי.

## 🧪 ניסוי מהיר בלי לייב
בראש `live_bot.py` שנה:
```python
GEMINI_API_KEY = "המפתח_שלך"
TIKTOK_USERNAME = ""
OUTPUT_DEVICE = None
```
הפעל את `install_and_run.bat`, חזור למשחק והבוט ידבר דרך הרמקולים. אחרי הניסוי החזר את `OUTPUT_DEVICE = "CABLE Input"`.


## 1. התקנות חד-פעמיות
1. **Python**: הורד מ-https://www.python.org/downloads/ ובהתקנה סמן ✅ **Add Python to PATH**.
2. **VB-Cable** (כבל אודיו וירטואלי): הורד מ-https://vb-audio.com/Cable/, חלץ והרץ את `VBCABLE_Setup_x64.exe` כמנהל, ואז הפעל מחדש את המחשב.
3. **מפתח Gemini (חינם)**: היכנס ל-https://aistudio.google.com/apikey, לחץ Create API key והעתק את המפתח.

## 2. הגדרת הבוט
פתח את `live_bot.py` ב-Notepad ושנה את החלק העליון:
- `GEMINI_API_KEY = "..."` – הדבק כאן את המפתח.
- `TIKTOK_USERNAME = "השם_שלך"` – כדי שהבוט יקרא את הצ'אט ויענה לצופים.
- `GAME_NAME = "Fortnite"` – שם המשחק.
- `VOICE` – `he-IL-AvriNeural` (גבר) או `he-IL-HilaNeural` (אישה).
- `PERSONALITY` – אפשר לשנות לגמרי את האופי של הבוט.

## 3. חיבור ל-TikTok LIVE Studio
1. ב-TikTok LIVE Studio, בהגדרות האודיו, בחר כמיקרופון: **CABLE Output (VB-Audio Virtual Cable)**.
2. הבוט שולח את הקול שלו ל-**CABLE Input**, כך שבשידור ישמעו אותו ולא אותך.
3. כדי לשמוע את הבוט בעצמך: Windows ← הגדרות קול ← Recording ← CABLE Output ← Properties ← Listen ← סמן "Listen to this device" ובחר את האוזניות שלך.

> כדי לבדוק בלי שידור, שנה ל-`OUTPUT_DEVICE = None` והבוט ידבר דרך הרמקולים.

## 4. הפעלה
לחיצה כפולה על `install_and_run.bat`. בפעם הראשונה הוא מתקין את הספריות.
**חשוב:** תתחיל את הלייב לפני שאתה מפעיל את הבוט, אחרת הוא לא יצליח להתחבר לצ'אט.

| מקש | פעולה |
|---|---|
| F8 | השתק / בטל השתקה |
| F9 | "תגיד משהו עכשיו" |
| F10 | יציאה |

## טיפים
- המשחק צריך להיות על המסך הראשי, כי הבוט מצלם את המסך הראשי.
- אם הוא מדבר יותר מדי או פחות מדי, שנה את `INTERVAL_SECONDS`.
- אם F8 לא עובד, הרץ את הקובץ כמנהל (Run as administrator).

## כיוונון
- `ACTION_THRESHOLD`: אם הבוט מגיב ליותר מדי דברים, תעלה ל-40. אם הוא מפספס רגעים, תוריד ל-20.
- `INTERVAL_SECONDS`: כל כמה שניות הבוט מדבר כשאין אקשן.
- `MIN_GAP_SECONDS`: מינימום שניות בין משפט למשפט.

## שקיפות
טיקטוק דורשת לסמן תוכן שנוצר ב-AI. מומלץ לכתוב "קריין AI" בכותרת הלייב או בביו.
