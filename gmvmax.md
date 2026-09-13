Through our discussion and your account data, several critical operational and algorithmic realities about the **TikTok Shop GMV Max system** became clear.

Here is what was learned about how GMV Max actually behaves under real-world constraints:

---

### 1. Hard Architectural Limits (1 Campaign per SKU / Account)

- **Product GMV Max is strictly 1 continuous campaign per Product ID (SKU).** Unlike TTAM or Facebook Ads, you cannot horizontally scale by duplicating campaigns for the same product to test different creative buckets or bidding styles.
- **Live GMV Max is strictly 1 continuous campaign per TikTok account.**
- **Variants live under one roof:** If your single SKU listing already contains parent-child variants (1 box, 2 boxes, 3 boxes + gift), you cannot spin off new GMV Max campaigns for bundles unless you create completely separate product listings in Seller Center.

---

### 2. The "High Target ROI" Algorithmic Choke

- **Why spend gets throttled (The RM 450/day ceiling):** Setting a high Target ROI (like **$\ge$ 7.0** to protect against TikTok's ~25% platform fees) completely changes the algorithm's behavior.
- GMV Max will **refuse to spend on cold traffic** because finding users who convert on cold impressions at a 7.0x return (a CPA $\le$ RM 21.18) is rare.
- To protect the 7.0 ROI target, the algorithm enters extreme risk-aversion mode, spending only ~RM 450/day on "sure-win" immediate buyers.
- **Key takeaway:** At high Target ROAS, GMV Max is **not a customer acquisition engine—it is purely a bottom-of-funnel harvesting machine.**

---

### 3. Creative Mechanics (Auto-Ingestion vs. Binary Buyer Control)

- **The system auto-runs attached content:** In Product GMV Max, the media buyer does not manually upload ad groups. The system automatically pulls in any videos attached to the SKU (affiliates and in-house posts).
- **The media buyer's only levers are binary:** You can only **"Boost"** (prioritize auction weight) or **"Remove / Exclude"** (stop delivery).
- **The favorite-child problem:** If you feed the system 25 affiliate videos without intervention, machine learning will pick 1 or 2 favorites and give virtually 0 spend to the other 23.
- **The metric funnel tells the real story:** You have to manage videos using specific dashboard columns (`Exploration secondary status`, `Cost`, `SKU orders`, `CPA`, `2s view rate`, `CTR`, `CVR`) to identify when an affiliate video is draining margin before it ruins campaign ROI.

---

### 4. The TTAM $\leftrightarrow$ GMV Max Symbiosis

- **GMV Max cannot survive alone at ROI 7.0:** If GMV Max only converts warm prospects, and its spend is capped at RM 450/day, the only way to scale GMV Max to RM 2,000–RM 3,000/day _without_ lowering the ROI target is to **artificially feed it**.
- **TTAM's true role:** Because TTAM allows unlimited campaigns but lacks direct VSA checkout in your setup, its highest-value purpose is to act as a **feeder engine**. TTAM drives cheap, highly-targeted profile and showcase traffic (LAL 1%, shift-workers, wives), and GMV Max automatically catches and closes those warm visitors at 7.0+ ROI.

---

### 5. Live GMV Max Realities with AI Streams

- **No in-stream deals = Dashboard-dependent scaling:** When running an AI digital human stream for 16 hours without manual flash deals or timed platform vouchers, Live GMV Max cannot rely on in-stream urgency to convert.
- **Dayparting must be managed externally:** Leaving Live GMV Max on a flat budget 24/7 drains cash during dead zones (02:00–05:00). The media buyer must manually surge the ad budget during verified peak hours (20:30–23:30) and dial it back at midnight to maintain profitability.

---

### Summary

**GMV Max is an automated harvester, not a standalone growth funnel.** It excels at automated conversion and retargeting, but when restricted by high platform fees (25%) and strict ROI targets ($\ge$ 7.0), it will choke its own spend unless the media buyer actively manages the creative roster (pruning/boosting) and fuels it with qualified traffic from TTAM during peak conversion windows.
