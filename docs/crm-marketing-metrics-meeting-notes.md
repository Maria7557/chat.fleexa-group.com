# CRM Marketing Metrics Meeting Notes

## Metric Definitions

- Lead: CRM Deal created in the selected period.
- Qualified Lead: Lead where `custom_attributes.qualification_status` is `qualified`.
- Successful Deal: Lead currently in `reserved`, `rental`, or `closed_won`.
- Pipeline Value: Sum of deal `amount` for successful deals, meaning reserved + rental + closed_won.
- Completed Deal Value: Sum of deal `amount` for `closed_won` only.
- Spend: Sum of `marketing_spend_daily.spend_aed` in the selected period and selected source.

## Formulas

- CPL = Spend / Leads.
- CPLQ = Spend / Qualified Leads.
- Lead -> Qualified (Lead → Qualified in the UI) = Qualified Leads / Leads.
- Qualified -> Successful (Qualified → Successful in the UI) = Successful Deals / Qualified Leads.
- Pipeline ROAS = Pipeline Value / Spend.
- Completed ROAS = Completed Deal Value / Spend.

ROMI is not shown as a real number yet because gross profit data is not available in the CRM analytics cohort. Revenue and pipeline value are visible, but margin, COGS, and gross profit are required before ROMI would be honest.

## Talking Points

- The page now reads left to right as a business story: lead volume, quality, successful outcomes, spend, and return.
- Leads are deal-created cohort metrics, not legacy `NEW / REG` or `client_status` logic.
- Qualified Leads use the explicit deal qualification field, so the team can explain lead quality without inventing another entity.
- Successful Deals represent the active commercial outcome set: reserved, rental, and closed won.
- Pipeline ROAS shows current value against spend; Completed ROAS stays stricter and only counts closed-won value.
- Source Economics shows the same cohort by source so spend and results can be compared side by side.
- Loss Analysis separates invalid/eligibility losses from sales losses, which helps distinguish lead-quality leakage from sales-process leakage.
- Source filters use Attribution Settings labels, with legacy/manual local source keys normalized where the mapping is obvious.

## Known Limitations

- ROMI is intentionally not numeric until gross profit or margin data is available.
- Deeper stage-to-stage conversion is not treated as authoritative because the current CRM model does not expose a clean stage progression history for analytics.
- Local demo data can still contain historical/manual source labels; the UI normalizes obvious aliases, but unknown future labels should be cleaned in Attribution Settings or spend records.
