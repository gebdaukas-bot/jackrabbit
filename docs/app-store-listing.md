# Dormie — App Store listing (draft)

Everything below goes into App Store Connect → your app. Character limits are Apple's.

## App information

| Field | Value | Notes |
|---|---|---|
| Name (30) | **Dormie** | If taken, use **Dormie: Golf Match Play** (23) |
| Subtitle (30) | **Match play scoring for trips** (28) | Avoid "Ryder Cup" — it's a trademark |
| Bundle ID | `com.gebdaukas.dormie` | |
| SKU | `dormie-ios-1` | Internal only, anything unique |
| Primary category | Sports | |
| Secondary category | (none) | |
| Content rights | Does not contain third-party content | |
| Age rating | 4+ | Answer "None" to every questionnaire item |
| Price | Free | |
| Copyright | 2026 Geb Daukas | |

## URLs

| Field | Value |
|---|---|
| Privacy Policy URL | https://dormie-golf.vercel.app/privacy |
| Support URL | https://dormie-golf.vercel.app/privacy (has the contact email; swap for a dedicated support page later if you like) |
| Marketing URL (optional) | https://dormie-golf.vercel.app |

## Promotional text (170)

> Golf trip this year? Set up your cup in minutes, invite the crew with a code, and watch every match update live, hole by hole, from the first tee to the trophy.

(160 characters. This one can be changed any time without a new review.)

## Description (4000)

> Dormie is live match play scoring for golf trips, member-guests and buddy cups.
>
> Set up a cup with two to four teams, build your pairings, and send everyone an invite code. From there, each group scores its own match on the course and the whole board updates live for everyone, with no shared scorecard and no group texts asking "what's the score?"
>
> BUILT FOR MATCH PLAY
> • 2v2 Best Ball, Singles, Scramble and Shamble formats
> • Net scoring with handicaps, course handicaps from slope and rating, and strokes shown hole by hole
> • Match status the way golfers say it: 2 UP, AS, 3 & 2
> • Team points, projected final score and the number needed to win
>
> A LIVE BOARD FOR THE WHOLE TRIP
> • Every match, every day, updating as holes are confirmed
> • Hole-by-hole scorecards and individual gross scores for each round
> • Warmup rounds with tee-time groups that don't count toward points
> • A view-only link so friends and family can follow along without signing in
>
> SET UP IN MINUTES
> • Search for your course and tees, or snap a photo of the scorecard to fill in par, stroke index and yardage
> • Multi-day trips with up to four rounds a day
> • Invite players with a code, link or QR code
> • Admins can edit rounds, pairings, handicaps and courses at any time
>
> ON THE COURSE
> • Big, simple score entry built for one hand and bright sun
> • Light and dark themes
> • Quick one-off matches when you just want to play a single game
>
> Sign in with Apple, Google or email. Free, with no ads.

(About 1,500 characters. There's room to add more later.)

## Keywords (100, comma-separated, no spaces after commas)

```
golf,match play,golf trip,scorecard,best ball,scramble,handicap,team golf,leaderboard,golf cup
```

(94 characters. Don't repeat words already in the name or subtitle; Apple indexes those separately.)

## What's New (version 1.0)

> First release.

## App Review information

- **Sign-in required: Yes.** Apple's reviewer must be able to get in without your Google or Apple account. Create a demo login:
  1. Sign up in the app with the **Email** tab, e.g. `dormie.review@gmail.com` + a password (a real inbox you control).
  2. Create a demo cup with made-up player names, a couple of matches and some scores entered, so the reviewer sees the live board.
  3. Put the email + password in **Sign-in information**.
- **Notes for the reviewer** (paste):

> Dormie scores golf match play for groups. Sign in with the demo account above, then open "Demo Cup" from the home screen. The Board tab shows live matches; tap a match to enter hole-by-hole scores. "Delete account" is at the bottom of the home screen. Scorecard scanning (Create Cup → Courses → scan) uses the camera or photo library to read a printed scorecard.

- Contact: your name, phone, and gebdaukas@gmail.com.

## App Privacy ("nutrition label")

Answer **Yes, we collect data**, then:

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact Info → Name | Yes | Yes | No | App Functionality |
| Contact Info → Email Address | Yes | Yes | No | App Functionality |
| Contact Info → Phone Number | Yes (web sign-in only, but declare it) | Yes | No | App Functionality |
| User Content → Photos or Videos | Yes (scorecard scans, sent for processing, not stored) | No | No | App Functionality |
| User Content → Other User Content (cups, player names, scores, handicaps) | Yes | Yes | No | App Functionality |
| Identifiers → User ID | Yes | Yes | No | App Functionality |

Everything else: **Not collected**. Tracking: **No**.

## Screenshots

Required: **6.9" iPhone** set (1320 × 2868), 3–10 images. Apple scales these for smaller iPhones.

Use the demo cup (made-up names), not a real one. Real friends' names shouldn't go in the store. Suggested order:

1. Board: live matches with team points
2. Score entry: a match mid-round
3. Hole-by-hole scorecard
4. Scores tab: individual leaderboard
5. Cup setup: course search / pairings
6. Light mode version of the board

## Build settings already done in the project

- App icon, launch screen, display name "Dormie"
- Camera and photo library usage strings
- `ITSAppUsesNonExemptEncryption = NO` (skips the export compliance question)
- Sign in with Apple, Associated Domains (invite links) entitlements
- Version 1.0, build 1

## Still to do before submitting

- [ ] Developer Program approval → set the real Team in Xcode
- [ ] Replace the Team ID in `public/.well-known/apple-app-site-association` if the paid team's ID differs from `5KK5SDB7A4`
- [ ] Create the app record in App Store Connect (My Apps → +), using the bundle ID above
- [ ] Demo account + demo cup, then screenshots from it
- [ ] Archive in Xcode → upload → TestFlight test on your phone → submit
