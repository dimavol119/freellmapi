#!/usr/bin/env python3
"""rank.py - rank TikTok / Instagram posts by how far each beat its OWN account, then name the pattern.

    python3 rank.py posts.json
    python3 rank.py tiktok.json instagram.json --min 2.0 --json
    python3 rank.py posts.json --platform tiktok --days 30

Accepts either the normalized shape:

    [{"platform":"tiktok","account":"...","caption":"...","views":412000,"likes":31000,
      "comments":800,"shares":2400,"url":"...","posted":"2026-10-01T12:00:00Z",
      "duration":21,"sound":"original sound - x","hashtags":["gymtok"]}, ...]

or raw dataset exports from the common Apify actors (clockworks/tiktok-scraper,
clockworks/tiktok-profile-scraper, clockworks/tiktok-hashtag-scraper, apify/instagram-scraper,
apify/instagram-reel-scraper, apify/instagram-profile-scraper with posts). Field names are
mapped automatically; anything unrecognised is reported, never guessed.

Raw views rank account size, not ideas. Every post is scored as a MULTIPLE OF ITS OWN ACCOUNT'S
MEDIAN, which needs at least four posts per account. Instagram photo/carousel posts have no view
count, so they are ranked on likes against the account's median likes and flagged as such - a
likes multiple and a views multiple are never mixed in one account's median.

The hook formula comes from ../yt-script/hooks.json, matched against the FIRST LINE of the caption
(or the on-screen text if supplied as "hook"). It is a judgement about words, not a claim about
why the post worked - on short-form, the visual and the sound usually matter more than the text.
"""
import json, os, re, statistics, sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
HOOKS = os.path.join(HERE, "..", "yt-script", "hooks.json")
FORMULAS = json.load(open(HOOKS))["hooks"] if os.path.exists(HOOKS) else []
MIN_POSTS = 4


def classify(text):
    best = (0, "Unclassified")
    for f in FORMULAS:
        n = sum(1 for p in f.get("match", []) if re.search(p, text or "", re.I))
        if n > best[0]:
            best = (n, f["name"])
    return best[1]


def dig(d, *paths):
    """first non-empty value among dotted paths"""
    for p in paths:
        cur = d
        for k in p.split("."):
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                cur = None
                break
        if cur not in (None, "", []):
            return cur
    return None


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def when(x):
    if x is None:
        return None
    if isinstance(x, (int, float)) or (isinstance(x, str) and x.isdigit()):
        v = float(x)
        return datetime.fromtimestamp(v / 1000 if v > 1e11 else v, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(x).replace("Z", "+00:00"))
    except ValueError:
        return None


def tags(r, caption):
    t = dig(r, "hashtags")
    out = []
    if isinstance(t, list):
        for h in t:
            name = h.get("name") if isinstance(h, dict) else h
            if name:
                out.append(str(name).lstrip("#").lower())
    if not out and caption:
        out = [h.lower() for h in re.findall(r"#(\w+)", caption)]
    return out


def normalize(r, forced=None):
    if not isinstance(r, dict):
        return None
    plat = forced or r.get("platform")
    if not plat:
        if any(k in r for k in ("playCount", "authorMeta", "diggCount", "webVideoUrl")):
            plat = "tiktok"
        elif any(k in r for k in ("ownerUsername", "likesCount", "shortCode", "videoPlayCount")):
            plat = "instagram"
        else:
            plat = "?"
    caption = dig(r, "caption", "text", "desc", "title") or ""
    views = num(dig(r, "views", "playCount", "stats.playCount", "videoPlayCount", "videoViewCount", "playsCount"))
    likes = num(dig(r, "likes", "diggCount", "stats.diggCount", "likesCount"))
    return {
        "platform": plat,
        "account": str(dig(r, "account", "authorMeta.name", "author.uniqueId", "ownerUsername", "username", "channel") or "?"),
        "caption": caption,
        "hook": dig(r, "hook") or caption.strip().split("\n")[0],
        "views": views,
        "likes": likes,
        "comments": num(dig(r, "comments", "commentCount", "stats.commentCount", "commentsCount")),
        "shares": num(dig(r, "shares", "shareCount", "stats.shareCount")),
        "saves": num(dig(r, "saves", "collectCount", "stats.collectCount")),
        "url": dig(r, "url", "webVideoUrl", "postUrl") or "",
        "posted": when(dig(r, "posted", "createTimeISO", "createTime", "timestamp", "takenAtTimestamp")),
        "duration": num(dig(r, "duration", "videoMeta.duration", "videoDuration")),
        "sound": dig(r, "sound", "musicMeta.musicName", "music.title", "musicInfo.song_name", "musicInfo.audio_id"),
        "kind": str(dig(r, "type", "productType") or ("video" if views else "post")).lower(),
        "hashtags": tags(r, caption),
    }


def load(paths, forced):
    rows = []
    for p in paths:
        data = json.load(open(p, encoding="utf-8"))
        if isinstance(data, dict):
            data = data.get("posts") or data.get("items") or data.get("videos") or []
        for r in data:
            # profile-scraper exports nest posts under the profile
            nested = r.get("latestPosts") if isinstance(r, dict) else None
            for item in (nested if isinstance(nested, list) and nested else [r]):
                if nested and isinstance(item, dict):
                    item.setdefault("ownerUsername", r.get("username"))
                n = normalize(item, forced)
                if n:
                    rows.append(n)
    return rows


def main():
    a = sys.argv[1:]
    as_json = "--json" in a
    a = [x for x in a if x != "--json"]

    def opt(name, cast, default):
        if name in a:
            i = a.index(name)
            v = cast(a[i + 1])
            del a[i:i + 2]
            return v
        return default

    lo = opt("--min", float, 2.0)
    forced = opt("--platform", str, None)
    days = opt("--days", float, None)
    files = [x for x in a if not x.startswith("--")]
    if not files or not all(os.path.exists(f) for f in files):
        print(__doc__)
        sys.exit(1)

    now = datetime.now(timezone.utc)
    rows = load(files, forced)
    if days:
        rows = [r for r in rows if not r["posted"] or (now - r["posted"]).days <= days]

    by = {}
    for r in rows:
        by.setdefault((r["platform"], r["account"]), []).append(r)

    out, thin = [], []
    for (plat, acct), posts in by.items():
        if len(posts) < MIN_POSTS:
            thin.append((f"{plat}:{acct}", len(posts)))
            continue
        # views where they exist, likes otherwise - never mixed inside one median
        groups = {"views": [p for p in posts if p["views"]], "likes": [p for p in posts if not p["views"] and p["likes"]]}
        for metric, grp in groups.items():
            if len(grp) < MIN_POSTS:
                if grp:
                    thin.append((f"{plat}:{acct} ({metric})", len(grp)))
                continue
            med = statistics.median(p[metric] for p in grp)
            for p in grp:
                val = p[metric]
                mult = val / med if med else 0
                v = p["views"]
                eng = sum(x or 0 for x in (p["likes"], p["comments"], p["shares"], p["saves"]))
                age = max((now - p["posted"]).total_seconds() / 86400, 1) if p["posted"] else None
                out.append({
                    "platform": plat, "account": acct, "metric": metric,
                    "value": int(val), "median": int(med), "multiple": round(mult, 2),
                    "engagement_rate": round(eng / v, 4) if v else None,
                    "share_rate": round(p["shares"] / v, 4) if v and p["shares"] else None,
                    "per_day": int(val / age) if age else None,
                    "hook": (p["hook"] or "")[:140], "formula": classify(p["hook"]),
                    "sound": p["sound"], "hashtags": p["hashtags"][:8],
                    "duration": p["duration"], "kind": p["kind"], "url": p["url"],
                    "posted": p["posted"].date().isoformat() if p["posted"] else None,
                })

    out = [r for r in out if r["multiple"] >= lo]
    out.sort(key=lambda r: -r["multiple"])

    def tally(key, flat=False):
        c = {}
        for r in out:
            vals = r[key] if flat else [r[key]]
            for v in vals or []:
                if v:
                    c[v] = c.get(v, 0) + 1
        return sorted(((k, n) for k, n in c.items() if n > 1 or key == "formula"), key=lambda x: -x[1])[:10]

    summary = {
        "formulas": tally("formula"),
        "sounds": tally("sound"),
        "hashtags": tally("hashtags", flat=True),
    }
    durs = [r["duration"] for r in out if r["duration"]]
    if durs:
        summary["median_duration_s"] = round(statistics.median(durs), 1)

    if as_json:
        print(json.dumps({"outliers": out, "skipped_thin_accounts": thin, "patterns": summary}, indent=1, ensure_ascii=False))
        return

    print(f"\n  {len(rows)} posts across {len(by)} accounts, outliers at {lo}x or better\n")
    for r in out[:25]:
        extra = []
        if r["engagement_rate"] is not None:
            extra.append(f"eng {r['engagement_rate']:.1%}")
        if r["share_rate"] is not None:
            extra.append(f"shares {r['share_rate']:.2%}")
        if r["per_day"] is not None:
            extra.append(f"{r['per_day']:,}/day")
        flag = "" if r["metric"] == "views" else "  [likes - no view count]"
        print(f"    {r['multiple']:5.2f}x  {r['value']:>10,} vs {r['median']:>9,} median  "
              f"{ {'tiktok': 'tt', 'instagram': 'ig'}.get(r['platform'], r['platform'][:2])} {r['account'][:20]:<20} {r['hook'][:48]}{flag}")
        print(f"            {r['formula']}   {'  '.join(extra)}")
    if not out:
        print("    nothing cleared the threshold - collect more posts per account or lower --min")
    if thin:
        print(f"\n  skipped {len(thin)} account(s) with under {MIN_POSTS} comparable posts - a median off one")
        print("  or two posts is not a median: " + ", ".join(f"{c} ({n})" for c, n in thin[:6]))
    for label, key in (("hook formulas", "formulas"), ("sounds used by 2+ outliers", "sounds"),
                       ("hashtags on 2+ outliers", "hashtags")):
        if summary[key]:
            print(f"\n  {label}")
            for k, n in summary[key]:
                print(f"    {n:2d}x  {k}")
    if "median_duration_s" in summary:
        print(f"\n  median outlier length: {summary['median_duration_s']}s")
    print()


if __name__ == "__main__":
    main()
