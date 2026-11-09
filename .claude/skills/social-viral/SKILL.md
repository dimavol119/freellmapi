---
name: social-viral
description: >-
  Find what is actually working in the user's niche on TikTok and Instagram
  (Reels and posts), rank each post by how far it beat its own account's
  median, then name the hook formula, sound and hashtags the outliers share.
  Use for "what's working on TikTok", "viral reels in my niche", "why did this
  TikTok blow up", trend research, competitor research on TikTok/Instagram, or
  a short-form swipe file.
---

# social-viral

The TikTok / Instagram sibling of `/yt-viral`. Raw view counts rank account size, not ideas. This
ranks by **multiple over each account's own median**, then looks for what the outliers have in
common: hook formula, sound, hashtags, length.

```bash
python3 rank.py posts.json --min 2.0
python3 rank.py tiktok.json instagram.json --days 30 --json
```

## Step 1 - pin down the niche

Ask for (or infer from `~/.claude/youtube/voice.md` if it exists):
- **5-10 accounts** the user considers peers or competitors - same size band beats famous names.
- **or 3-5 hashtags / keywords** the audience actually follows (e.g. `#gymtok`, `#moneytok`).
- Platform(s) and a time window (default: last 30 days).

## Step 2 - collect the input

You need at least **four posts per account** (the last 20-30 is better) or the median means nothing;
the tool skips thin accounts and says so. Any of these work:

**A. Apify (fastest, needs the user's own token).** If `APIFY_TOKEN` is set or the user provides one
through a secure prompt, run the actor and save the dataset straight to a file. Never ask the user
to paste a token into chat.

```bash
# TikTok - accounts or hashtags
curl -sS -X POST "https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" -H "Content-Type: application/json" \
  -d '{"profiles":["acct1","acct2"],"hashtags":[],"resultsPerPage":30}' > tiktok.json

# Instagram - posts / reels from profiles
curl -sS -X POST "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" -H "Content-Type: application/json" \
  -d '{"directUrls":["https://www.instagram.com/acct1/"],"resultsType":"posts","resultsLimit":30}' > instagram.json
```

These actors are pay-per-result after Apify's free tier - say so before the first run and keep
`resultsPerPage` / `resultsLimit` modest. Hashtag-only pulls give one or two posts per account, so
use them to **discover** accounts, then pull those accounts' profiles to get real medians.

**B. An export the user already has** - any Apify dataset JSON, or a CSV turned into the shape below.

**C. A manual list** - the user pastes numbers off the public pages.

```json
[{"platform":"tiktok","account":"...","caption":"...","views":412000,"likes":31000,
  "comments":800,"shares":2400,"url":"...","posted":"2026-10-01","duration":21,
  "sound":"original sound - x","hashtags":["gymtok"]}]
```

**Read, do not log in.** Public data only - never a logged-in session, never the user's own
account credentials or cookies.

## Step 3 - read the output

- **The multiple is the signal.** 3x+ on an account's own median is worth studying; 10x+ is a
  breakout.
- **Share rate** (shares / views) is the best proxy for "people sent this to someone" - high share
  rate with a moderate multiple is often the more copyable idea.
- **per_day** separates a fresh riser from an old post that slowly accumulated.
- Instagram photo/carousel posts have no views; they are ranked on **likes** and flagged. Do not
  compare those multiples with view multiples.
- **Sounds and hashtags shared by 2+ outliers** are the trend signal. A sound on several outliers
  across different accounts is the strongest one in this report.
- The **formula** is a judgement about the caption's first line against
  [the 21 hook formulas](../yt-script/hooks.json). On short-form the first frame, on-screen text and
  sound often matter more than the caption - say so when you present it, and if the user can give
  you the on-screen text, put it in a `"hook"` field and rerun.

## What to hand back

1. The **top five** - multiple, account, hook, formula, sound, link.
2. The **ONE structural thing** they share (format, hook type, length, sound, angle).
3. **Rising vs saturated**: anything posted in the last 7 days with a high per_day is rising; the
   same sound or format topping for weeks is late.
4. The harder line - **which of these the user could film in the next 24-48 hours**, in their voice,
   with what they have. Write that one as a ready-to-shoot brief: first-frame visual, on-screen
   text, first spoken line, sound, length, caption. Hand the script to `/yt-script` and the clips
   to `/yt-shorts` if they want to go further.

## The gate

Nothing here publishes. This skill writes and the user posts. Every output ends in a block the user
copies, and the last line of every run is the question: **ship it, or change it?**
