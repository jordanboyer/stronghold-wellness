# StrongHold Wellness — Hotel Portal System

In-room wellness portal for luxury hotel partners. Guests scan a QR code in their room and access guided fitness sessions — no app download or login required.

## Live Properties

| Hotel | URL | Access Code |
|-------|-----|-------------|
| The Spectator Hotel | [/spectator](https://wellness.strongholdfitness.co/spectator) | `SPECTATOR2026` |
| French Quarter Inn | [/fqi](https://wellness.strongholdfitness.co/fqi) | `FQI2026` |

## Project Structure

```
├── index.html                  # Root landing page
├── spectator/index.html        # Spectator Hotel portal
├── fqi/index.html              # French Quarter Inn portal
├── storefront/index.html       # Take It Home storefront
├── payment-success/index.html  # Post-Stripe redirect handler
├── _redirects                  # Netlify routing rules
```

## Tech Stack

- **Frontend:** React 18 via CDN + Babel standalone (no build step)
- **Hosting:** Netlify (drag-and-drop deploy)
- **Database:** Supabase (guest records, cross-hotel sync)
- **Payments:** Stripe Payment Links ($29 premium unlock)
- **Domain:** wellness.strongholdfitness.co

## Deploy

1. Drag the contents of this repo (not the folder) into Netlify's deploy box
2. Or zip and upload: `zip -r deploy.zip . -x ".*" "README.md"`

## Features

- 3 free guided sessions per hotel (morning, foundation, bedtime)
- Premium session unlock ($29 via Stripe)
- Cross-hotel guest recognition via Supabase
- Session completion tracking with celebration flow
- Email capture with free premium session picker
- Returning guest login on home screen
- Purchase success celebration screen
- Hidden dev reset (5-tap footer)
