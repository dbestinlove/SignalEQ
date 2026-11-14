# Vivo X500 Pro Max — spec research

**Research date:** 2026-11-13
**Researcher:** spec-researcher (task-4)
**Status:** **RELEASED, NOT RUMORED.** Launched in China September 2026; global edition on sale (shipped from ~3 Nov 2026). India launch reported for 26 Nov 2026.

**Chosen variant:** **Global ROM** — Giztop lists a distinct "Vivo X500 Pro Max **Global**" product (SKU `VX500PMX-GB`, "This is an original global edition"). Variant preference rule therefore selects global over China. Field values below are for the **global** variant, which differs from the China model in battery capacity (see conflict note).

## Source URLs (all fetched 2026-11-13)

| # | Purpose | URL |
|---|---------|-----|
| 1 | **Primary** — Giztop global edition product page (price, variant, specs) | https://www.giztop.com/vivo-x500-pro-max-global.html |
| 2 | Giztop China-edition page (comparison; 8000mAh claim) | https://www.giztop.com/vivo-x500-pro-max.html |
| 3 | Giztop store search — confirms global SKU + $1,599/$1,699 pricing | https://www.giztop.com/catalogsearch/result/?q=x500+pro+max+global |
| 4 | **Corroboration + battery conflict resolution** — GSMArena full review | https://m.gsmarena.com/vivo_x500_pro_max-review-3009.php |
| 5 | **Official confirmation** — vivo Malaysia store spec sheet | https://shop.vivo.com/my/product/2744?skuId=9706 |
| 6 | **Official confirmation** — vivo Malaysia X500 series launch page (battery footnote) | https://www.vivo.com/my/activity/x500-series-launch |
| 7 | Context — Gizmochina global presale article | https://www.gizmochina.com/2026/10/26/vivo-x500-pro-max-global-presale/ |

Note: `https://www.gsmarena.com/vivo_x500_pro_max_5g-14782.php` (desktop spec page) returned an anti-bot interstitial and could not be read; the mobile review page (source 4) was readable and contains the full "specs at a glance" block, so it was used instead.

## Per-field values, evidence, confidence

| Field | Value | Evidence (quote / summary) | Confidence |
|-------|-------|----------------------------|------------|
| `model` | `Vivo X500 Pro Max` | Giztop page title "Vivo X500 Pro Max Global"; capitalization matches existing CSV pattern. | **High** |
| `battery_mAh` | `7800` | vivo MY launch page: "Typical capacity: 7800 mAh (3.71V); typical energy: 28.94 Wh; rated capacity: 7605 mAh". GSMArena: "Battery: 7800mAh (Global), 6750mAh (Europe)". | **High** (see conflict note) |
| `charging_W` | `90` | Giztop: "8000mAh battery, support 90W fast charging." vivo MY: "90W FlashCharge + 40W Wireless FlashCharge". GSMArena: "90W wired, 40W wireless". | **High** |
| `camera_quality` | *(blank)* | **Deliberately blank.** This column is the Nanoreview composite (70–100) used elsewhere in `phones_flagship.csv`; neither Giztop, GSMArena nor vivo publishes it. Not estimated or invented. | n/a |
| `display_size_inches` | `6.85` | Giztop: "6.85-inch BOE Q11 flat OLED display." GSMArena: "6.85\" LTPO AMOLED … 1440x3168px". vivo MY: "6.85″ (17.42 cm)". | **High** |
| `storage_gb` | `256` | Giztop: "256GB/512GB/1TB of UFS 4.1 storage"; base config is 256GB. GSMArena memory row: "256GB 12GB RAM, 512GB 12GB RAM, 1TB 12GB RAM". | **High** |
| `ram_gb` | `12` | Giztop: "16GB/12GB LPDDR5X Ultra of RAM" (base 12GB). GSMArena: base "256GB 12GB RAM". vivo MY spec table: "RAM 12GB". | **High** |
| `price_usd` | `1599` | Giztop global page: "As low as **$1,599.00** $1,699.00" (current price / struck-through previous price), "In stock". Base config, quoted in USD directly. | **High** (promo price — see pricing note) |
| `os_type` | `global ROM` | Giztop global page: "This is an original **global edition**"; SKU `VX500PMX-GB`, distinct from China page `VX500PMX`. Runs "Android 17 OS … overlaid with OriginOS 7". | **High** |

## Battery conflict — 8000 vs 7800 (resolved)

This is the one substantive disagreement in the sources, so it is documented explicitly:

- **Giztop** states **8000mAh** on *both* its China page *and* its "Global" page. The global page's bullet list is copy-pasted China marketing copy.
- **GSMArena** (which physically reviewed units) states: "Battery: **7800mAh (Global)**, 6750mAh (Europe)".
- **vivo official** settles it:
  - China model (vivo.com.cn param page): "典型容量：**8000mAh** … 额定容量：7800mAh" → 8000mAh *typical*, 7800mAh *rated*.
  - Global model (vivo Malaysia): "Typical capacity: **7800 mAh** (3.71V) … rated capacity: 7605 mAh"; Europe: 6750mAh (dual-cell).

**Conclusion:** China = 8000mAh typical; **Global = 7800mAh typical**; Europe = 6750mAh. Because the selected variant is **global ROM**, `battery_mAh` = **7800**. Using Giztop's 8000 would have imported the China figure into a global row. The EU 6750mAh figure is *not* used (wrong market).

## Pricing note

- Value used: **$1,599.00 USD**, quoted directly by Giztop for the global edition (base 12GB/256GB, "As low as"). No currency conversion was required for `price_usd`.
- Giztop shows a struck-through **$1,699.00** — the price at global presale (25–26 Oct 2026 per Gizmochina, which reported "starting price of $1699"). $1,599 appears to be a current discount. **If the promo ends, $1,699 is the regular listed price.** The Lead may prefer 1699 for a more stable dataset; both are stated on the page.
- No CNY→USD conversion was used. For reference only (not the chosen price): China launch CNY 6,999 (Notebookcheck, 2026-09-21), and vivo Malaysia RM 6,799 (12+512, from RM 6,999). GSMArena lists European pricing of €1,599 (256GB) / €1,799 (512GB) — a different market and not used.

## Fields left blank — and why

- `camera_quality` — **blank by design.** The schema's camera score is a Nanoreview composite (0–100 scale, e.g. 86/96 in neighbouring rows) that none of the permitted sources publish. Per instructions, no estimate or inference was made. For reference, the hardware (not a score) is: 50MP Sony LYT-L910 f/1.57 1/1.28" main + 50MP ultra-wide + 200MP Samsung ISOCELL HPB f/2.7 85mm 3.5x periscope, 50MP front; Zeiss APO / T* coating.

No other field needed to be left blank.

## Specs summary as stated by sources (context, not all in CSV)

- Chipset: MediaTek Dimensity 9600 Pro (2 nm)
- Display: 6.85" LTPO/BOE Q11 AMOLED, 3168×1440 (2K), 144Hz, 1440Hz dimming, 4400 nits peak (GSMArena)
- OS: Android 17 with OriginOS 7, up to 5 major OS updates (GSMArena)
- Memory/storage: 12GB or 16GB LPDDR5X Ultra; 256GB / 512GB / 1TB UFS 4.1
- Charging: 90W wired + 40W wireless (global); reverse wireless/wired
- Body: 163.3×76.8×8.1mm, 225g; IP68/IP69; ultrasonic in-display fingerprint

## Verification statement

**Verified** (stated on fetched pages, 2+ independent sources, official vendor confirmation for battery/display/charging): release status, model name, battery 7800mAh global, 90W charging, 6.85" display, 256GB storage, 12GB RAM, $1,599 USD global price, global ROM availability.

**Missing / not verifiable from permitted sources:** `camera_quality` (Nanoreview composite — deliberately blank, not guessed).

**Caveats:** the $1,599 price is a current discount off $1,699 — data may drift if the promo ends. Giztop's global page overstates battery as 8000mAh; that figure was rejected in favour of vivo's official 7800mAh global spec.
