# CLAUDE.md - StrongHold Wellness Project Instructions

## WHO YOU'RE WORKING WITH

Jordan Boyer, founder of StrongHold Fitness LLC (Charlotte, NC). NSCA-certified personal trainer with 10+ years experience and TPI Golf Fitness specialization. Jordan is direct, fast-moving, and outcome-focused. He delegates technical decisions freely: "Be me and continue making them as you believe I would make them." He expects iteration until things work ("don't stop until it's fixed"). He gives concise directional input, often in shorthand.

## WHAT THIS PROJECT IS

StrongHold Wellness is a B2B hotel wellness platform that deploys branded in-room fitness portals inside boutique luxury hotels via QR code-accessible mobile web. Guests scan a QR code in their room, access a mobile-optimized wellness portal with guided workout sessions, and can purchase premium content. The platform also powers Jordan's direct-to-consumer storefront for training programs.

## BUSINESS MODEL

### B2B Hotel Tiers
- Signature Recovery Suite: $14.5K build + $1K/mo
- Total Property: $4K + $600/mo
- Digital Concierge: $3K + $400/mo

### In-Stay Revenue
- $29 unlocks all premium sessions for a guest's stay
- Stripe Payment Link: `https://buy.stripe.com/14AaEZ419bLabgYdqk2cg00`

### Storefront Programs (strongholdfitness.co)
- StrongHold Method: $197
- Swing Reset: $97
- Core Forge: $147
- Long Game: $247
- Iron Range: $197
- Complete Arsenal: $597

### Post-Checkout Offer
- Grand Slam: 72hr hotel guest exclusive, Complete Arsenal at $497

### High-Ticket Coaching
- The Tailored Approach: Personalized program (Gen Pop $497, Golf-Specific $594 includes Swing Reset bonus). Booked via consultation call, 1-week build, price not listed on page. CTA goes to Cal.com scheduling link. Bonus: 30-min virtual Functional Movement Analysis (gen pop) or TPI Golf Movement Analysis (golf), ~$150-200 value.
- The StrongHold Covenant: Anchor offer at $3,997. 6-month package: Phase 1 + Phase 2 custom programs, Complete Arsenal, movement analysis call, 90-day direct access, 2 quarterly check-in calls. Stacked value ~$2,691. EXISTS PRIMARILY AS A PRICE ANCHOR to make the Tailored Approach feel like the smart buy.

### Future Revenue
- Monthly membership ($19-29/mo)
- Travel Club
- Referral program

## CURRENT HOTEL PARTNERS

- The Spectator Hotel (Charleston, SC)
- French Quarter Inn / FQI (Charleston, SC)
- Key contact: Chris (GM across both properties)

## REPO STRUCTURE

```
stronghold-wellness/
├── spectator-wellness.html      # Source file for Spectator portal
├── fqi-wellness.html            # Source file for FQI portal
├── spectator/index.html         # LIVE deployed Spectator (larger, includes Supabase + payment)
├── fqi/index.html               # LIVE deployed FQI (larger, includes Supabase + payment)
├── main-site/                   # Main business site (strongholdfitness.co)
├── tools/                       # Internal tools
│   └── portal-sync-checker.jsx  # Agent 4: Portal Sync Checker
├── tpi-exercise-library.json    # TPI exercise data
├── tpi-golf-reference.json      # Golf performance reference
└── CLAUDE.md                    # This file
```

## CRITICAL: PORTAL FILE SYNC RULES

Four files must ALWAYS be kept in sync for workout content changes:
1. `spectator-wellness.html` (root-level source)
2. `fqi-wellness.html` (root-level source)
3. `spectator/index.html` (live deployed, larger due to Supabase + payment flow)
4. `fqi/index.html` (live deployed, larger due to Supabase + payment flow)

The ONLY intentional differences between Spectator and FQI files are:
- Hotel name references ("THE SPECTATOR" vs "FRENCH QUARTER INN")
- Concierge label ("Butler Concierge" vs "Front Desk Concierge")
- One Body Scan cue referencing hotel-specific bedding
- Typography: Spectator uses Cormorant Garamond + Outfit; FQI uses Playfair Display + Lato
- Color scheme: Spectator is dark theme (#0d1117 bg, gold #c9a84c accent); FQI is light theme (#faf6f0 bg, burgundy #7b2d3e accent)
- Overlay colors: Spectator uses rgba(0,0,0,...); FQI uses rgba(44,36,32,...)

After ANY content edit, diff the session data blocks between files to confirm parity. Use: `grep -n 'id: "' <file>` to reliably extract session IDs.

## HOTEL_CONFIG PATTERN

One codebase serves multiple hotels via a config object swap at the top of each file. This enables new hotel onboarding in ~30 minutes. Example:

```javascript
const HOTEL_CONFIG = {
  name: "THE SPECTATOR",
  subtitle: "WELLNESS EXPERIENCE",
  location: "Charleston, SC",
  accent: "#c9a84c",
  accentLight: "#e6d5a0",
  dark: "#0d1117",
  cardBg: "#141b24",
  cardBorder: "rgba(201,168,76,0.15)",
  textPrimary: "#f0ece4",
  textSecondary: "#8a9ab0",
};
```

## PORTAL SESSION SCREEN LAYOUT ORDER

Header -> Session Hero -> Coach Overview video -> Equipment Needed callout -> Trainer's Tip -> Exercises -> Pair With (Up Next)

## SCROLL FIX (CRITICAL)

For portal session screen navigation, use `topRef` on accent line + `scrollIntoView({ behavior: "auto", block: "start" })` inside `setTimeout(10ms)`. Do NOT use `scrollRef.scrollTo()` as it fails in iframes and containers without fixed height.

## BRANDING

StrongHold Wellness maintains its own brand identity across ALL hotel properties (rather than adapting to each hotel's aesthetic). Similar to how Peloton retains its branding in hotel environments.

### Main Site Design (strongholdfitness.co)
- Fonts: Cormorant Garamond + Outfit
- B&W photography assets with purple accent lighting
- Dark theme
- Diagonal silk texture overlay at 0.35 opacity
- Alternating full-bleed photo + dark content sections

## TECH STACK

| Service | Details |
|---------|---------|
| Hosting | Netlify (site ID: `keen-arithmetic-68c926`), Netlify Forms (spam honeypot), Netlify serverless functions |
| Repo | GitHub: `https://github.com/jordanboyer/stronghold-wellness.git` |
| Database | Supabase (cross-hotel premium session sync) |
| Payments | Stripe (Payment Link active) |
| Email | MailerLite (API key + group IDs connected, domain authenticated on strongholdfitness.co, 3-email post-checkout sequence live for both Spectator and FQI groups) |
| Scheduling | Cal.com |
| Media | Cloudinary (cloud name: `di5rmfhf7`) |
| Analytics | GA4 (Measurement ID: `G-4VNS74B2YX`) |

## CODE APPROACH

- Portal files: Standalone HTML with React/ReactDOM/Babel CDN (NO build process)
- Tools: React JSX artifacts
- No bundler, no npm, no webpack. Everything runs client-side from CDN scripts.

## GIT CONFIGURATION (REQUIRED BEFORE EVERY COMMIT)

```bash
git config user.email "jordan@strongholdfitness.co"
git config user.name "Jordan Boyer"
```

Clone via HTTPS with PAT embedded in URL. Commit and push each session with descriptive messages.

Deploy ZIPs: `zip -r output.zip . -x ".git/*"` from repo root.

## KEY URLS

| URL | Purpose |
|-----|---------|
| `wellness.strongholdfitness.co` | Hotel wellness portal |
| `wellness.strongholdfitness.co/spectator` | Spectator portal (live) |
| `wellness.strongholdfitness.co/fqi` | FQI portal (live) |
| `strongholdfitness.co` | Main business site |
| `strongholdfitness.co/tailored` | Gen pop coaching page |
| `strongholdfitness.co/golf` | Golf coaching page |

## CLOUDINARY EXERCISE VIDEO IDs (re-trimmed)

- `push-up_1_iudhwv`
- `squat_1_zwjgwv`
- `bird-dogs_1_byvalf`
- `yt-raise_1_mesirk`
- `plank_1_slhyqt`

Cloud name: `di5rmfhf7`

## FOUNDATION WORKOUT STRUCTURE (PhD-reviewed)

- Circuit A: Dead Bug, Bodyweight Squat (3s lowering), Bent-Over YT
- Circuit B: Reverse Lunge, Push-Up, Glute Bridge
- Circuit C: Prone Y-T-I Raise, Bird Dog, Plank Hold

## PROJECT PHASES

### Phase 1 - COMPLETE
1. Workouts approved
2. Stripe connected
3. MailerLite live (domain authenticated, 3-email post-checkout sequence active)
4. GA4 analytics live
5. Cal.com scheduling links wired
6. Files uploaded to wellness.strongholdfitness.co

### Phase 2 - ACTIVE (first 90 days)
- Item 7: Tailored Approach + Covenant storefront pages (`/tailored` and `/golf` built, cross-linked, Netlify Forms for Covenant CTAs, Cal.com for Tailored Approach CTAs)
- Item 8: Premium upsell screen
- Item 9: Welcome cards
- Item 10: Staff one-pager
- Item 11: TPI exercise screenshots from TPI Pro app (golf programs need this)

### Pending Tasks
- Film all 9 Foundation exercise demo clips (silent, looping, 5-8 sec each, landscape, dark background), upload to Cloudinary, embed in both hotel portals. This is for GM content sample to send to Chris.
- Test AI Lead Qualifier chat widget on strongholdfitness.co (voice, lead capture, directing clients to programs)
- Add `MAILERLITE_API_KEY` as Netlify secret environment variable for automatic lead-to-subscriber capture

### Phase 3 (days 60-180)
- Item 12: Case study deck (incorporate KPI framework)
- Item 13: Time-of-day session recommendations
- Item 14: Premium preview nudge
- Item 15: Pitch 6-10 additional hotels

### Phase 4 (6mo+)
- Item 16: Testimonials
- Item 17: Referral program
- Item 18: Membership tier
- Item 19: Recovery Suite tutorials
- Item 20: CMS migration (move hotel configs/workout content to headless CMS or database for form-based onboarding)

## AI AGENT ECOSYSTEM

### Active Builds
- Lead Qualifier Agent: live on strongholdfitness.co
- Program Builder Agent: Gen Pop and TPI Golf variants built
- Workout Portal/Formatter Agent with adaptive AI coaching: built
- Portal Sync Checker (Agent 4): built, saved to `tools/portal-sync-checker.jsx`

### Queued
- Agent 5: Smart Session Concierge
- Agent 6: Post-Stay Email Personalizer
- Agent 7: Hotel Onboarding Generator

### Scoped (future)
- Lead Qualifier/Routing
- Hotel Guest Concierge
- Post-Checkout Follow-Up Superagent
- GM Reporting Superagent
- Program Sales Agent
- Ops/Content Reminder Agent

## KPI FRAMEWORK FOR AGENTS (3 pillars)

1. Reliability/Ops Efficiency: task completion, error rate, latency, cost per resolution
2. Adoption/Usage: adoption rate, frequency, reactive vs. proactive, retention
3. Business Value: time-to-value acceleration, new capabilities unlocked, revenue acceleration

Apply across all agents. Use in Phase 3 case study deck and GM pitches.

## GUEST EXPERIENCE BLUEPRINT (7 phases)

1. Pre-Arrival: confirmation insert, 48hr welcome
2. Check-In: staff script, welcome card, equipment display
3. First Session: celebration screen, 1/3-2/3-3/3 tracker, story arc
4. During Stay: time-of-day recs, mid-stay nudge, premium preview
5. Checkout: last-morning update, Take It Home transition, email capture, retail upsell
6. Post-Checkout: 24hr recap, 7-day micro-session, 30-day offer
7. Long-Term: membership, Travel Club, referrals

## WRITING STYLE

Jordan does NOT use em dashes in emails or written communication. When drafting messages for him, replace em dashes with periods, commas, or separate sentences.

## NUTRITION PARTNER

Sue DeLuca at Total Nutrition Technology.

## BASH TIPS

- Use temp files (`/tmp/`) for process substitution
- `grep -n 'id: "'` reliably extracts session IDs from portal files

## REUSABLE COMPONENTS

Interval timer template (`steady-state-timer.jsx`): RPE color-coded (green=easy, blue=recovery, yellow=moderate, orange=hard, red=max), circular countdown, auto-advance, visual flash transitions (default on), audio beeps opt-in/muted by default, skip button, large up-next preview, progress bar, phase labels, interval dots, pre-start screen with colored time blocks. React JSX. Reuse for any future projects.

## GOOGLE REVIEWS ON MAIN SITE

Barbara G., Thomas E., Sue D., Andrea L. (last names removed for privacy).
