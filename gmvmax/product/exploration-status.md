# Exploration Status — canonical glossary (Product GMV Max)

Single source of truth for TikTok's creative exploration stages.
Tool code (`tiktok-creative-analysis/`) consumes this; it does not re-define it.

Source: TikTok Ads Manager dashboard help + `Creative journey & Exploration Status.xlsx` (same folder).
Column in exports: `Status` + `Exploration secondary status`.

## Flow

`All → Available → Exploring → Explored → Outstanding / Performing / Underperforming`,
with `Ineligible` as a side-branch (posts that can never explore).

## Explored (eligible, finished or in exploration)

- **Calculating** — Exploration is done and results should be available in a few hours.
- **Exploring** — A post that is gathering data to assess its performance potential.
- **Outstanding** — A post that showed strong potential to drive gross revenue growth.
  Per-campaign relative, NOT a global top-10 (a `Performing` post can out-earn all `Outstanding`).
- **Performing** — A post that delivered stable results during exploration.
- **Underperforming** — A post that delivered weaker results during exploration.

## Ineligible (never explores)

- **Unavailable** — The post is currently unavailable.
- **Authorization needed** — This post is not authorized for use.
- **Rejected** — The post was rejected. Check the post for details.
- **Excluded** — The post was manually excluded.
- **Not active** — This post was used more than 30 days ago and didn't generate any gross revenue in the past 30 days.

## Operational notes

- Boosting an inactive video re-enters `Exploring` — pool entry is repeatable; post date is never the clock.
- Creative exports are pre-filtered to catalog-attached creatives, so no per-row yellow-bag flag exists.
- Dead-inventory signature: `Ineligible / Not active` rows with 0 impressions, ~0 cost (safe to hide for sales/performance views).
