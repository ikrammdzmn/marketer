# TTMS audience catalog

Dated snapshots. Latest first. Add a new snapshot when status changes; do not overwrite earlier ones.
Rules and procedure: `skills/tiktok-audience-upkeep/SKILL.md`. Screen facts: `findings.md`.

## Snapshot 26 Nov 2026 (Market Scope, after owner clean-up)

Source: Market Scope Audience creation list, read 26 Nov 2026.

| Package | ID | Window | Stage / source | Size | Status | Push | Use |
|---|---|---|---|---|---|---|---|
| TTMS – CONSIDERATION – Past 7D – 26… | 23230741 | Rolling 7 days | ACC, Consideration, Total | 391,650 | Available | Not pushed | Hot retargeting. Push first |
| TTMS – CONSIDERATION – Last 30D – 26NOV26 | 23230730 | Rolling 30 days | ACC, Consideration, Total | 777,378 | Available | Not pushed | Broader retargeting |
| TTMS – CONVERSION – 30D – 26NOV26 | 23230738 | Rolling 30 days | ACC, Conversion, Total | 16,673 | Available | Not pushed | Exclude buyers |
| TTMS – AWARENESS – 30D – 26NOV26 | 23230732 | Rolling 30 days | ACC, Awareness, Total | 8,075,280 | Available | Not pushed | Reach only |
| TTMS – SHOP CART – 30D – 26NOV26 | 23230746 | Rolling 30 days | TikTok Shop, Brand, Add to cart | 7,286 | Available | Not pushed | Hot shop group |
| TTMS – SHOP CLICK – 30D – 26NOV26 | 23230745 | Rolling 30 days | TikTok Shop, Brand, Click | 149,966 | Available | Not pushed | Warm shop group |
| TTMS – AD-CLICK – 30D – 26NOV26 | 23230770 | Rolling 30 days | Ad audience, Middle funnel (9 formats), Click | — | Processing | — | Check size, then push |
| TTMS – VIDEO – CLICK – 30DAYS | 23198577 | Fixed range | Outdated | 127,584 | Available | Pushed to GMV MAX VOL2 | Outdated. Rebuild, then retire |
| TTMS – LIVE – CLICK – 30DAYS | 23198576 | Fixed range | Outdated | 25,724 | Available | Not pushed | Outdated. Rebuild, then retire |
| TTMS CONSIDERATION – OUDATED | 23198575 | Fixed range | Outdated (renamed by owner) | 204,322 | Available | Not pushed | Delete on owner confirm |

Deleted by owner on 26 Nov 2026 (confirmed): TTMS – CONSIDERATION – RETARGET – 30DAYS (23230716); TTMS – AWARENESS (23198574). The owner renamed 23198575 instead of deleting it.

Earlier snapshot sizes (same day, before rebuild): VIDEO – CLICK 143,761; LIVE – CLICK 32,288; CONSIDERATION 204,322; AWARENESS 4,073,394 (fixed range, Aug 2026).

## Ads Manager check (TikTok Ads MCP, 26 Nov 2026)

- GMV MAX VOL2 (`7505228077656621057`): 29 audiences. Includes the pushed VIDEO – CLICK (196574768, shared). Others are the account's own engagement, lookalike and rule audiences.
- HIM WELLNESS – ADS DR SAMHAN (`7391329013215821840`): 3 old business-account audiences, size 0, invalid.
- HIM COFFEE1, HIM WELLNESS SDN BHD, HIM & HER WELLNESS: no audiences.
- The new 26 Nov packages are not pushed yet, so they don't appear in Ads Manager.

## Snapshot history

- 2026-08-22: original four packages built (VIDEO – CLICK, LIVE – CLICK, CONSIDERATION, AWARENESS), fixed date range.
- 2026-11-26: rolling packages built and outdated ones identified (snapshot above).
