# Pulse for Anati Pilates: Arbox teardown + prototype

## Run it
```bash
cd ~/.kiro/crew/workspace/pulse-fitness
npm run dev        # http://127.0.0.1:5173 (loopback only, no auth)
npm test           # unit + render tests, including a week-long clock sweep
npm run build      # typecheck + production bundle
```
The top bar switches between the member app and owner insights, between Hebrew and English, and resets the demo.
State lives in the browser's localStorage. Saves older than 2 days are replaced, because the demo dates are relative to the day they were made.
Backups: `../pulse-fitness-v0.1-backup` (generic CrossFit studio, English only) and `../pulse-fitness-v0.2-backup` (Anati version with the QR check-in pass).

## Who it's for
Anati Pilates (anati.co.il/pilates), a Pilates studio at 12 Dudaim St, Eilat. Today it takes bookings through an embedded Arbox schedule.
The demo mirrors their public site: Reformer, Chair (Wunda), Barre and Rehab classes; groups of 6 to 10; coaches Gitit, Adi, Hadar and Amit;
the price list (monthly 4+1 ₪260, 6+1 ₪360, 8+1 ₪480, 12+1 ₪680; cards of 10 for ₪700 / 3 months, 15 for ₪975 / 4 months, 20 for ₪1,200 / 5 months).
The class times and all members are invented.

## Design
- Palette from Anati's site CSS: cream #faf6f0, sage #75806b, clay #ab816a, sand #c9a68f, dark #2b2623.
  Fills that carry text use #6b7562 (white text 4.8:1); the exact #75806b is used only where no small text sits on it. Every text pair passes WCAG AA.
  Screenshot sampling gives values about 11 levels darker (display color profile), so take colors from the site CSS.
- Fonts: Rubik for Hebrew and Latin text, Fraunces for the "Anati" logo, self-hosted with @fontsource.
- Hebrew is the default and the layout is right-to-left (logical CSS properties). English is a toggle.
  All text lives in `src/i18n` (`he.ts`, `en.ts`) behind one typed `Messages` interface, so a missing translation fails the typecheck.
  Hebrew copy is neutral where possible and feminine where Hebrew needs a gender, matching how the studio addresses its members.
- The schedule follows the Arbox member app: a week strip with month and arrows, a time column, and Book / Waitlist right on each row.

## Sources (public only, no decompiling, no copied code or assets)
- App Store listing and lookup API for the Arbox member app (id 1037717356): 4.56 stars, 7,859 ratings, v7.2.4 (Aug 2026), plus its screenshots
- 50 most recent Israeli App Store reviews plus 20 US ones
- arboxapp.com pricing and feature page
- anati.co.il/pilates: classes, prices, team, colors and fonts

## What Arbox is
- Two products: a B2B studio-management system (scheduling, CRM/leads, billing, Stripe payments, invoicing,
  automations, digital waivers, check-in/access control, reports, online shop) and a consumer member app
  (book classes, manage memberships, pay, receive notifications, show the entry QR code).
- Tiers: Free (5 weekly sessions), Basic (20), Standard (unlimited sessions, auto actions, leads, Smart Insights),
  Professional (branded app, spaces), Enterprise.
- The 2026 redesign is blue and already has a My bookings tab, upcoming bookings on Home, and a "We've got a spot for you" hold with a countdown.
  The green design members miss is the older one, still shown in the iPad screenshots.

## Member pain points (from reviews)
Of the 50 recent Israeli reviews, 31 are 1 to 3 stars. Some complaints below come from versions before the redesign.
1. Speed: generating the entry QR code takes 30+ seconds, launches fail, battery drain (QR part not relevant: Anati doesn't use QR codes at the door)
2. Login: logins fail, password reset is broken, frequent logouts
3. Health-declaration dead end: after signing there is no Done button, so booking is blocked
4. Branch and family: the selected branch isn't remembered (wrong-branch bookings), and parent + child accounts are hard to manage
5. History: no list of past or upcoming bookings, can't browse earlier days, no weekday shown, unclear charges
6. Payments: a saved card can't be removed
7. Support and accessibility: no way to contact support from the app, text size can't be changed, gray text has low contrast

## Upgrades built
- Smart waitlist: shows your chance of getting in, can auto-book you, and holds a freed spot for 15 minutes
- Health declaration signed inside the booking, with no dead end (pain 3)
- Family profile switcher; parent signs for the child (pain 4)
- Upcoming and past bookings with what each one used, past weeks browsable, calendar export (pain 5)
- Plan usage bar, classes left, self-serve freeze that shows its impact first, removable cards, cancellation terms before you cancel (pain 6)
- Text size and high-contrast settings, AA contrast throughout (pain 7)
- One-tap booking from the schedule, and "Quick registration" on Home: day chips plus a swipeable row of class cards with a Book button each, after Arbox's "Book a service" row. It replaces the empty state when nothing is booked and stays below the next class otherwise.
- Owner view: churn-risk list with a win-back message draft, class fill heatmap, add/rethink suggestions for the schedule

## Code map
- `src/domain/`: pure logic plus tests (booking rules, credits, waitlist odds, quick registration, freeze, insights, .ics export)
  - `plans.ts`: Anati's price list; `seed.ts`: the Anati demo world
- `src/i18n/`: `messages.ts` (the interface), `he.ts`, `en.ts`
- `src/screens/member/`: Home, Schedule, class sheet, Bookings, Me (no check-in tab: Anati doesn't use QR entry)
- `src/screens/owner/InsightsScreen.tsx`: KPIs, churn radar, heatmap, suggestions
- `src/state/store.tsx`: state, persistence, notifications, `useT()` for the current language

## Prototype shortcuts (must change before real users)
- No backend or auth. Production needs real accounts (passkeys/OTP), a server-side booking engine, and payments through a PSP.
- "Attended" is assumed for past bookings. Production uses check-in data.
- Monthly quotas don't reset at renewal in the demo, and a class after the renewal date still counts toward the current month.

## Next steps
1. Anati's real weekly schedule in place of the invented times
2. Expo (React Native) shell reusing `src/domain` and `src/i18n`
3. Backend: Postgres + booking API with a transactional waitlist, plus an import from an Arbox export
4. In-app studio messaging and WhatsApp win-back delivery
