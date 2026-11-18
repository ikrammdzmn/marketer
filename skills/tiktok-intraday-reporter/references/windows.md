# Windows (MYT) — verified 16 Nov 2026

Param `window`. All ranges inclusive, MYT. API `stat_time_hour` slots are MYT per `skills/tiktok-api`.

| Preset | From-To | Notes |
|---|---|---|
| hourly | this hour vs last hour | GMV Max verified; TTAM pending probe; Live campaign expected green |
| morning | 0000-0900 | |
| half-day | 0000-1300 | |
| half-office | 0830-1400 | |
| full-office-a | 0000-1700 | |
| full-office-b | 0830-1700 | |
| post-office | 1700-2359 | render + hourly breakdown table inside |

Aliases (same handler): 1700-1800, 1800-1900, 1700-1900, 1900-2000, 2000-2200, 2200-2300, 2300-2359.
Hour grid includes future zero slots — detect edge by activity, never store future.
