export type Language = 'he'|'ru'|'en';
export const LANGUAGE_NAMES:Record<Language,string>={he:'עברית',ru:'Русский',en:'English'};
export const LOCALES:Record<Language,string>={he:'he-IL',ru:'ru-RU',en:'en-US'};
const rows = `
אישי|Personal|Личное
משפחה|Family|Семья
עבודה|Work|Работа
רעיונות|Ideas|Идеи
טיולים|Places & trips|Места и поездки
ימי הולדת|Birthdays|Дни рождения
הכול|All|Все
לביצוע|To do|Сделать
עם תזכורת|With reminders|С напоминанием
עם תמונה|With images|С изображениями
הושלמו|Completed|Завершённые
רעיון קטן ששווה לחזור אליו|A little idea worth revisiting|Идея, к которой стоит вернуться
מקום לכל המחשבות, גם אלה שעדיין לא הבשילו.|A place for every thought, even the unfinished ones.|Место для всех мыслей, даже ещё не оформившихся.
הרגשתי שיש כאן התחלה של משהו טוב.|It felt like the start of something good.|Я почувствовал, что это начало чего-то хорошего.
לפתוח שוב בסוף השבוע ולפתח את הרעיון.|Come back this weekend and develop the idea.|Вернуться на выходных и развить идею.
הטיול הבא שלנו|Our next trip|Наша следующая поездка
לשמור את המקום, את האנשים ואת הרגע שרציתי ליצור.|Remember the place, the people and the moment I wanted to create.|Сохранить место, людей и момент, который хотелось создать.
רציתי זמן עם המשפחה, בלי הסחות דעת.|I wanted time with family, without distractions.|Хотелось побыть с семьёй, ни на что не отвлекаясь.
מקום שעוד נבחר יחד|A place we will choose together|Место, которое мы выберем вместе
יום הולדת לדוגמה|Example birthday|Пример дня рождения
לתכנן משהו אישי מראש.|Plan something personal in advance.|Заранее придумать что-то особенное.
לכתוב ברכה ולבחור מתנה.|Write a greeting and choose a gift.|Написать поздравление и выбрать подарок.
לא הצלחנו לקרוא את התמונות. נסה שוב.|Unable to read the images. Please try again.|Не удалось прочитать изображения. Попробуйте ещё раз.
נשמרה תזכורת במכשיר, אך סטטוס ההתראה לא נשמר.|The reminder was scheduled, but its status could not be saved.|Напоминание запланировано, но его статус не удалось сохранить.
נשמר, והתזכורת נקבעה במכשיר.|Saved and scheduled on this device.|Сохранено. Напоминание запланировано на этом устройстве.
נשמר. בדפדפן אפשר להוסיף את התזכורת ליומן.|Saved. Add the reminder to your calendar from the card.|Сохранено. Добавьте напоминание в календарь из карточки.
נשמר. התראה לא נקבעה; בדוק הרשאות ולחץ על תזכורת בכרטיס.|Saved without an alert. Check permissions and tap Reminder on the card.|Сохранено без уведомления. Проверьте разрешения и нажмите «Напомнить» в карточке.
נשמר. יש למחשבה שלך מקום.|Saved. Your thought has a home.|Сохранено. У вашей мысли есть своё место.
השמירה נכשלה. ייתכן שאין מספיק מקום במכשיר.|Unable to save. Your device may be out of storage.|Не удалось сохранить. Возможно, на устройстве недостаточно места.
הפריט נשמר, אך עדכון ההתראה נכשל. בדוק הרשאות התראות.|Saved, but the alert could not be updated. Check notification permissions.|Сохранено, но уведомление не обновилось. Проверьте разрешения.
לא הצלחנו לשמור את השינוי.|Unable to save the change.|Не удалось сохранить изменение.
הפריט נמחק.|Item deleted.|Запись удалена.
המחיקה לא הושלמה. נסה שוב.|Unable to delete. Please try again.|Не удалось удалить. Попробуйте ещё раз.
למחוק את הזיכרון? ניתן לשחזר רק מגיבוי.|Delete this memory? Keep a backup first.|Удалить запись? Сначала сохраните резервную копию.
מחיקת זיכרון|Delete memory|Удалить запись
ניתן לשחזר רק מגיבוי שהורדת קודם.|Deletion is permanent. Save a backup first.|Удаление необратимо. Сначала сохраните резервную копию.
ביטול|Cancel|Отмена
מחיקה|Delete|Удалить
פתח את הקובץ ביומן ואשר את הוספת התזכורת.|Open the file in your calendar and confirm the reminder.|Откройте файл в календаре и подтвердите добавление.
התזכורת נקבעה במכשיר.|Reminder scheduled on this device.|Напоминание запланировано на этом устройстве.
ההתראה לא נקבעה. בדוק הרשאות ותאריך תזכורת.|Unable to schedule. Check permissions and the reminder date.|Не удалось запланировать. Проверьте разрешения и дату.
לא ניתן לקבוע את התזכורת כרגע.|Unable to schedule the reminder right now.|Сейчас не удалось запланировать напоминание.
הגדלת תמונה:|Enlarge image:|Увеличить изображение:
תוכן לדוגמה|Example content|Пример содержимого
דוגמה|Example|Пример
למה שמרתי|Why I saved this|Почему я это сохранил
מה רציתי לעשות|What I intended to do|Что я хотел сделать
♧ יום הולדת ·|♧ Birthday ·|♧ День рождения ·
● התראה נקבעה במכשיר הזה|● Alert scheduled on this device|● Уведомление запланировано на этом устройстве
להתראה: להוסיף ליומן|For an alert: add to calendar|Для уведомления добавьте в календарь
התראה לא נקבעה במכשיר|No alert scheduled on this device|Уведомление не запланировано
הגדלת תמונה|Enlarge image|Увеличить изображение
↶ לפתוח שוב|↶ Reopen|↶ Вернуть
✓ הושלם|✓ Done|✓ Готово
עריכה|Edit|Изменить
ליומן|Calendar|В календарь
תזכורת|Reminder|Напомнить
המקום שלי|My space|Моё пространство
▦ כל הזיכרונות|▦ All memories|▦ Все записи
הנושאים שלי|My topics|Мои темы
פחות להחזיק בראש.|Less to keep in mind.|Меньше держать в голове.
יותר מקום לחיים.|More room for life.|Больше места для жизни.
⚙ הגדרות וגיבוי|⚙ Settings & backup|⚙ Настройки и копии
✳ מקום לזכור|✳ A Place to Remember|✳ Место для воспоминаний
המחשבות שלך. המקום שלהן.|Your thoughts. Their home.|Ваши мысли. Их место.
＋ חדש|＋ New|＋ Добавить
המקום שלך, בשליטה שלך|Your space, your control|Ваше пространство под вашим контролем
שמירה מקומית|Local storage|Локальное хранение
הפריטים נשמרים במכשיר הזה. אין כרגע חשבון, העלאה לענן או סנכרון בין מכשירים.|Items are saved on this device. Accounts, cloud storage and sync are not connected yet.|Записи сохраняются на этом устройстве. Аккаунты, облако и синхронизация пока не подключены.
גיבוי הנתונים|Back up your data|Резервная копия
הגיבוי כולל טקסט ותמונות. שמור אותו במקום בטוח. קובץ עם תמונות רבות עשוי להיות גדול.|The backup includes text and images. Keep it somewhere safe. Many images can make the file large.|Копия содержит текст и изображения. Храните её в надёжном месте. При большом количестве фото файл может быть объёмным.
↓ הורדת גיבוי|↓ Download backup|↓ Скачать копию
קובץ הגיבוי הוכן.|Backup file prepared.|Файл резервной копии готов.
יצירת הגיבוי נכשלה.|Unable to create a backup.|Не удалось создать резервную копию.
בדרך לגרסת השקה|On the way to launch|На пути к запуску
בהמשך: חשבון אישי וסנכרון, קבלת פריטים מתפריט השיתוף בטלפון, ובדיקות בחנויות האפליקציות. אלה אינם זמינים בגרסה הזו.|Coming later: accounts, sync, receiving items from the phone share menu and app store testing. These are not available yet.|Далее: аккаунты, синхронизация, получение записей через меню «Поделиться» и тестирование в магазинах приложений. Пока недоступно.
מקום לזכור · גרסת פיתוח 0.1|A Place to Remember · Development version 0.1|Место для воспоминаний · Версия 0.1
חזרה לזיכרונות|Back to memories|К записям
הזיכרון השני שלך|Your second memory|Ваша вторая память
דברים שרצית לחזור אליהם|Things you wanted to revisit|То, к чему хотелось вернуться
האנשים שלא רוצים לשכוח|People you want to remember|Люди, о которых хочется помнить
כל מה שחשוב לך.|Everything that matters.|Всё, что вам важно.
וגם למה.|And why.|И почему.
ימי הולדת, רעיונות למתנה ותזכורת שחוזרת כל שנה.|Birthdays, gift ideas and a reminder every year.|Дни рождения, идеи подарков и ежегодные напоминания.
תמונות, רעיונות וכוונות — מסודרים במקום אחד.|Images, ideas and intentions, organised in one place.|Фото, идеи и намерения — всё в одном месте.
כל הנושאים|All topics|Все темы
חיפוש בזיכרונות|Search memories|Поиск записей
חיפוש בטקסט, בסיבה או בכוונה שלך…|Search text, reasons or intentions…|Поиск по тексту, причинам или намерениям…
ניקוי חיפוש|Clear search|Очистить поиск
כל הזיכרונות|All memories|Все записи
פריטים|items|записей
הכי חדשים|Newest first|Сначала новые
לפי תאריך|By date|По дате
תצוגת דוגמה בלבד · הפריטים האלה אינם נשמרים|Demo only · These items are not saved|Демонстрация · Эти записи не сохраняются
יציאה מהדוגמה|Exit demo|Выйти из демонстрации
לא הצלחנו לקרוא את הנתונים|Unable to load your data|Не удалось загрузить данные
הנתונים לא אופסו. נסה לפתוח שוב.|Your data was not reset. Please try again.|Данные не сброшены. Попробуйте ещё раз.
ניסיון נוסף|Try again|Повторить
אין פריטים שמתאימים לחיפוש|No matching items|Ничего не найдено
כאן מתחיל מקום פנוי בראש|Make some room in your mind|Освободите место в голове
נסה לשנות את החיפוש או הנושא.|Try a different search or topic.|Измените запрос или тему.
צילום מסך, משפט או מחשבה — מה תרצה לשמור ראשון?|A screenshot, a sentence or a thought. What will you save first?|Скриншот, фраза или мысль. Что сохраним первым?
＋ לשמור משהו חדש|＋ Save something new|＋ Сохранить новое
להציץ בתצוגת דוגמה|Explore the demo|Посмотреть пример
נשמר במכשיר הזה · הענן עדיין לא מחובר|Saved on this device · Cloud sync is not connected|Сохранено на устройстве · Облачная синхронизация не подключена
© 2026 כל הזכויות שמורות. אתר זה פותח על ידי דימה וול|© 2026 All rights reserved. Developed by Dima Vol.|© 2026 Все права защищены. Сайт разработан Димой Волом.
▦ הזיכרונות|▦ Memories|▦ Записи
◷ תזכורות|◷ Reminders|◷ Напоминания
♧ ימי הולדת|♧ Birthdays|♧ Дни рождения
⚙ הגדרות|⚙ Settings|⚙ Настройки
לתת למחשבה מקום|Give your thought a home|Найдите место для мысли
לחזור למה ששמרת|Revisit your memory|Вернуться к записи
מה תרצה לזכור?|What would you like to remember?|Что вы хотите запомнить?
סגירה ×|Close ×|Закрыть ×
כותרת|Title|Название
למי יש יום הולדת?|Whose birthday is it?|У кого день рождения?
משהו קטן שלא רציתי לשכוח|Something I did not want to forget|То, что не хотелось забыть
הוספת תמונות וצילומי מסך|Add photos and screenshots|Добавить фото и скриншоты
מהגלריה שלך|From your gallery|Из вашей галереи
הסרת תמונה|Remove image|Убрать изображение
מה חשוב לזכור?|What matters here?|Что важно запомнить?
המשפט, הרעיון או הפרטים שחשוב לשמור|The sentence, idea or details worth keeping|Фраза, идея или важные детали
למה שמרתי את זה?|Why did I save this?|Почему я это сохранил?
מה תפס אותי? למה זה חשוב לי?|What caught my attention? Why does it matter?|Что привлекло внимание? Почему это важно?
מה הייתה הכוונה שלי?|What was my intention?|Какое у меня было намерение?
מה רציתי לעשות עם זה בהמשך?|What did I want to do with this later?|Что я хотел сделать с этим потом?
נושא|Topic|Тема
או נושא חדש|Or a new topic|Или новая тема
שם הנושא שלך|Your topic name|Название вашей темы
מיקום, אם רלוונטי|Location, if relevant|Место, если нужно
שם מקום או כתובת|Place name or address|Название места или адрес
תאריך לידה · YYYY-MM-DD|Date of birth · YYYY-MM-DD|Дата рождения · ГГГГ-ММ-ДД
תזכורת שנתית בשעה 09:00, לאחר אישור הרשאת התראות. ילידי 29 בפברואר: תזכורת בשנים מעוברות בלבד.|A yearly reminder at 09:00 after notification permission. February 29 reminders occur in leap years only.|Ежегодное напоминание в 09:00 после разрешения уведомлений. Для 29 февраля — только в високосные годы.
מועד תזכורת · YYYY-MM-DD HH:mm|Reminder date · YYYY-MM-DD HH:mm|Дата напоминания · ГГГГ-ММ-ДД ЧЧ:мм
אפשר להשאיר ריק. השעה לפי המכשיר שלך.|Optional. Times use your device time zone.|Необязательно. Время по часовому поясу устройства.
בדפדפן תוכל להוסיף ליומן לאחר השמירה.|In the browser, add it to your calendar after saving.|В браузере можно добавить в календарь после сохранения.
נבקש הרשאה להתראות רק כשתשמור תזכורת.|We only ask for notification permission when you save a reminder.|Разрешение на уведомления запрашивается при сохранении напоминания.
שומר…|Saving…|Сохраняем…
לשמור את הזיכרון|Save memory|Сохранить запись
צריך לתת לזיכרון כותרת.|Please add a title.|Добавьте название.
יש להזין תאריך לידה תקין, למשל 1995-03-21.|Enter a valid date of birth, for example 1995-03-21.|Введите дату рождения, например 1995-03-21.
מועד התזכורת צריך להיות בעתיד, בפורמט 2026-12-31 09:00.|Enter a future reminder date, for example 2026-12-31 09:00.|Введите будущую дату, например 2026-12-31 09:00.
שפת הממשק|Interface language|Язык интерфейса
לא ניתן לשמור את בחירת השפה.|Unable to save your language preference.|Не удалось сохранить выбранный язык.
גיבוי בענן לפי בחירה|Save a backup to your cloud|Сохранить копию в облако
בחר שירות ושמור קובץ גיבוי. אין סנכרון אוטומטי.|Choose a service and save a backup file. This does not enable automatic sync.|Выберите сервис и сохраните файл. Автоматическая синхронизация не включается.
שמירה ב־Google Drive|Save to Google Drive|Сохранить в Google Drive
שמירה ב־iCloud Drive|Save to iCloud Drive|Сохранить в iCloud Drive
פתיחת Google Drive|Open Google Drive|Открыть Google Drive
פתיחת iCloud Drive|Open iCloud Drive|Открыть iCloud Drive
באייפון: בחר ״שמירה בקבצים״ ואז iCloud Drive. בגלקסי: בחר Google Drive בחלון השיתוף, אם האפליקציה מותקנת.|iPhone: choose Save to Files, then iCloud Drive. Galaxy: select Google Drive in the share sheet if the app is installed.|iPhone: выберите «Сохранить в Файлы», затем iCloud Drive. Galaxy: выберите Google Drive в меню «Поделиться», если приложение установлено.
אם חלון שיתוף קבצים אינו זמין, הקובץ ירד למכשיר. פתח את שירות הענן והעלה אותו ידנית.|If file sharing is unavailable, the file downloads to your device. Open your cloud service and upload it manually.|Если обмен файлами недоступен, файл скачается на устройство. Откройте облачный сервис и загрузите его вручную.
הקובץ הורד. פתח את שירות הענן והעלה את קובץ הגיבוי.|File downloaded. Open your cloud service and upload the backup.|Файл скачан. Откройте облако и загрузите резервную копию.
חלון השיתוף הושלם. ודא שהקובץ נשמר בענן שבחרת.|Sharing completed. Check that the file was saved to your chosen cloud.|Обмен завершён. Проверьте, что файл сохранился в выбранном облаке.
לא הצלחנו להכין את הגיבוי לענן.|Unable to prepare the cloud backup.|Не удалось подготовить копию для облака.
`;
export const translations:Record<string,{en:string;ru:string}>={};
for(const row of rows.trim().split('\n')){const [he,en,ru]=row.split('|');if(!he||!en||!ru)throw Error('Invalid translation row');translations[he]={en,ru};}
export function translate(text:string,language:Language):string{if(language==='he')return text;const key=text.trim();const value=translations[key]?.[language];if(!value)return text;return text.slice(0,text.indexOf(key))+value+text.slice(text.indexOf(key)+key.length);}
export function isLanguage(value:unknown):value is Language{return value==='he'||value==='ru'||value==='en'}
Object.assign(translations,{
'לימודים':{en:'Study',ru:'Учёба'},'▣ לימודים':{en:'▣ Study',ru:'▣ Учёба'},'✦ עזרה':{en:'✦ Help',ru:'✦ Помощь'},
'מרחב הלימודים שלך':{en:'Your learning space',ru:'Ваше учебное пространство'},'ללמוד בקצב שלך':{en:'Learn at your own pace',ru:'Учитесь в своём темпе'},
'כל החומר, השאלות והרעיונות במקום אחד.':{en:'Your materials, questions and ideas in one place.',ru:'Материалы, вопросы и идеи в одном месте.'},
'מה לומדים היום?':{en:'What are we learning today?',ru:'Что изучаем сегодня?'},'מטרת הלימוד שלי':{en:'My learning goal',ru:'Моя учебная цель'},
'למשל: להבין משוואות או לתרגל אנגלית':{en:'For example: understand equations or practise English',ru:'Например: разобраться в уравнениях или практиковать английский'},
'✦ פתיחת עוזר הלימוד':{en:'✦ Open study assistant',ru:'✦ Открыть учебного помощника'},'חומרי הלימוד שלי':{en:'My study materials',ru:'Мои учебные материалы'},
'שמור סיכומים, צילומי מחברת ומחשבות, וחזור אליהם כשנוח לך.':{en:'Save notes, notebook photos and thoughts. Revisit them whenever you like.',ru:'Сохраняйте конспекты, фото тетрадей и мысли. Возвращайтесь к ним в удобное время.'},
'＋ הוספת חומר לימוד':{en:'＋ Add study material',ru:'＋ Добавить материал'},'צפייה בחומרי הלימוד':{en:'View study materials',ru:'Смотреть материалы'},
'ללמוד בשלושה צעדים':{en:'Learn in three steps',ru:'Учёба в три шага'},'1. בחר נושא ומטרה קטנה.':{en:'1. Pick a topic and a small goal.',ru:'1. Выберите тему и небольшую цель.'},
'2. שמור את החומר ואת מה שלא ברור.':{en:'2. Save your materials and questions.',ru:'2. Сохраните материалы и вопросы.'},'3. נסה להסביר במילים שלך וחזור לשאלות.':{en:'3. Explain it in your own words and revisit your questions.',ru:'3. Объясните своими словами и вернитесь к вопросам.'},
'✦ העוזר שלי':{en:'✦ My assistant',ru:'✦ Мой помощник'},'חיפוש בשמורים':{en:'Search saved items',ru:'Поиск в записях'},'עזרה בלימוד':{en:'Study help',ru:'Помощь в учёбе'},
'חיפוש בפריטים שלך לפי טקסט ונושא. לחץ על תוצאה כדי להגיע אליה.':{en:'Search your items by text and topic. Tap a result to open it.',ru:'Ищите по тексту и теме. Нажмите на результат, чтобы открыть его.'},
'מה לחפש בשמורים?':{en:'What are you looking for?',ru:'Что найти в записях?'},'מילה, רעיון או סיבה לשמירה':{en:'A word, idea or reason you saved it',ru:'Слово, идея или причина сохранения'},
'פתיחת הפריט ←':{en:'Open item →',ru:'Открыть запись →'},'לא נמצאו פריטים מתאימים.':{en:'No matching items found.',ru:'Подходящие записи не найдены.'},
'אפשר לשאול על נושא לימוד ולקבל הסבר בתוך החלונית.':{en:'Ask a study question and get an explanation here.',ru:'Задайте учебный вопрос и получите объяснение здесь.'},
'מה תרצה להבין?':{en:'What would you like to understand?',ru:'В чём хотите разобраться?'},'כתוב את הנושא או השאלה שלך':{en:'Enter your topic or question',ru:'Введите тему или вопрос'},
'חיבור ה־AI עדיין בהקמה. לא נשלח חומר לשירות חיצוני בשלב הזה.':{en:'The AI connection is still being configured. No material is sent to an external service yet.',ru:'Подключение ИИ ещё настраивается. Пока материалы не отправляются внешнему сервису.'},
'שליחה לעוזר הלימוד':{en:'Ask the study assistant',ru:'Спросить помощника'}
});
Object.assign(translations,{
'חיפוש בחומרי הלימוד':{en:'Search study materials',ru:'Поиск учебных материалов'},
'⌕ חיפוש מהיר':{en:'⌕ Quick search',ru:'⌕ Быстрый поиск'},
'⌕ חיפוש בשמורים':{en:'⌕ Search saved items',ru:'⌕ Поиск в записях'}
});
Object.assign(translations,{
'חשבון אישי':{en:'My account',ru:'Мой аккаунт'},'הרשמה / התחברות':{en:'Sign up / Sign in',ru:'Регистрация / Вход'},'הרשמה':{en:'Sign up',ru:'Регистрация'},'התחברות':{en:'Sign in',ru:'Вход'},'אימייל':{en:'Email',ru:'Эл. почта'},'סיסמה':{en:'Password',ru:'Пароль'},'יצירת החשבון':{en:'Create account',ru:'Создать аккаунт'},'כניסה לחשבון':{en:'Sign in',ru:'Войти'},'רגע…':{en:'Please wait…',ru:'Подождите…'},
'לכל אחד חשבון נפרד עם הפריטים האישיים שלו.':{en:'Everyone has a separate account with their own private items.',ru:'У каждого отдельный аккаунт со своими личными записями.'},
'12 תווים לפחות. שמור את הסיסמה במנהל הסיסמאות; שחזור במייל עדיין לא זמין.':{en:'At least 12 characters. Keep it in your password manager; email password recovery is not available yet.',ru:'Не менее 12 символов. Сохраните пароль в менеджере паролей; восстановление по почте пока недоступно.'},
'שירות החשבונות אינו זמין כרגע. אפשר להמשיך לשמור מקומית.':{en:'Accounts are unavailable right now. You can still save on this device.',ru:'Сервис аккаунтов сейчас недоступен. Можно сохранять на устройстве.'},
'הפריטים נשמרים בחשבון שלך ונגישים לאחר התחברות במכשיר אחר.':{en:'Items are saved to your account and available when you sign in on another device.',ru:'Записи сохраняются в аккаунте и доступны при входе с другого устройства.'},
'העברת הפריטים מהמכשיר לחשבון':{en:'Copy device items to my account',ru:'Перенести записи с устройства в аккаунт'},'טעינה מחדש מהחשבון':{en:'Reload from account',ru:'Загрузить из аккаунта'},'יציאה מהחשבון':{en:'Sign out',ru:'Выйти'},
'ללא התחברות, הפריטים נשמרים בדפדפן הזה בלבד.':{en:'Without signing in, items are only saved in this browser.',ru:'Без входа записи хранятся только в этом браузере.'},'נשמר בחשבון האישי שלך':{en:'Saved to your personal account',ru:'Сохранено в вашем аккаунте'},'נשמר במכשיר הזה · ללא התחברות':{en:'Saved on this device · Not signed in',ru:'Сохранено на устройстве · Без входа'},
'התחברת לחשבון האישי שלך.':{en:'You are signed in to your account.',ru:'Вы вошли в свой аккаунт.'},'יצאת מהחשבון.':{en:'You are signed out.',ru:'Вы вышли из аккаунта.'},'הפריטים מהמכשיר נוספו לחשבון.':{en:'Your device items were copied to your account.',ru:'Записи с устройства добавлены в аккаунт.'},
'הנתונים השתנו במכשיר אחר. טען מחדש לפני שמירה נוספת.':{en:'Your data changed on another device. Reload before saving again.',ru:'Данные изменены на другом устройстве. Загрузите их заново перед сохранением.'},
'האימייל או הסיסמה אינם נכונים.':{en:'Incorrect email or password.',ru:'Неверный адрес почты или пароль.'},'יש להזין אימייל תקין וסיסמה באורך 12 תווים לפחות.':{en:'Enter a valid email and a password with at least 12 characters.',ru:'Введите адрес почты и пароль длиной не менее 12 символов.'},'האימייל כבר רשום. נסה להתחבר.':{en:'This email is already registered. Try signing in.',ru:'Этот адрес уже зарегистрирован. Попробуйте войти.'},'בוצעו ניסיונות רבים. נסה שוב מאוחר יותר.':{en:'Too many attempts. Please try again later.',ru:'Слишком много попыток. Повторите позже.'},'הפריטים גדולים מדי לשמירה אחת. הגודל המרבי כרגע הוא 20 MB.':{en:'Your items exceed the current 20 MB account workspace limit.',ru:'Превышен текущий лимит пространства аккаунта: 20 МБ.'},'יש להתחבר שוב לחשבון.':{en:'Please sign in again.',ru:'Войдите в аккаунт ещё раз.'},'לא הצלחנו להתחבר לשרת. הפריטים הקיימים לא נמחקו.':{en:'Unable to connect. Your existing items were not deleted.',ru:'Не удалось подключиться. Существующие записи не удалены.'},'הפעולה נכשלה. נסה שוב.':{en:'The action failed. Please try again.',ru:'Не удалось выполнить действие. Повторите попытку.'}
});
Object.assign(translations,{
'מתי להזכיר?':{en:'When should we remind you?',ru:'Когда напомнить?'},'ביום האירוע':{en:'On the event day',ru:'В день события'},'יום לפני האירוע':{en:'The day before',ru:'За день до события'},'צליל כבוי':{en:'Sound off',ru:'Без звука'},'צליל פעיל':{en:'Sound on',ru:'Со звуком'},'באתר יש להוסיף ליומן. הצליל נקבע לפי הגדרות אפליקציית היומן.':{en:'On the website, add the event to your calendar. Sound follows your calendar settings.',ru:'На сайте добавьте событие в календарь. Звук зависит от настроек календаря.'},'הצליל כפוף להרשאות ולהגדרות השקט של המכשיר.':{en:'Sound depends on your device permissions and silent mode.',ru:'Звук зависит от разрешений и беззвучного режима устройства.'}
});
Object.assign(translations,{
'בהמשך: שיתוף בין חשבונות, קבלת פריטים מתפריט השיתוף בטלפון ובדיקות בחנויות האפליקציות.':{en:'Coming later: sharing between accounts, receiving items from the phone share menu and app store testing.',ru:'Далее: обмен между аккаунтами, получение записей через меню «Поделиться» и тестирование в магазинах приложений.'}
});

Object.assign(translations,{
  "שם האדם": {
    "en": "Person’s name",
    "ru": "Имя человека"
  },
  "רק האנשים שחשובים לך": {
    "en": "The people who matter to you",
    "ru": "Люди, которые вам важны"
  },
  "אתה בוחר את מי לשמור. שום חבר לא מתווסף אוטומטית.": {
    "en": "You choose whom to save. No friends are added automatically.",
    "ru": "Вы выбираете, кого сохранить. Друзья не добавляются автоматически."
  },
  "＋ הוספת אדם": {
    "en": "＋ Add a person",
    "ru": "＋ Добавить человека"
  },
  "בחירה מתוך רשימה": {
    "en": "Choose from a list",
    "ru": "Выбрать из списка"
  },
  "התחברות פייסבוק אינה מייבאת את ימי ההולדת של כל החברים.": {
    "en": "Facebook sign-in does not import all your friends’ birthdays.",
    "ru": "Вход через Facebook не импортирует дни рождения всех друзей."
  },
  "המשך עם פייסבוק": {
    "en": "Continue with Facebook",
    "ru": "Продолжить с Facebook"
  },
  "החיבור לפייסבוק עדיין לא פעיל — ממתין להגדרת Meta.": {
    "en": "Facebook connection is not active yet — awaiting Meta setup.",
    "ru": "Подключение Facebook пока не активно — требуется настройка Meta."
  },
  "התחברות דרך פייסבוק זמינה באתר. לחשבון קיים: התחבר קודם באימייל ואז חבר פייסבוק בהגדרות.": {
    "en": "Facebook sign-in is available on the website. For an existing account, sign in with email first, then connect Facebook in Settings.",
    "ru": "Вход через Facebook доступен на сайте. Для существующего аккаунта сначала войдите по почте, затем подключите Facebook в настройках."
  },
  "בחירת אנשים לימי הולדת": {
    "en": "Choose birthday reminders",
    "ru": "Выберите дни рождения"
  },
  "הדבק עד 100 שורות: שם; YYYY-MM-DD. סמן רק את האנשים שתרצה לשמור.": {
    "en": "Paste up to 100 lines: name; YYYY-MM-DD. Select only the people you want to save.",
    "ru": "Вставьте до 100 строк: имя; YYYY-MM-DD. Отметьте только тех, кого хотите сохранить."
  },
  "רשימת אנשים ותאריכים": {
    "en": "Names and dates",
    "ru": "Имена и даты"
  },
  "זהו ייבוא ידני של רשימה שאתה מספק, ללא גישה לחשבון פייסבוק.": {
    "en": "This manually imports a list you provide, without accessing Facebook.",
    "ru": "Это ручной импорт вашего списка, без доступа к Facebook."
  },
  "האדם והתאריך כבר מופיעים ברשימה.": {
    "en": "This person and date are already listed.",
    "ru": "Этот человек и дата уже есть в списке."
  },
  "בדוק שם ותאריך תקין בפורמט YYYY-MM-DD.": {
    "en": "Check the name and enter a valid date as YYYY-MM-DD.",
    "ru": "Проверьте имя и дату в формате YYYY-MM-DD."
  },
  "נבחרו:": {
    "en": "Selected:",
    "ru": "Выбрано:"
  },
  "שמירת האנשים שבחרתי": {
    "en": "Save selected people",
    "ru": "Сохранить выбранных"
  },
  "האנשים שבחרת נשמרו. בכרטיס של כל אדם אפשר להוסיף תזכורת ליומן או למכשיר.": {
    "en": "Selected people saved. Use each person’s card to add a calendar or device reminder.",
    "ru": "Выбранные люди сохранены. В карточке каждого можно добавить напоминание в календарь или на устройство."
  },
  "לא ניתן לפתוח את פייסבוק כרגע.": {
    "en": "Unable to open Facebook right now.",
    "ru": "Не удалось открыть Facebook."
  },
  "חזרת מפייסבוק. אם ההתחברות נכשלה, נסה שוב דרך חלון ההתחברות.": {
    "en": "You returned from Facebook. If sign-in failed, try again from the sign-in dialog.",
    "ru": "Вы вернулись из Facebook. Если вход не выполнен, попробуйте снова в окне входа."
  }
});

Object.assign(translations,{"ההתחברות לפייסבוק הושלמה.":{"en":"Facebook sign-in completed.","ru":"Вход через Facebook выполнен."},"האימייל כבר רשום. התחבר באימייל ואז חבר פייסבוק בהגדרות.":{"en":"This email is already registered. Sign in with email, then connect Facebook in Settings.","ru":"Этот адрес уже зарегистрирован. Войдите по почте, затем подключите Facebook в настройках."},"פייסבוק לא מסרה כתובת אימייל. אפשר להירשם באימייל ואז לחבר פייסבוק בהגדרות.":{"en":"Facebook did not provide an email. Register with email, then connect Facebook in Settings.","ru":"Facebook не передал адрес почты. Зарегистрируйтесь по почте, затем подключите Facebook в настройках."},"ההתחברות לפייסבוק בוטלה.":{"en":"Facebook sign-in cancelled.","ru":"Вход через Facebook отменён."},"חשבון הפייסבוק כבר מקושר. לא בוצע שינוי.":{"en":"This Facebook account is already linked. Nothing was changed.","ru":"Аккаунт Facebook уже связан. Изменений нет."},"ההתחברות לפייסבוק לא הושלמה. נסה שוב.":{"en":"Facebook sign-in was not completed. Please try again.","ru":"Вход через Facebook не выполнен. Попробуйте снова."}});

Object.assign(translations,{"המשך עם Google":{"en":"Continue with Google","ru":"Продолжить с Google"},"הכניסה עם Google עדיין לא פעילה — ממתינה להגדרת החיבור.":{"en":"Google sign-in is not active yet — awaiting setup.","ru":"Вход через Google пока не активен — требуется настройка."},"חשבון קיים? התחבר באימייל ואז חבר את Google כאן. הקבצים נשארים במרחב הפרטי שלך באתר.":{"en":"Already have an account? Sign in with email, then connect Google here. Files stay in your private space on this website.","ru":"Уже есть аккаунт? Войдите по почте и подключите Google здесь. Файлы остаются в вашем личном пространстве на сайте."},"לא ניתן לפתוח את Google כרגע.":{"en":"Unable to open Google right now.","ru":"Не удалось открыть Google."},"התחברות Google אינה מייבאת את ימי ההולדת של כל החברים.":{"en":"Google sign-in does not import all your friends’ birthdays.","ru":"Вход через Google не импортирует дни рождения всех друзей."},"החיבור לGoogle עדיין לא פעיל — ממתין להגדרת Meta.":{"en":"Google connection is not active yet — awaiting Meta setup.","ru":"Подключение Google пока не активно — требуется настройка Meta."},"התחברות דרך Google זמינה באתר. לחשבון קיים: התחבר קודם באימייל ואז חבר Google בהגדרות.":{"en":"Google sign-in is available on the website. For an existing account, sign in with email first, then connect Google in Settings.","ru":"Вход через Google доступен на сайте. Для существующего аккаунта сначала войдите по почте, затем подключите Google в настройках."},"זהו ייבוא ידני של רשימה שאתה מספק, ללא גישה לחשבון Google.":{"en":"This manually imports a list you provide, without accessing Google.","ru":"Это ручной импорт вашего списка, без доступа к Google."},"חזרת מGoogle. אם ההתחברות נכשלה, נסה שוב דרך חלון ההתחברות.":{"en":"You returned from Google. If sign-in failed, try again from the sign-in dialog.","ru":"Вы вернулись из Google. Если вход не выполнен, попробуйте снова в окне входа."},"ההתחברות לGoogle הושלמה.":{"en":"Google sign-in completed.","ru":"Вход через Google выполнен."},"האימייל כבר רשום. התחבר באימייל ואז חבר Google בהגדרות.":{"en":"This email is already registered. Sign in with email, then connect Google in Settings.","ru":"Этот адрес уже зарегистрирован. Войдите по почте, затем подключите Google в настройках."},"Google לא מסרה כתובת אימייל. אפשר להירשם באימייל ואז לחבר Google בהגדרות.":{"en":"Google did not provide an email. Register with email, then connect Google in Settings.","ru":"Google не передал адрес почты. Зарегистрируйтесь по почте, затем подключите Google в настройках."},"ההתחברות לGoogle בוטלה.":{"en":"Google sign-in cancelled.","ru":"Вход через Google отменён."},"חשבון הGoogle כבר מקושר. לא בוצע שינוי.":{"en":"This Google account is already linked. Nothing was changed.","ru":"Аккаунт Google уже связан. Изменений нет."},"ההתחברות לGoogle לא הושלמה. נסה שוב.":{"en":"Google sign-in was not completed. Please try again.","ru":"Вход через Google не выполнен. Попробуйте снова."}});

Object.assign(translations,{
'החשבון והנתונים שלו נמחקו.':{en:'Your account and its data were deleted.',ru:'Аккаунт и его данные удалены.'},
'מחיקת החשבון תסיר לצמיתות את כל הזיכרונות והתמונות שלך מהשרת. אי אפשר לשחזר אותם, אלא מגיבוי שהורדת.':{en:'Deleting your account permanently removes all your memories and images from the server. They can only be restored from a backup you downloaded.',ru:'Удаление аккаунта навсегда сотрёт все ваши записи и изображения с сервера. Восстановить их можно только из скачанной резервной копии.'},
'הקלד את כתובת האימייל שלך לאישור':{en:'Type your email address to confirm',ru:'Введите адрес почты для подтверждения'},
'מחיקת החשבון לצמיתות':{en:'Delete account permanently',ru:'Удалить аккаунт навсегда'},
'מחיקת החשבון':{en:'Delete account',ru:'Удалить аккаунт'},
'האימייל שהוקלד אינו תואם לחשבון.':{en:'The email you typed does not match this account.',ru:'Введённая почта не совпадает с аккаунтом.'}
});

Object.assign(translations,{
'12 תווים לפחות. שמור את הסיסמה במנהל הסיסמאות.':{en:'At least 12 characters. Keep your password in a password manager.',ru:'Не менее 12 символов. Храните пароль в менеджере паролей.'},
'שחזור סיסמה':{en:'Password recovery',ru:'Восстановление пароля'},
'שכחתי סיסמה':{en:'Forgot my password',ru:'Забыл пароль'},
'נשלח אליך קוד בן 8 ספרות לאימייל. הקוד תקף ל־15 דקות.':{en:'We will email you an 8-digit code. It is valid for 15 minutes.',ru:'Мы отправим на почту 8-значный код. Он действует 15 минут.'},
'אם האימייל רשום אצלנו, נשלח אליו קוד בן 8 ספרות. הזן אותו כאן יחד עם סיסמה חדשה.':{en:'If the email is registered, an 8-digit code was sent to it. Enter it here with a new password.',ru:'Если почта зарегистрирована, на неё отправлен 8-значный код. Введите его здесь и задайте новый пароль.'},
'קוד מהאימייל':{en:'Code from the email',ru:'Код из письма'},
'סיסמה חדשה':{en:'New password',ru:'Новый пароль'},
'שליחת קוד':{en:'Send code',ru:'Отправить код'},
'כבר יש לי קוד':{en:'I already have a code',ru:'У меня уже есть код'},
'החלפת סיסמה':{en:'Change password',ru:'Сменить пароль'},
'חזרה להתחברות':{en:'Back to sign in',ru:'Назад ко входу'},
'הסיסמה הוחלפה. אפשר להתחבר עם הסיסמה החדשה.':{en:'Password changed. You can now sign in with the new password.',ru:'Пароль изменён. Теперь можно войти с новым паролем.'},
'שחזור סיסמה במייל עדיין לא הופעל באתר.':{en:'Password recovery by email is not enabled on this site yet.',ru:'Восстановление пароля по почте на сайте пока не включено.'},
'הקוד שגוי או שפג תוקפו. בקש קוד חדש.':{en:'The code is wrong or expired. Request a new one.',ru:'Код неверный или истёк. Запросите новый.'}
});

Object.assign(translations,{
'הלואין שמח! גם הזיכרונות הכי מפחידים מקבלים מקום.':{en:'Happy Halloween! Even the spookiest memories get a place here.',ru:'Счастливого Хэллоуина! Даже самые жуткие воспоминания найдут здесь место.'},
'🎃 הלואין שמח מכל הלב 🦇':{en:'🎃 Happy Halloween from the bottom of our hearts 🦇',ru:'🎃 Счастливого Хэллоуина от всего сердца 🦇'},
'מראה האתר':{en:'Look and feel',ru:'Оформление'},
'עיצוב חגיגי להלואין עם דלעות, עטלפים ורוחות רפאים.':{en:'A festive Halloween look with pumpkins, bats and ghosts.',ru:'Праздничное оформление к Хэллоуину: тыквы, летучие мыши и привидения.'},
'חזרה לעיצוב הרגיל':{en:'Back to the regular look',ru:'Вернуть обычное оформление'},
'הפעלת עיצוב הלואין 🎃':{en:'Turn on Halloween look 🎃',ru:'Включить оформление Хэллоуин 🎃'}
});

Object.assign(translations,{
'לא ניתן לפתוח את הדף כרגע.':{en:'The page cannot be opened right now.',ru:'Сейчас не удаётся открыть страницу.'},
'בהרשמה אתה מאשר את':{en:'By registering you accept the',ru:'Регистрируясь, вы принимаете'},
'מדיניות הפרטיות':{en:'privacy policy',ru:'политику конфиденциальности'},
'פרטיות':{en:'Privacy',ru:'Конфиденциальность'},
'כאן מוסבר איזה מידע נשמר, איפה, ואיך מוחקים אותו.':{en:'What data is stored, where, and how to delete it.',ru:'Какие данные хранятся, где и как их удалить.'},
'מדיניות פרטיות':{en:'Privacy policy',ru:'Политика конфиденциальности'}
});

Object.assign(translations,{
'הנתונים מהמכשיר השני מוזגו עם השינוי שלך.':{en:'Changes from your other device were merged with yours.',ru:'Изменения с другого устройства объединены с вашими.'},
'הנתונים השתנו במכשיר אחר ולא הצלחנו לאחד אותם. נסה שוב בעוד רגע.':{en:'Your data changed on another device and could not be merged. Try again in a moment.',ru:'Данные изменились на другом устройстве, и объединить их не удалось. Повторите через минуту.'}
});

Object.assign(translations,{
'יש להזין כתובת אימייל תקינה.':{en:'Enter a valid email address.',ru:'Введите действительный адрес электронной почты.'},
'הסיסמה צריכה להכיל בין 12 ל־128 תווים.':{en:'Use a password of 12 to 128 characters.',ru:'Пароль должен содержать от 12 до 128 символов.'},
'הסיסמאות אינן תואמות. הקלד אותן שוב.':{en:'The passwords do not match. Enter them again.',ru:'Пароли не совпадают. Введите их ещё раз.'},
'אימות סיסמה':{en:'Confirm password',ru:'Подтвердите пароль'},
'הצגת סיסמה':{en:'Show password',ru:'Показать пароль'},
'הסתרת סיסמה':{en:'Hide password',ru:'Скрыть пароль'},
'בקשת קוד חדש':{en:'Request a new code',ru:'Запросить новый код'},
'החשבון השתנה בלשונית אחרת. רענן את הדף לפני המשך העבודה.':{en:'The account changed in another tab. Reload this page before continuing.',ru:'Аккаунт изменился в другой вкладке. Обновите страницу, прежде чем продолжить.'}
});

Object.assign(translations,{
  "שמירה וגיבויים": {
    "en": "Storage and backups",
    "ru": "Хранение и резервные копии"
  },
  "הפריטים נשמרים בחשבון האישי:": {
    "en": "Items are saved in your account:",
    "ru": "Данные сохраняются в вашем аккаунте:"
  },
  "הפריטים נשמרים במכשיר הזה בלבד. התחבר כדי לשמור בחשבון.": {
    "en": "Items are only on this device. Sign in to save to your account.",
    "ru": "Данные хранятся только на этом устройстве. Войдите, чтобы сохранять их в аккаунте."
  },
  "גיבוי נוסף ב־Drive או ב־iCloud שומר עותק אצלך. השמירה מתבצעת דרך קובץ, ביוזמתך.": {
    "en": "A Drive or iCloud backup gives you a separate copy. You choose when to save the file.",
    "ru": "Резервная копия в Drive или iCloud остаётся у вас. Вы сами выбираете, когда сохранить файл."
  },
  "הורדת קובץ גיבוי": {
    "en": "Download a backup file",
    "ru": "Скачать резервную копию"
  },
  "שמירת קובץ ב־Google Drive": {
    "en": "Save a file to Google Drive",
    "ru": "Сохранить файл в Google Drive"
  },
  "שמירת קובץ ב־iCloud Drive": {
    "en": "Save a file to iCloud Drive",
    "ru": "Сохранить файл в iCloud Drive"
  },
  "קובץ הגיבוי הוכן. ודא ששמרת אותו במקום בטוח.": {
    "en": "Backup prepared. Check that you saved it somewhere safe.",
    "ru": "Резервная копия подготовлена. Убедитесь, что сохранили её в надёжном месте."
  },
  "חלון השיתוף נסגר. ודא שהקובץ נשמר בענן שבחרת.": {
    "en": "Sharing closed. Check that the file was saved in your chosen cloud.",
    "ru": "Окно отправки закрыто. Проверьте, сохранился ли файл в выбранном облаке."
  },
  "הקובץ הורד. העלה אותו ל־Drive או ל־iCloud כדי להשלים את הגיבוי.": {
    "en": "File downloaded. Upload it to Drive or iCloud to finish your backup.",
    "ru": "Файл скачан. Загрузите его в Drive или iCloud для завершения резервного копирования."
  },
  "בטלפון: בחר Drive או שמירה בקבצים בחלון השיתוף. אין העלאה אוטומטית לענן החיצוני.": {
    "en": "On your phone, select Drive or Save to Files in the share sheet. External cloud upload is not automatic.",
    "ru": "На телефоне выберите Drive или «Сохранить в Файлы» в меню отправки. Автоматической загрузки во внешнее облако нет."
  },
  "שחזור מקובץ גיבוי": {
    "en": "Restore from a backup file",
    "ru": "Восстановить из резервной копии"
  },
  "בחר קובץ JSON מההורדות, מ־Drive או מ־iCloud. השחזור מוסיף פריטים ושומר גם את הקיימים.": {
    "en": "Choose a JSON file from Downloads, Drive or iCloud. Recovery adds items and keeps existing ones.",
    "ru": "Выберите JSON-файл из загрузок, Drive или iCloud. Восстановление добавляет записи, сохраняя существующие."
  },
  "גרסאות קודמות בחשבון": {
    "en": "Previous account versions",
    "ru": "Предыдущие версии аккаунта"
  },
  "נשמרות עד שלוש גרסאות קודמות, החל מהעדכון הזה. זה אינו גיבוי קבוע; שמור גם קובץ חיצוני.": {
    "en": "Up to three previous versions are kept starting with this update. This is not a permanent backup; also save an external file.",
    "ru": "Начиная с этого обновления хранятся до трёх предыдущих версий. Это не постоянный архив: сохраняйте также отдельный файл."
  },
  "הצגת גרסאות לשחזור": {
    "en": "Show recovery versions",
    "ru": "Показать версии для восстановления"
  },
  "עדיין אין גרסאות קודמות בחשבון.": {
    "en": "No previous account versions yet.",
    "ru": "Предыдущих версий пока нет."
  },
  "גרסה": {
    "en": "Version",
    "ru": "Версия"
  },
  "בדיקה לפני שחזור": {
    "en": "Review before recovery",
    "ru": "Проверка перед восстановлением"
  },
  "פריטים בקובץ:": {
    "en": "Items in backup:",
    "ru": "Записей в копии:"
  },
  "כפילויות זהות ידולגו. פריט ששונה יתווסף כעותק, בלי לדרוס את הקיים. תזכורות דורשות קביעה מחדש.": {
    "en": "Identical duplicates are skipped. Changed items are added as copies without overwriting existing items. Reminders must be scheduled again.",
    "ru": "Одинаковые записи пропускаются. Изменённые добавляются как копии без перезаписи существующих. Уведомления нужно настроить заново."
  },
  "הוספת הפריטים מהגיבוי": {
    "en": "Add items from backup",
    "ru": "Добавить записи из копии"
  },
  "ביטול השחזור": {
    "en": "Cancel recovery",
    "ru": "Отменить восстановление"
  },
  "השחזור נשמר. הפריטים הקיימים נשמרו גם הם.": {
    "en": "Recovery saved. Existing items were kept too.",
    "ru": "Восстановление сохранено. Существующие записи также сохранены."
  },
  "זה אינו קובץ גיבוי תקין של מקום לזכור.": {
    "en": "This is not a valid Makom Lizkor backup.",
    "ru": "Это не подходящий файл резервной копии Makom Lizkor."
  },
  "קובץ הגיבוי או מספר הפריטים גדולים מדי.": {
    "en": "The backup file or item count is too large.",
    "ru": "Файл резервной копии или число записей слишком велико."
  },
  "הפעולה בוטלה.": {
    "en": "Action cancelled.",
    "ru": "Действие отменено."
  },
  "הפעולה לא הושלמה. הפריטים הקיימים לא נמחקו.": {
    "en": "Action incomplete. Existing items were not deleted.",
    "ru": "Действие не завершено. Существующие записи не удалены."
  },
  "יש לטעון את החשבון לפני שמירה. נסה שוב.": {
    "en": "Load the account before saving. Try again.",
    "ru": "Загрузите аккаунт перед сохранением. Повторите попытку."
  },
  "השמירה הקודמת עדיין מתבצעת. המתן רגע.": {
    "en": "The previous save is still running. Wait a moment.",
    "ru": "Предыдущее сохранение ещё выполняется. Подождите немного."
  },
  "לא ניתן לקרוא את השמירה הקודמת. הנתונים לא הוחלפו. נסה שוב.": {
    "en": "The previous save could not be read. Data was not replaced. Try again.",
    "ru": "Не удалось прочитать предыдущее сохранение. Данные не заменены. Повторите попытку."
  }
});
