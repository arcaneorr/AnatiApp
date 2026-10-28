import { DAY, HOUR, MINUTE, daysBetween, fmtTime, hhmm } from '../domain/time';
import type { CreditKind } from '../domain/types';
import type { Messages } from './messages';

// Hebrew copy. Neutral phrasing where Hebrew allows it; the studio addresses
// its (women) members in the feminine, so remaining direct address does too.
const WD_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const;
const WD_LONG = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

const dateFmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

const date = (t: number) => dateFmt.format(t);
const day = (t: number) => `יום ${WD_SHORT[new Date(t).getDay()]}, ${date(t)}`;
const money = (n: number) => `₪${n.toLocaleString('en-US')}`;
const toUnit = (kind: CreditKind) => (kind === 'monthly' ? 'למנוי' : 'לכרטיסייה');

const hoursText = (h: number) => (h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`);
const daysText = (d: number) => (d === 1 ? 'יום' : d === 2 ? 'יומיים' : `${d} ימים`);
const classes = (n: number) => (n === 1 ? 'שיעור אחד' : `${n} שיעורים`);
const left = (n: number, noun: string) => (n === 1 ? `נותר ${noun === 'מקומות' ? 'מקום אחד' : 'שיעור אחד'}` : `נותרו ${n} ${noun}`);

function relative(target: number, now: number): string {
  const diff = target - now;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < HOUR) {
    const m = Math.max(1, Math.floor(abs / MINUTE));
    text = m === 1 ? 'דקה' : `${m} דק׳`;
  } else if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.floor((abs % HOUR) / MINUTE);
    text = m ? `${hoursText(h)} ו־${m} דק׳` : hoursText(h);
  } else {
    const d = Math.floor(abs / DAY);
    const h = Math.floor((abs % DAY) / HOUR);
    text = h ? `${daysText(d)} ו־${hoursText(h)}` : daysText(d);
  }
  return diff >= 0 ? `בעוד ${text}` : `לפני ${text}`;
}

function weekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return 'א׳–ה׳';
  return sorted.map((d) => WD_SHORT[d]).join(', ');
}

const classType = { Reformer: 'רפורמר', Chair: 'כיסא', Barre: 'בר', Rehab: 'שיקומי' } as const;
const level = { all: 'כל הרמות', experienced: 'עם ניסיון בסיסי', tailored: 'מותאם אישית' } as const;
const classTypeLong = {
  Reformer: 'פילאטיס רפורמר',
  Chair: 'פילאטיס כיסא',
  Barre: 'פילאטיס בר',
  Rehab: 'פילאטיס שיקומי',
} as const;

export const he: Messages = {
  lang: 'he',
  dir: 'rtl',
  locale: 'he-IL',

  weekdayShort: WD_SHORT,
  weekdayLong: WD_LONG,
  day,
  date,
  monthYear: (t) => monthFmt.format(t),
  dayTime: (t) => `${day(t)}, ${fmtTime(t)}`,
  relative,
  dayLabel: (t, now) => {
    const diff = daysBetween(now, t);
    return diff === 0 ? 'היום' : diff === 1 ? 'מחר' : day(t);
  },
  dayChip: (t, now) => {
    const diff = daysBetween(now, t);
    return diff === 0 ? 'היום' : diff === 1 ? 'מחר' : `${WD_SHORT[new Date(t).getDay()]} ${new Date(t).getDate()}`;
  },
  minutes: (n) => `${n} דק׳`,
  money,
  weekdays,

  classType,
  classTypeLong,
  classBlurb: {
    Reformer: 'כוח, יציבה, גמישות ושליטה בתנועה על מכשיר הרפורמר. מתאים לכל רמות הכושר.',
    Chair: 'אימון דינמי ומאתגר על הכיסא, לחיזוק, יציבות ושיווי משקל. מתאים למי שכבר מכירה פילאטיס.',
    Barre: 'עקרונות הפילאטיס עם השראה מעולם הבלט: כוח, יציבה, שיווי משקל וסיבולת לכל הגוף.',
    Rehab: 'אימון מותאם אישית לשיקום: מצבים אורתופדיים ונוירולוגיים, כאבים, פציעות או אחרי לידה.',
  },
  level,
  plan: {
    m4: 'מנוי 4+1',
    m6: 'מנוי 6+1',
    m8: 'מנוי 8+1',
    m12: 'מנוי 12+1',
    c10: 'כרטיסיית 10',
    c15: 'כרטיסיית 15',
    c20: 'כרטיסיית 20',
  },
  session: (type, start) => `${classType[type]}, ${day(start)} ב־${fmtTime(start)}`,
  fallback: { branch: 'סניף אחר', coach: 'מדריכה', member: 'מתאמנת' },

  block: {
    past: 'השיעור כבר התחיל.',
    notOpen: (at) => `ההרשמה תיפתח ב${day(at)} ב־${fmtTime(at)}.`,
    already: 'כבר יש הרשמה לשיעור הזה.',
    frozen: (until) => `המנוי מוקפא עד ${day(until)}.`,
    cardEmpty: 'לא נשארו כניסות בכרטיסייה.',
    cardExpired: 'תוקף הכרטיסייה נגמר לפני מועד השיעור.',
    monthlyUsed: (total, renewsOn) =>
      `ניצלת את כל ${total} השיעורים של החודש.${renewsOn ? ` המנוי מתחדש ב־${date(renewsOn)}.` : ''}`,
    noWaiver: 'לפני השיעור הראשון צריך לחתום על הצהרת בריאות. זה לוקח כ־20 שניות.',
    conflict: (type, start) => `חופף לשיעור ${classType[type]} שלך ב־${fmtTime(start)}.`,
    full: 'השיעור מלא. אפשר להצטרף לרשימת ההמתנה.',
  },
  warn: {
    sameDay: (items) => `באותו יום יש לך גם: ${items.map((i) => `${classType[i.type]} ב־${fmtTime(i.start)}`).join(', ')}.`,
    otherBranch: (branch) => `השיעור הזה מתקיים ב${branch}, לא בסניף הקבוע שלך.`,
    lateWindow: (hours) => `השיעור מתחיל בעוד פחות מ־${hours} שעות, אז ביטול ייחשב מאוחר.`,
  },
  terms: {
    free: (deadline, now, kind) =>
      `אפשר לבטל בלי חיוב עד ${day(deadline)} ב־${fmtTime(deadline)} (${relative(deadline, now)}), והשיעור יחזור ${toUnit(kind)}.`,
    late: (kind) => `ביטול עכשיו ייחשב מאוחר, והשיעור לא יחזור ${toUnit(kind)}.`,
  },
  notice: {
    booked: (what, who) => (who ? `ההרשמה של ${who} אושרה: ${what}.` : `נרשמת לשיעור ${what}.`),
    noBookingToCancel: 'אין הרשמה לבטל.',
    cancelled: (kind) => `ההרשמה בוטלה, והשיעור חזר ${toUnit(kind)}.`,
    cancelledLate: 'ההרשמה בוטלה באיחור, והשיעור נספר.',
    joinedWaitlist: (position, pct, autoAccept) =>
      `מקום ${position} ברשימת ההמתנה (סיכוי של כ־${pct}%).${
        autoAccept ? ' אם יתפנה מקום, נרשום אוטומטית.' : ' אם יתפנה מקום, נשמור אותו בשבילך.'
      }`,
    notOnWaitlist: 'אין הרשמה לרשימת ההמתנה הזו.',
    leftWaitlist: 'יצאת מרשימת ההמתנה.',
    autoBooked: (what, who) => `יש מקום! הרשמה אוטומטית מרשימת ההמתנה עבור ${who}: ${what}.`,
    spotHeld: (what, who, until) => `התפנה מקום בשיעור ${what}. המקום שמור עבור ${who} עד ${fmtTime(until)}.`,
    noHeldSpot: 'אין מקום ששמור עבורך.',
    holdExpiredSorry: 'זמן השמירה על המקום נגמר.',
    claimed: (what) => `המקום אושר: ${what}.`,
    released: 'המקום שוחרר לרשימת ההמתנה.',
    holdExpired: (what) => `זמן השמירה על המקום בשיעור ${what} נגמר.`,
    nobodyToCancel: 'אין בשיעור הזה הרשמה אחרת לבטל.',
    demoCancelled: (name) => `הדגמה: ${name} ביטלה.`,
    alreadyFrozen: 'המנוי כבר מוקפא.',
    frozen: (until, kind, newDate, cancelled) =>
      `המנוי מוקפא עד ${day(until)}.` +
      (newDate ? ` ${kind === 'monthly' ? 'מועד החידוש' : 'תוקף הכרטיסייה'} נדחה ל־${date(newDate)}.` : '') +
      (cancelled === 1 ? ' הרשמה אחת בתקופה הזו בוטלה בלי חיוב.' : cancelled ? ` ${cancelled} הרשמות בתקופה הזו בוטלו בלי חיוב.` : ''),
    notFrozen: 'המנוי לא מוקפא.',
    unfrozen: (unused) =>
      `המנוי פעיל שוב. ${unused === 1 ? 'יום הקפאה אחד שלא נוצל ירד' : `${unused} ימי הקפאה שלא נוצלו ירדו`} מהתאריכים.`,
    cardNotFound: 'הכרטיס לא נמצא.',
    cardRemoved: (brand, last4) => `כרטיס ${brand} שמסתיים ב־${last4} הוסר מהחשבון.`,
    addCardHint: 'כדאי להוסיף כרטיס לפני החידוש הבא, כדי שהמנוי ימשיך.',
    signatureTooShort: 'כדי לחתום, יש להקליד שם מלא.',
    waiverSigned: 'הצהרת הבריאות נחתמה.',
    cannotTopUp: 'מנוי חודשי מתחדש כל חודש, אז אין מה להוסיף.',
    toppedUp: (pack, price) => `נוספה כרטיסיית ${pack} (${money(price)}, רכישת הדגמה בלי תשלום אמיתי).`,
    activeAgain: (name) => `המנוי של ${name} פעיל שוב.`,
    branchSet: (branch) => `הסניף הקבוע עודכן ל${branch}. נזכור את זה.`,
    contacted: (name) => `סומן שנוצר קשר עם ${name}.`,
    demoReset: 'נתוני ההדגמה אופסו.',
    copied: 'ההודעה הועתקה. אפשר להדביק אותה בוואטסאפ או ב־SMS.',
    copyFailed: 'ההעתקה נכשלה. אפשר לסמן את הטקסט ולהעתיק ידנית.',
  },
  status: {
    attended: 'השתתפת',
    booked: 'רשומה',
    missed: 'לא התפנה מקום',
    waitlist: (position) => `בהמתנה · ${position}`,
    held: 'מקום שמור',
    cancelled: 'בוטל',
    lateCancel: 'ביטול מאוחר',
    leftWaitlist: 'יצאת מההמתנה',
    released: 'שוחרר',
    holdExpired: 'השמירה נגמרה',
  },
  charge: {
    fromPlan: (kind) => (kind === 'monthly' ? 'שיעור מהמנוי החודשי' : 'כניסה אחת מהכרטיסייה'),
    lateCounted: 'ביטול מאוחר: השיעור נספר',
    none: 'ללא חיוב',
  },

  churnReason: (c) => {
    if (c.reason === 'new') return 'מתאמנת חדשה, עדיין אין מספיק נתונים';
    if (c.reason === 'occasional') return 'מגיעה מדי פעם';
    const visits = c.recentVisits === 0 ? 'אף ביקור' : c.recentVisits === 1 ? 'ביקור אחד' : `${c.recentVisits} ביקורים`;
    return (
      `בדרך כלל ${c.baselinePerWeek.toFixed(1)} בשבוע, ${visits} בשבועיים האחרונים` +
      (c.daysSinceLast !== null ? `, ביקור אחרון לפני ${c.daysSinceLast} ימים` : '')
    );
  },
  suggestionTitle: (s) => {
    const when = `${hhmm(s.startMinutes)} (${weekdays(s.weekdays)})`;
    return s.kind === 'add'
      ? `להוסיף עוד שיעור ${classType[s.type]} ב־${when}`
      : `לחשוב מחדש על ${classType[s.type]} ב־${when}`;
  },
  suggestionDetail: (s) => {
    const where = s.branch ? `${s.branch}: ` : '';
    return s.kind === 'add'
      ? `${where}מלא ב־${s.full} מתוך ${s.n} שיעורים בארבעת השבועות האחרונים, ובכל פעם ממתינות בממוצע ${s.avgWait.toFixed(1)}.`
      : `${where}תפוסה ממוצעת של ${Math.round(s.avgFill * 100)}% (${(s.avgFill * s.capacity).toFixed(1)} מתוך ${s.capacity} מקומות). אפשר להעביר לשעה עמוסה יותר או לאחד עם שיעור סמוך.`;
  },
  winBack: (first, studio, usual) =>
    `היי ${first}! התגעגענו אלייך ב${studio} 🤍 לשמור לך מקום ${
      usual
        ? `בשיעור ה${classType[usual.type]} שלך ביום ${WD_LONG[usual.weekday]} ב־${hhmm(usual.startMinutes)}`
        : 'בשיעור השבוע'
    }? רק תשלחי לנו הודעה, ונרשום אותך.`,

  ics: {
    title: (type, studio) => `${classTypeLong[type]} ב${studio}`,
    description: (coach, lvl) => `מדריכה: ${coach}. רמה: ${level[lvl]}.`,
    reminder: 'תזכורת לשיעור',
  },

  ui: {
    app: {
      tagline: 'אב־טיפוס, נתוני הדגמה בלבד',
      view: 'תצוגת אב־טיפוס',
      member: 'אפליקציית מתאמנות',
      owner: 'תובנות ניהול',
      reset: 'איפוס הדגמה',
      language: 'שפה',
      branch: 'סניף קבוע',
      profiles: 'פרופיל פעיל',
    },
    tabs: { nav: 'ניווט ראשי', home: 'בית', schedule: 'מערכת שעות', bookings: 'ההרשמות שלי', me: 'פרופיל' },
    common: {
      close: 'סגירה',
      dismiss: 'סגירת ההודעה',
      details: 'פרטים',
      addToCalendar: 'הוספה ליומן',
      book: 'הרשמה',
      signAndBook: 'חתימה והרשמה',
      frozen: 'מוקפא',
      active: 'פעיל',
    },
    capacity: {
      left: (n, capacity) => (n === 1 ? `נותר מקום אחד מתוך ${capacity}` : `נותרו ${n} מתוך ${capacity} מקומות`),
      fullWaitlist: (n) => `מלא, ${n} בהמתנה`,
      full: 'מלא',
    },
    membership: {
      eyebrow: 'המנוי שלך',
      monthly: (n, total, renewsOn, price) =>
        `${left(n, 'שיעורים')} מתוך ${total} החודש. מתחדש ${renewsOn ? `ב־${date(renewsOn)}` : 'כל חודש'} (${money(price)}).`,
      card: (n, total, expiresOn) => `${left(n, 'שיעורים')} מתוך ${total}.${expiresOn ? ` בתוקף עד ${date(expiresOn)}.` : ''}`,
      frozenUntil: (until) => `מוקפא עד ${day(until)}.`,
      used: (used, total, kind) =>
        `${used === 1 ? 'נוצל שיעור אחד' : `נוצלו ${used}`} מתוך ${total}${kind === 'monthly' ? ' החודש' : ''}`,
      manage: 'ניהול המנוי',
    },
    home: {
      hello: (hour, name) =>
        `${hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'}, ${name}`,
      quickEyebrow: 'עוד אין הרשמות',
      quickTitle: 'הרשמה מהירה',
      quickEmpty: 'אין שיעורים פתוחים בשבוע הקרוב.',
      viewAll: 'לכל השיעורים',
      daysLabel: 'בחירת יום',
      bookedCount: (booked, capacity) => `${booked}/${capacity} נרשמו`,
      fullTag: (waiting) => (waiting ? `מלא · ${waiting} בהמתנה` : 'מלא'),
      fullSchedule: 'למערכת השעות המלאה',
      offerEyebrow: 'שמרנו לך מקום',
      offerText: (until, now) => `אפשר לאשר עד ${fmtTime(until)} (${relative(until, now)}). אחרי זה המקום עובר הלאה.`,
      claim: 'אישור המקום',
      release: 'לוותר על המקום',
      waitEyebrow: 'רשימת המתנה',
      waitTitle: (position, what) => `מקום ${position} בהמתנה: ${what}`,
      waitText: (pct, autoAccept, holdMinutes) =>
        `סיכוי של כ־${pct}% לקבל מקום. ${autoAccept ? 'ההרשמה האוטומטית פעילה.' : `אם יתפנה מקום, נשמור אותו בשבילך ${holdMinutes} דקות.`}`,
      usualEyebrow: 'השיעור הקבוע שלך',
      usualTitle: (type, start) => `${classType[type]}, יום ${WD_LONG[new Date(start).getDay()]} ב־${fmtTime(start)}`,
      usualText: (d, coach, n) => `${d} עם ${coach}. ${left(n, 'מקומות')}.`,
      bookOneTap: 'הרשמה בלחיצה אחת',
      fullOdds: 'מלא: לסיכויים ברשימת ההמתנה',
      nextEyebrow: (rel) => `השיעור הבא, ${rel}`,
      nextText: (when, coach) => `${when} עם ${coach}`,
      classDetails: 'פרטי השיעור',
      weekRing: (attended, goal) => `${attended} מתוך ${goal} שיעורים השבוע`,
      goalReached: 'הגעת ליעד השבועי',
      goalLeft: (n) => `עוד ${classes(n)} ליעד השבועי`,
      weekText: (attended, booked) => `השבוע: השתתפת ב־${attended}, ועוד ${booked} בהרשמה`,
      streak: (weeks) => (weeks === 1 ? 'שבוע אחד ברצף' : `${weeks} שבועות ברצף`),
    },
    schedule: {
      title: 'מערכת שעות',
      today: 'היום',
      prevWeek: 'השבוע הקודם',
      nextWeek: 'השבוע הבא',
      dayAria: (d, isToday, booked) => `${d}${isToday ? ', היום' : ''}${booked ? ', יש הרשמה' : ''}`,
      typeLabel: 'סוג שיעור',
      all: 'הכול',
      branches: 'סניפים',
      allBranches: 'כל הסניפים',
      pastDay: 'יום שעבר',
      closedSaturday: 'בשבת הסטודיו סגור.',
      noClasses: 'אין שיעורים ביום הזה.',
      noMatch: 'אין שיעורים שמתאימים לסינון.',
      waitlist: 'להמתנה',
      claim: 'אישור',
      ended: 'הסתיים',
      live: 'מתקיים עכשיו',
      opens: (at) => `נפתח ב${day(at)}`,
      overlaps: 'חופף',
      actionAria: (action, what) => `${action}: ${what}`,
    },
    sheet: {
      oddsStrong: (pct) => `סיכוי של כ־${pct}%`,
      oddsRest: (position, openings) =>
        ` להיכנס ממקום ${position}. בדרך כלל מתפנים כ־${openings.toFixed(1)} מקומות לפני השיעור הזה.`,
      ended: 'השיעור הסתיים.',
      live: 'השיעור מתקיים עכשיו.',
      bookedSelf: 'ההרשמה שלך פעילה.',
      bookedFor: (who) => `ההרשמה של ${who} פעילה.`,
      yesCancel: 'כן, לבטל',
      keepSpot: 'להשאיר את המקום',
      cancelBooking: 'ביטול ההרשמה',
      onWaitlist: (position, who) => `מקום ${position} ברשימת ההמתנה${who ? ` (${who})` : ''}.`,
      autoUntil: (time) => `ההרשמה האוטומטית פעילה עד ${time}.`,
      holdInfo: (minutes) => `אם יתפנה מקום, נשמור אותו ${minutes} דקות ונעדכן.`,
      leaveWaitlist: 'יציאה מרשימת ההמתנה',
      heldStrong: (who) => `שמרנו מקום ${who ? `עבור ${who}` : 'בשבילך'}`,
      heldUntil: (until, now) => ` עד ${fmtTime(until)} (${relative(until, now)}).`,
      bookFor: (who) => (who ? `הרשמה עבור ${who}` : 'הרשמה'),
      usesClass: (kind, leftAfter) =>
        `ינוצל שיעור אחד ${kind === 'monthly' ? 'מהמנוי' : 'מהכרטיסייה'}, ${
          leftAfter === 0 ? 'ולא יישארו שיעורים' : leftAfter === 1 ? 'ויישאר שיעור אחד' : `ויישארו ${leftAfter}`
        }.`,
      waiverNeeded: (who) => `לפני השיעור הראשון צריך הצהרת בריאות עבור ${who}. היא חלק מההרשמה הזו, בלי לצאת מהמסך.`,
      signAndBookLong: 'חתימה על הצהרת בריאות והרשמה',
      fullStrong: 'השיעור מלא.',
      inLine: (position, who) => `מקום ${position} בתור${who ? ` (${who})` : ''}.`,
      autoLabel: 'הרשמה אוטומטית אם יתפנה מקום',
      autoHint: (hours, minutes) => `עד ${hours} שעות לפני השיעור. אחר כך נשמור את המקום ${minutes} דקות.`,
      joinWaitlist: 'הצטרפות לרשימת ההמתנה',
      unfreezeAndBook: 'ביטול ההקפאה והרשמה',
      buyCard: (pack, price) => `קניית כרטיסיית ${pack} (הדגמה, ${money(price)})`,
      when: 'מתי',
      coach: 'מדריכה',
      where: 'איפה',
      level: 'רמה',
      bookingFor: 'הרשמה עבור',
      whoCame: (n) => `מי הגיעה (${n})`,
      whoComing: (n) => `מי מגיעה (${n})`,
      seeAll: 'לרשימה המלאה',
      hideList: 'הסתרת הרשימה',
      youTag: 'את',
      familyTag: 'משפחה',
      demoTools: 'כלי הדגמה',
      demoHint: 'נניח שמתאמנת אחרת מבטלת, כדי לראות את רשימת ההמתנה זזה.',
      simulate: 'הדמיית ביטול',
    },
    waiver: {
      title: 'הצהרת בריאות',
      intro: (name) => `הצהרת בריאות עבור ${name}. חותמים פעם אחת, וזה לוקח כ־20 שניות.`,
      healthySelf: 'מצב הבריאות שלי תקין, ולא ידוע לי על סיבה רפואית שמונעת ממני להתאמן.',
      healthyChild: (name) => `מצב הבריאות של ${name} תקין, ולא ידוע לי על סיבה רפואית שמונעת אימון.`,
      inform: 'אעדכן את המדריכה על כל פציעה או מצב רפואי לפני השיעור.',
      sigSelf: 'לחתימה, יש להקליד שם מלא',
      sigChild: 'הורה או אפוטרופוס: יש להקליד שם מלא',
      sign: 'חתימה',
    },
    bookings: {
      title: 'ההרשמות שלי',
      view: 'תצוגת הרשמות',
      upcoming: 'קרובות',
      history: 'היסטוריה',
      addAll: (n) => `הוספת כל ה־${n} ליומן`,
      attended: 'השתתפות',
      used: 'שיעורים שנוצלו',
      late: 'ביטולים מאוחרים',
      note: '30 הימים האחרונים. כל שיעור מופיע למטה עם מה שנוצל עליו.',
      emptyUpcoming: 'עדיין אין הרשמות.',
      emptyHistory: 'עדיין אין היסטוריה.',
    },
    me: {
      freeze: 'הקפאת מנוי',
      unfreeze: 'ביטול ההקפאה',
      buyCard: (pack) => `קניית כרטיסיית ${pack} (הדגמה)`,
      family: 'פרופילים במשפחה',
      relSelf: 'החשבון שלך',
      relChild: 'ילד/ה',
      waiverSigned: (d) => `הצהרת בריאות נחתמה ב־${date(d)}`,
      waiverMissing: 'עדיין לא נחתמה הצהרת בריאות',
      signNow: 'לחתימה',
      payments: 'אמצעי תשלום',
      noCards: 'אין כרטיסים שמורים.',
      cardLabel: (brand, last4) => `${brand} שמסתיים ב־${last4}`,
      remove: 'הסרה',
      keep: 'להשאיר',
      removeAria: (card) => `הסרת ${card}`,
      display: 'תצוגה ויעדים',
      textSize: 'גודל טקסט',
      sizeDefault: 'רגיל',
      sizeLarge: 'גדול',
      sizeLarger: 'גדול יותר',
      contrast: 'ניגודיות גבוהה',
      contrastHint: 'טקסט כהה יותר וקווים בולטים יותר',
      goal: 'יעד שבועי',
      goalOption: (n) => `${n} בשבוע`,
      fineprint: 'אב־טיפוס. נתוני ההדגמה נשמרים רק בדפדפן הזה. "איפוס הדגמה" למעלה מתחיל מחדש.',
      freezeIntro: 'אפשר להקפיא לחופשה, פציעה או מילואים. ימי ההקפאה מתווספים לתוקף המנוי.',
      freezeDays: (n) => `${n} ימים`,
      frozenUntil: 'מוקפא עד',
      renewal: 'חידוש',
      cardExpiry: 'תוקף הכרטיסייה',
      affected: 'הרשמות שיבוטלו',
      affectedCount: (n) => `${n}, בלי חיוב`,
      none: 'אין',
      freezeFor: (n) => `הקפאה ל־${n} ימים`,
      arrow: '←',
    },
    owner: {
      title: 'תובנות ניהול',
      sub: (studio, d) => `${studio} · ${d} · 4 השבועות האחרונים`,
      branch: 'סניף',
      members: 'מתאמנות',
      joined: (n) => `${n} הצטרפו החודש`,
      visits: 'ביקורים, 7 ימים אחרונים',
      vsPrev: (pct) => `${pct}% לעומת השבוע הקודם`,
      fill: 'תפוסה ממוצעת',
      acrossAll: 'בכל השיעורים',
      risk: 'הכנסה בסיכון',
      perMonth: (amount) => `${money(amount)} לחודש`,
      riskSub: (high, total) => `${high} בסיכון גבוה, מתוך ${total} שסומנו`,
      churnTitle: 'רדאר נטישה',
      churnSub: 'נוכחות לעומת הממוצע האישי של כל מתאמנת',
      high: 'סיכון גבוה',
      medium: 'בינוני',
      contacted: 'נוצר קשר',
      planPrice: (plan, amount) => `${plan} · ${money(amount)} לחודש`,
      winBack: 'החזרה',
      messageAgain: 'הודעה נוספת',
      showFewer: 'פחות',
      showAll: (n) => `הצגת כל ה־${n}`,
      heatTitle: 'מפת תפוסה',
      heatSub: 'תפוסה ממוצעת לפי שעת התחלה',
      heatCaption: 'תפוסה ממוצעת לפי יום ושעת התחלה, 4 השבועות האחרונים',
      hour: 'שעה',
      noClass: 'אין שיעור',
      cellTitle: (weekday, hour, pct, waitlisted) =>
        `${weekday} ${String(hour).padStart(2, '0')}:00, תפוסה ${pct}%, ממוצע ממתינות ${waitlisted.toFixed(1)}`,
      heatNote: 'המספר שאחרי "+" הוא ממוצע הממתינות ברשימת ההמתנה.',
      suggTitle: 'הצעות למערכת השעות',
      addPill: 'להוסיף שיעור',
      lowPill: 'ביקוש נמוך',
      winBackTitle: (name) => `החזרת ${name}`,
      message: 'הודעה',
      copy: 'העתקת ההודעה',
      markContacted: 'סימון: נוצר קשר',
    },
  },
};
