# Market Scope findings (TTMS)

Knowledge log, dated snapshots. Add a new dated section; do not overwrite older ones.
Account: Dr Samhan (Malaysia | Health), Lite, ACC model TikTok Shop purchase (Lite), accountId `7661520184020303879`.
Procedure lives in `skills/tiktok-audience-upkeep/`. Discussion log: `discussion.md`. Packages: `audience-catalog.md`. Customer profile: `seller-center-customer-profile.md`.

## Pages (direct URLs, `?accountId=7661520184020303879`)

| Page | Path |
|---|---|
| Audience overview | `/brand/audience/o5a/overview` |
| Audience transition | `/brand/audience/o5a/conversion` |
| Audience creation (packages) | `/brand/audience/list` |
| Create a custom audience | `/brand/audience/create` |
| Brand insights | `/brand/brand-perception/brand-insights` |
| TikTok Shop market insights | `/brand/merchandise/market-insights` |
| TikTok Shop brand performance | `/brand/merchandise/account-performance` |
| Post campaign report | `/brand/report/list` |

Navigation notes (verified 26 Nov 2026):
- A feature-tutorial popup ("0 of 4 completed", "Got it") covers the sidebar. Sidebar clicks fail until it is dismissed. Direct URLs work without dismissing it.
- The Buyers analysis sits under TikTok Shop brand performance, next to Product analysis.

## Snapshot 26 Nov 2026 (last 7 days unless stated)

**Audience overview**
- Total ACC audience 5,680,861 (benchmark 5,199,521; rank 1 of 62)
- Awareness 5,368,045 (rank 1); Consideration 295,695 (rank 4); Conversion 17,121 (benchmark 186,703; rank 28)
- ACC contributed 389 of 403 TTS orders (96.53%)

**Audience transition (18–24 Nov)**
- New ACC audience 1,253,477 (rank 3); new consideration 116,654 (rank 2)
- New conversion audience under 1,000 (benchmark 4,227; rank 21)
- Consideration → conversion under 1,000 (rank 16)

**Brand insights**
- Impressions 12,141,361 (+11.2%; rank 1; benchmark 9,620,478)
- Engagements 1,448,195 (rank 4); video views at 100% 289,704 (+20.8%, above benchmark)
- Clicks 251,666 (+7.9%, above benchmark); product card clicks 66,448 (benchmark 172,201)
- Shares 4,552 (−50.8%); likes 28,518 (−52.5%); comments 399 (−4.2%)
- Top hashtags by impressions: #himcoffee 10.49M, #drsamhan 10.37M, #suamiistri 8.36M, #keluargabahagia 8.08M, #himwellness 7.59M
- Spike on 22 Nov: 3.00M impressions (+94% vs prior day)

**TikTok Shop brand performance**
- GMV US$30,766.52 (+41.5%); orders 1,178 (+34.5%); buyers 1,107 (+32.8%); ARPU US$27.79 (+13.0%)
- Top product by GMV: Kopi Herba 5X (US$14,556.86; 29,031 videos; 3,426 influencers)
- Top video GMV only about US$600, so sales come mainly from creator volume

**Buyers analysis (Shop brand performance)**
- Buyers gained / lost from other brands (30 days): under 1,000 each, profile hidden
- Repeat buyers (365 days): under 1,000, profile hidden
- "Add to audience bank" is available but nothing is saveable above the 1,000 threshold yet

**Shop market insights (Beauty & Personal Care, 7 days)**
- 134 categories. Top by GMV: Skin Care Kits, Unisex Fragrance, Moisturizers & Mists, Bath & Shower, Serums & Essences, Lipstick. Not Health; use as context only.

## Audience builder: options (verified 26 Nov 2026)

**Audience selection tabs:** Audience selection, Existing audiences, Audience bank.

| Group | Options |
|---|---|
| Brand audience | ACC audience; Ad audience |
| Vertical audience | TikTok Shop audience |
| Demographics | Location, Gender, Age, Spending power, Audience personas |
| Device | OS version, Device model, Device price, Connection type |
| Interests & behaviors | Interests, Purchase intention, Video interactions, Creator interactions |

**ACC audience**
- Stages: Awareness, Consideration, Conversion (all three selected by default; turn off what you don't need)
- Type: Total or New
- Date range: Specific period (fixed dates) or In the past N day(s) (rolling). Use rolling.
- Result: one ACC condition gives a size estimate. Refresh icon re-estimates.

**Ad audience**
- Type: Touchpoints, Advertising accounts (All / Specific), Campaign (All / Specific), Ad groups (All / Specific)
- Touchpoints funnel tree:
  - Upper funnel (Awareness): Topview, Reach & Frequency, TikTok Pulse, Brand auction-Reach, Branded mission, Search hub, Others
  - Middle funnel (Consideration): Brand auction-Video views, Brand auction-Community interaction, Promote, Brand auction-Consideration, Traffic-Website, Traffic-App, Traffic-TikTok Shop, Traffic-Lead, Others
  - Lower funnel (Conversion): App promotion, Website conversion, Lead generation, Product sales-TikTok Shop, TikTok GO
- Action: Impression, Click, Add to cart, Purchase, Search
- Frequency: Any or Specific
- Date range: Specific period or In the past N days
- Note: the Touchpoints selection opened with a pre-filled ID `1010100` that matched Topview (inferred, not confirmed by the UI). Clear it before choosing.

**TikTok Shop audience**
- Data range: Brand or Market
- Product category: All or Specific; Price range: All or Specific; Item keyword: optional
- Action scenarios: All, Live, Video, Product card
- Action: Impression, Click, Add to cart, Purchase, Search
- Frequency: Any; Date range: In the past N days

**Video interactions**
- Category picker only (no action or date setting). Categories include Fitness & Health, Food & Drink, Daily Life, Beauty & Care, Lifestyle, Family & Relationships, Beauty & Style, Education, Technology, Sports & Outdoors, Auto & Vehicles, Entertainment, Performance, Talents, Nature, Society, Culture & Education & Technology, Supernatural & Horror.
- Size tests: Food & Drink + Fitness & Health = 19,468,342; + Daily Life + Beauty & Care = 22,913,965; all seven original = 24,849,938.

**Interests & behaviors** (not yet tested in detail): Interests, Purchase intention, Creator interactions.

## Errors and limits observed

- Ad audience "Click to estimate": "Oops, Something went wrong" (26 Nov 2026). Retry, simplify, reload, or create and check after processing.
- Packages with a fixed date range: "This audience package uses a fixed time range and can't be updated." Rebuild with a rolling window.
- Packages built from an existing audience inherit that package's frozen data (RETARGET – 30DAYS showed 191,030, from the outdated consideration package).
- Processing: several new packages stayed "Processing" for hours; sizes appear when ready. Allow up to 48 hours.
- Auto-update: Update now, or Auto-update every N days (15 observed). It turns off after 60 days.

## Changelog

- 2026-11-26: first full discovery pass (pages, builder options, buyers analysis, errors). Rolling 30D/7D ACC audiences built; outdated fixed-range packages identified.
