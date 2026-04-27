"""Single source of truth for valid axis values.

Both the Python seeder and the TypeScript frontend must agree on these values.
The TypeScript equivalent lives at:
  apps/seeder-studio/src/lib/yaml/axisContract.ts

When adding or removing values here, update that file too.
"""

from __future__ import annotations

from typing import Literal

GrowthValue = Literal[
    "explosive",
    "strong",
    "steady",
    "flat",
    "declining",
    "seasonal",
    "hockey_stick",
]

StickinessValue = Literal[
    "addictive",
    "sticky",
    "normal",
    "churn_heavy",
    "one_shot",
]

EngagementDepthValue = Literal[
    "shallow",
    "medium",
    "deep",
]

ViralityValue = Literal[
    "none",
    "weak",
    "moderate",
    "strong_viral",
]

ScaleValue = Literal[
    "tiny",
    "small",
    "medium",
    "large",
]

AnomaliesValue = Literal[
    "none",
    "clean",
    "moderate",
    "campaigns",
    "outages",
    "ab_tests",
    "full",
    "explicit",
]

MonetizationValue = Literal[
    "one_off_purchase",
    "subscription",
    "iap_whales",
    "ad_supported",
    "freemium",
    "marketplace_fee",
]

GeographyValue = Literal[
    "global",
    "us_only",
    "eu_only",
    "apac_only",
]

# All valid values per axis — used for validation and documentation.
AXIS_VALUES: dict[str, tuple[str, ...]] = {
    "growth": GrowthValue.__args__,
    "stickiness": StickinessValue.__args__,
    "engagement_depth": EngagementDepthValue.__args__,
    "virality": ViralityValue.__args__,
    "scale": ScaleValue.__args__,
    "anomalies": AnomaliesValue.__args__,
    "monetization": MonetizationValue.__args__,
    "geography": GeographyValue.__args__,
}
