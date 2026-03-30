"""Base seeder — shared data-generation logic and configuration.

All constants and generation helpers live here; dialect-specific
write methods (``_create_events_table``, ``_insert_events``, ``seed``)
are implemented by ``DuckDBSeeder`` and ``SQLiteSeeder``.
"""

from __future__ import annotations

import random
import uuid
from abc import ABC, abstractmethod
from collections.abc import Iterator
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


class SeedConfig(BaseSettings):
    """Seeding-only settings — read from seeders/.env (no STRATIFIO_ prefix)."""

    seed_users: int | None = None
    seed_days: int | None = None

    class Config:
        env_prefix = ""
        env_file = str(Path(__file__).parent / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FUNNEL_PATH = ["Home", "Search", "ProductView", "AddToCart", "Purchase"]

FUNNEL_DROP_OFF = {
    "Home": 1.0,
    "Search": 0.40,
    "ProductView": 0.60,
    "AddToCart": 0.70,
    "Purchase": 0.80,
}

COUNTRIES: dict[str, Any] = {
    "US": {
        "timezone": "America/New_York",
        "weight": 0.35,
        "cities": [
            "New York",
            "Los Angeles",
            "Chicago",
            "Houston",
            "Phoenix",
            "Philadelphia",
            "San Antonio",
            "San Diego",
            "Dallas",
            "San Jose",
        ],
        "currency": "USD",
    },
    "UK": {
        "timezone": "Europe/London",
        "weight": 0.12,
        "cities": [
            "London",
            "Birmingham",
            "Manchester",
            "Leeds",
            "Glasgow",
            "Liverpool",
            "Bristol",
            "Sheffield",
            "Edinburgh",
            "Nottingham",
        ],
        "currency": "GBP",
    },
    "DE": {
        "timezone": "Europe/Berlin",
        "weight": 0.10,
        "cities": [
            "Berlin",
            "Hamburg",
            "Munich",
            "Cologne",
            "Frankfurt",
            "Stuttgart",
            "Dusseldorf",
            "Dortmund",
            "Essen",
            "Leipzig",
        ],
        "currency": "EUR",
    },
    "FR": {
        "timezone": "Europe/Paris",
        "weight": 0.08,
        "cities": [
            "Paris",
            "Marseille",
            "Lyon",
            "Toulouse",
            "Nice",
            "Nantes",
            "Strasbourg",
            "Montpellier",
            "Bordeaux",
            "Lille",
        ],
        "currency": "EUR",
    },
    "JP": {
        "timezone": "Asia/Tokyo",
        "weight": 0.10,
        "cities": [
            "Tokyo",
            "Yokohama",
            "Osaka",
            "Nagoya",
            "Sapporo",
            "Fukuoka",
            "Kobe",
            "Kyoto",
            "Kawasaki",
            "Saitama",
        ],
        "currency": "JPY",
    },
    "BR": {
        "timezone": "America/Sao_Paulo",
        "weight": 0.08,
        "cities": [
            "Sao Paulo",
            "Rio de Janeiro",
            "Brasilia",
            "Salvador",
            "Fortaleza",
            "Belo Horizonte",
            "Manaus",
            "Curitiba",
            "Recife",
            "Porto Alegre",
        ],
        "currency": "BRL",
    },
    "IN": {
        "timezone": "Asia/Kolkata",
        "weight": 0.12,
        "cities": [
            "Mumbai",
            "Delhi",
            "Bangalore",
            "Hyderabad",
            "Chennai",
            "Kolkata",
            "Ahmedabad",
            "Pune",
            "Surat",
            "Jaipur",
        ],
        "currency": "INR",
    },
    "AU": {
        "timezone": "Australia/Sydney",
        "weight": 0.05,
        "cities": [
            "Sydney",
            "Melbourne",
            "Brisbane",
            "Perth",
            "Adelaide",
            "Gold Coast",
            "Canberra",
            "Newcastle",
            "Wollongong",
            "Hobart",
        ],
        "currency": "AUD",
    },
}

US_HOLIDAYS_2024_2025 = [
    (1, 1, "New Year's Day"),
    (1, 15, "MLK Day"),
    (2, 19, "Presidents Day"),
    (5, 27, "Memorial Day"),
    (7, 4, "Independence Day"),
    (9, 2, "Labor Day"),
    (11, 28, "Thanksgiving"),
    (12, 25, "Christmas"),
    (1, 1, "New Year's Day"),
    (1, 20, "MLK Day"),
    (2, 17, "Presidents Day"),
    (5, 26, "Memorial Day"),
    (7, 4, "Independence Day"),
    (9, 1, "Labor Day"),
    (11, 27, "Thanksgiving"),
    (12, 25, "Christmas"),
]

BROWSERS = [
    ("Chrome", 0.65),
    ("Safari", 0.20),
    ("Firefox", 0.08),
    ("Edge", 0.05),
    ("Opera", 0.02),
]

OPERATING_SYSTEMS = [
    ("Windows", 0.35),
    ("macOS", 0.15),
    ("iOS", 0.22),
    ("Android", 0.20),
    ("Linux", 0.05),
    ("Chrome OS", 0.03),
]

DEVICE_TYPES = [
    ("Desktop", 0.45),
    ("Mobile", 0.40),
    ("Tablet", 0.15),
]

SCREEN_RESOLUTIONS = {
    "Desktop": ["1920x1080", "2560x1440", "1366x768", "1440x900", "1536x864"],
    "Mobile": ["390x844", "412x915", "375x667", "360x780", "414x896"],
    "Tablet": ["768x1024", "834x1112", "1024x1366", "820x1180"],
}

REFERRERS = [
    ("google", 0.35),
    ("direct", 0.25),
    ("facebook", 0.15),
    ("instagram", 0.08),
    ("email", 0.07),
    ("twitter", 0.04),
    ("linkedin", 0.03),
    ("bing", 0.02),
    ("duckduckgo", 0.01),
]

COUNTRY_TO_SERVER_REGION: dict[str, str] = {
    "US": "us",
    "BR": "us",
    "UK": "eu",
    "DE": "eu",
    "FR": "eu",
    "JP": "asia",
    "IN": "asia",
    "AU": "asia",
}

PRODUCT_CATEGORIES: dict[str, Any] = {
    "Electronics": {
        "products": [
            ("Wireless Bluetooth Headphones", 79.99),
            ('4K Ultra HD Smart TV 55"', 549.99),
            ("Laptop Stand Aluminum", 49.99),
            ("Mechanical Gaming Keyboard", 129.99),
            ("USB-C Hub 7-in-1", 39.99),
            ("Wireless Mouse Ergonomic", 34.99),
            ("Portable SSD 1TB", 109.99),
            ("Smart Watch Fitness Tracker", 199.99),
            ("Noise Cancelling Earbuds", 149.99),
            ("Webcam HD 1080p", 69.99),
        ],
        "weight": 0.25,
    },
    "Clothing": {
        "products": [
            ("Men's Cotton T-Shirt", 29.99),
            ("Women's Summer Dress", 59.99),
            ("Denim Jeans Slim Fit", 79.99),
            ("Winter Parka Jacket", 149.99),
            ("Running Shoes Sports", 99.99),
            ("Wool Sweater Classic", 89.99),
            ("Athletic Leggings", 44.99),
            ("Leather Belt Premium", 39.99),
            ("Casual Sneakers", 74.99),
            ("Silk Scarf Designer", 54.99),
        ],
        "weight": 0.22,
    },
    "Home & Garden": {
        "products": [
            ("Memory Foam Pillow Set", 49.99),
            ("Indoor Plant Pot Set", 34.99),
            ("LED Desk Lamp Modern", 44.99),
            ("Kitchen Knife Set Professional", 89.99),
            ("Non-Stick Cookware Set", 129.99),
            ("Bath Towel Set Egyptian Cotton", 59.99),
            ("Wall Art Canvas Print", 79.99),
            ("Garden Tool Set 5-Piece", 39.99),
            ("Air Purifier HEPA Filter", 199.99),
            ("Coffee Maker Programmable", 89.99),
        ],
        "weight": 0.18,
    },
    "Sports": {
        "products": [
            ("Yoga Mat Premium", 39.99),
            ("Dumbbell Set Adjustable", 149.99),
            ("Resistance Bands Set", 24.99),
            ("Foam Roller Recovery", 29.99),
            ("Basketball Official Size", 34.99),
            ("Tennis Racket Pro", 89.99),
            ("Cycling Helmet Safety", 59.99),
            ("Running Hydration Vest", 44.99),
            ("Jump Rope Speed", 19.99),
            ("Fitness Tracker Watch", 79.99),
        ],
        "weight": 0.15,
    },
    "Books": {
        "products": [
            ("Bestseller Fiction Novel", 14.99),
            ("Business Strategy Guide", 24.99),
            ("Cookbook Mediterranean", 29.99),
            ("Self-Help Productivity", 19.99),
            ("Science Fiction Collection", 22.99),
            ("History Encyclopedia", 34.99),
            ("Children's Picture Book", 12.99),
            ("Biography Famous Leaders", 21.99),
            ("Programming Tutorial", 44.99),
            ("Art Photography Collection", 39.99),
        ],
        "weight": 0.12,
    },
    "Beauty": {
        "products": [
            ("Vitamin C Serum Face", 34.99),
            ("Moisturizing Cream Set", 49.99),
            ("Perfume Designer", 89.99),
            ("Hair Dryer Professional", 79.99),
            ("Makeup Brush Set", 29.99),
            ("Facial Cleanser Gentle", 24.99),
            ("Sunscreen SPF 50", 19.99),
            ("Anti-Aging Night Cream", 54.99),
            ("Lipstick Collection", 39.99),
            ("Hair Styling Tool", 59.99),
        ],
        "weight": 0.08,
    },
}

URL_PATHS = {
    "Home": "/",
    "Search": "/search?q={query}",
    "ProductView": "/products/{product_id}",
    "AddToCart": "/cart/add/{product_id}",
    "Purchase": "/checkout/complete",
}

SEARCH_QUERIES = [
    "wireless headphones",
    "summer dress",
    "yoga mat",
    "coffee maker",
    "running shoes",
    "smart watch",
    "kitchen knives",
    "headphones",
    "tv stand",
    "book",
    "skincare",
    "laptop",
    "phone case",
    "gaming keyboard",
    "winter jacket",
    "fitness tracker",
]

COUNTRY_TRAITS: dict[str, Any] = {
    "US": {
        "first_names": [
            "James", "John", "Robert", "Michael", "William", "David", "Richard",
            "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda",
            "Barbara", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen",
        ],
        "last_names": [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
            "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Jackson", "White",
            "Harris", "Martin", "Thompson", "Young", "Robinson", "Lewis",
        ],
        "phone_format": "+1-{area}-{mid}-XXXX",
        "phone_area_codes": ["212", "310", "312", "713", "602", "215", "210", "619", "214", "408"],
        "phone_mid_range": (100, 999),
        "email_providers": ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"],
    },
    "UK": {
        "first_names": [
            "Oliver", "Jack", "Harry", "George", "Noah", "Charlie", "Jacob",
            "Alfie", "Freddie", "Oscar", "Olivia", "Amelia", "Isla", "Ava",
            "Mia", "Isabella", "Sophia", "Grace", "Lily", "Emily",
        ],
        "last_names": [
            "Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans",
            "Wilson", "Thomas", "Roberts", "Johnson", "Lewis", "Walker", "Robinson",
            "Wood", "Thompson", "White", "Watson", "Jackson", "Wright",
        ],
        "phone_format": "+44-7{mid}-XXX-XXX",
        "phone_area_codes": None,
        "phone_mid_range": (100, 999),
        "email_providers": ["gmail.com", "yahoo.co.uk", "hotmail.co.uk", "outlook.com", "btinternet.com"],
    },
    "DE": {
        "first_names": [
            "Luca", "Leon", "Finn", "Jonas", "Luis", "Max", "Felix", "Paul",
            "Ben", "Elias", "Emma", "Mia", "Hannah", "Sofia", "Anna",
            "Lena", "Laura", "Julia", "Sarah", "Lea",
        ],
        "last_names": [
            "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer",
            "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch",
            "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann",
            "Schwarz", "Zimmermann",
        ],
        "phone_format": "+49-{area}-XXXXXXX",
        "phone_area_codes": ["30", "40", "89", "221", "69", "711", "211", "231", "201", "341"],
        "phone_mid_range": None,
        "email_providers": ["gmail.com", "web.de", "gmx.de", "t-online.de", "freenet.de"],
    },
    "FR": {
        "first_names": [
            "Gabriel", "Léo", "Raphaël", "Louis", "Lucas", "Arthur", "Hugo",
            "Adam", "Liam", "Jules", "Emma", "Jade", "Louise", "Alice",
            "Chloé", "Inès", "Léa", "Manon", "Camille", "Zoé",
        ],
        "last_names": [
            "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard",
            "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent",
            "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux",
            "Vincent", "Fournier",
        ],
        "phone_format": "+33-6{mid}-XX-XX-XX",
        "phone_area_codes": None,
        "phone_mid_range": (10, 99),
        "email_providers": ["gmail.com", "orange.fr", "free.fr", "sfr.fr", "laposte.net"],
    },
    "JP": {
        "first_names": [
            "Haruto", "Yuto", "Sota", "Yuki", "Hayato", "Haruki", "Ryusei",
            "Kento", "Shota", "Daiki", "Yui", "Aoi", "Hina", "Rin",
            "Saki", "Miyu", "Nanami", "Sakura", "Haruka", "Mana",
        ],
        "last_names": [
            "Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito",
            "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada",
            "Sasaki", "Yamaguchi", "Matsumoto", "Inoue", "Kimura", "Hayashi",
            "Shimizu", "Yamazaki",
        ],
        "phone_format": "+81-{area}-XXXX-XXXX",
        "phone_area_codes": ["3", "45", "6", "52", "11", "92", "78", "75", "44", "48"],
        "phone_mid_range": None,
        "email_providers": ["gmail.com", "yahoo.co.jp", "docomo.ne.jp", "ezweb.ne.jp", "softbank.ne.jp"],
    },
    "BR": {
        "first_names": [
            "Miguel", "Arthur", "Heitor", "Bernardo", "Davi", "Lorenzo",
            "Théo", "Pedro", "Gabriel", "Lucas", "Alice", "Sophia", "Helena",
            "Valentina", "Laura", "Isabella", "Manuela", "Julia", "Heloísa", "Luisa",
        ],
        "last_names": [
            "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira",
            "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro",
            "Martins", "Carvalho", "Almeida", "Lopes", "Sousa", "Fernandes",
            "Vieira", "Barbosa",
        ],
        "phone_format": "+55-{area}-9XXXX-XXXX",
        "phone_area_codes": ["11", "21", "61", "71", "85", "31", "92", "41", "81", "51"],
        "phone_mid_range": None,
        "email_providers": ["gmail.com", "hotmail.com", "yahoo.com.br", "uol.com.br", "bol.com.br"],
    },
    "IN": {
        "first_names": [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh",
            "Ayaan", "Krishna", "Ishaan", "Diya", "Ananya", "Pari", "Anika",
            "Aadhya", "Aarohi", "Myra", "Sara", "Fatima", "Kiara",
        ],
        "last_names": [
            "Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Shah",
            "Mehta", "Joshi", "Yadav", "Mishra", "Nair", "Iyer", "Reddy",
            "Bose", "Chatterjee", "Das", "Mukherjee", "Pillai", "Menon",
        ],
        "phone_format": "+91-{area}-XXXX-XXXX",
        "phone_area_codes": ["22", "11", "80", "40", "44", "33", "79", "20", "261", "141"],
        "phone_mid_range": None,
        "email_providers": ["gmail.com", "yahoo.in", "hotmail.com", "rediffmail.com", "outlook.com"],
    },
    "AU": {
        "first_names": [
            "Oliver", "William", "Jack", "Noah", "Thomas", "Liam", "Ethan",
            "James", "Lucas", "Cooper", "Charlotte", "Olivia", "Amelia", "Isla",
            "Mia", "Ava", "Grace", "Lily", "Sophie", "Chloe",
        ],
        "last_names": [
            "Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "Johnson",
            "White", "Martin", "Anderson", "Thompson", "Nguyen", "Harris",
            "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott",
        ],
        "phone_format": "+61-4{mid}-XXX-XXX",
        "phone_area_codes": None,
        "phone_mid_range": (10, 99),
        "email_providers": ["gmail.com", "yahoo.com.au", "hotmail.com", "outlook.com", "bigpond.com"],
    },
}

INSERT_BATCH_SIZE = 5000
PROGRESS_INTERVAL = 50_000


# ---------------------------------------------------------------------------
# Abstract base seeder
# ---------------------------------------------------------------------------


class BaseSeeder(ABC):
    """Abstract base seeder — data generation only, no DB dependency."""

    def __init__(self, config: SeedConfig | None = None):
        self.config = config or SeedConfig()
        self._product_cache: list[dict] = []

    # ------------------------------------------------------------------
    # Abstract interface — implemented per dialect
    # ------------------------------------------------------------------

    @abstractmethod
    def seed(self) -> dict[str, int]:
        """Run the full seed: open DB, generate data, write, close, return stats."""
        ...

    @abstractmethod
    def _create_events_table(self) -> None:
        """Create the events table in the target database."""
        ...

    @abstractmethod
    def _insert_events(self, events: list[tuple]) -> None:
        """Bulk-insert a batch of ``(user_id, event_name, timestamp, props)`` tuples."""
        ...

    # ------------------------------------------------------------------
    # Shared data-generation helpers
    # ------------------------------------------------------------------

    def _generate_products(self) -> None:
        self._product_cache = []
        for category, data in PRODUCT_CATEGORIES.items():
            for product_name, price in data["products"]:
                self._product_cache.append(
                    {
                        "product_id": str(uuid.uuid4())[:8],
                        "product_name": product_name,
                        "product_category": category,
                        "product_price": price,
                        "weight": data["weight"],
                    }
                )

    def _generate_traits(self, country_code: str) -> dict:
        t = COUNTRY_TRAITS[country_code]

        first_name = random.choice(t["first_names"])
        last_name = random.choice(t["last_names"])

        # Phone — replace X with random digits, keep the rest as-is
        fmt: str = t["phone_format"]
        if t["phone_area_codes"]:
            fmt = fmt.replace("{area}", random.choice(t["phone_area_codes"]))
        if t["phone_mid_range"]:
            lo, hi = t["phone_mid_range"]
            fmt = fmt.replace("{mid}", str(random.randint(lo, hi)))
        phone = "".join(
            str(random.randint(0, 9)) if ch == "X" else ch for ch in fmt
        )

        provider = random.choice(t["email_providers"])
        email_local = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 999)}"
        email = f"{email_local}@{provider}"

        dob_start = date(1960, 1, 1)
        dob_end = date(2005, 12, 31)
        dob_days = (dob_end - dob_start).days
        dob = dob_start + timedelta(days=random.randint(0, dob_days))

        return {
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "email": email,
            "date_of_birth": dob.isoformat(),
        }

    def _get_random_product(self) -> dict:
        weights = [p["weight"] for p in self._product_cache]
        return random.choices(self._product_cache, weights=weights, k=1)[0]

    def _generate_users(self) -> list[dict]:
        users = []
        num_users = self.config.seed_users if self.config.seed_users else 0

        for _ in range(num_users):
            country_code = self._weighted_choice(
                [(code, data["weight"]) for code, data in COUNTRIES.items()]
            )
            country_data = COUNTRIES[country_code]

            is_returning = random.random() < 0.40
            is_power_user = is_returning and random.random() < 0.20
            browser_only = random.random() < 0.25

            device_type = self._weighted_choice(DEVICE_TYPES)
            browser = self._weighted_choice(BROWSERS)
            os_choice = self._weighted_choice(OPERATING_SYSTEMS)

            if device_type == "Desktop" and os_choice in ["iOS", "Android"]:
                os_choice = self._weighted_choice(
                    [("Windows", 0.60), ("macOS", 0.30), ("Linux", 0.10)]
                )
            elif device_type in ["Mobile", "Tablet"] and os_choice in [
                "Windows",
                "Linux",
            ]:
                os_choice = self._weighted_choice([("iOS", 0.55), ("Android", 0.45)])

            screen_res = random.choice(SCREEN_RESOLUTIONS[device_type])

            users.append(
                {
                    "id": str(uuid.uuid4()),
                    "country": country_code,
                    "city": random.choice(country_data["cities"]),
                    "timezone": country_data["timezone"],
                    "currency": country_data["currency"],
                    "device_type": device_type,
                    "browser": browser,
                    "os": os_choice,
                    "screen_resolution": screen_res,
                    "is_returning": is_returning,
                    "is_power_user": is_power_user,
                    "browser_only": browser_only,
                    "completed_purchase": False,
                    "sessions": [],
                    "traits": self._generate_traits(country_code),
                }
            )

        return users

    def _is_us_holiday(self, dt: datetime) -> bool:
        for month, day, _ in US_HOLIDAYS_2024_2025:
            if dt.month == month and dt.day == day:
                return True
        return False

    def _get_hour_weight(self, hour: int, is_weekend: bool) -> float:
        if is_weekend:
            if 10 <= hour <= 14:
                return 1.0
            elif 8 <= hour <= 9 or 15 <= hour <= 18:
                return 0.7
            elif 19 <= hour <= 22:
                return 0.5
            elif 6 <= hour <= 7:
                return 0.3
            else:
                return 0.15
        else:
            if 9 <= hour <= 11:
                return 1.0
            elif 14 <= hour <= 16:
                return 0.95
            elif 12 <= hour <= 13:
                return 0.6
            elif hour == 8 or 17 <= hour <= 19:
                return 0.5
            elif 20 <= hour <= 22:
                return 0.3
            elif 6 <= hour <= 7:
                return 0.2
            else:
                return 0.1

    def _get_country_hour(self, base_dt: datetime, country_code: str) -> int:
        tz_offsets = {
            "US": -5,
            "UK": 0,
            "DE": 1,
            "FR": 1,
            "JP": 9,
            "BR": -3,
            "IN": 5.5,
            "AU": 11,
        }
        offset = tz_offsets.get(country_code, 0)
        return (base_dt.hour + int(offset)) % 24

    def _generate_session_start(
        self, base_time: datetime, country_code: str
    ) -> datetime:
        is_weekend = base_time.weekday() >= 5
        is_holiday = self._is_us_holiday(base_time)

        weights = []
        for hour in range(24):
            local_hour = self._get_country_hour(
                base_time.replace(hour=hour), country_code
            )
            weight = self._get_hour_weight(local_hour, is_weekend)
            if is_holiday and country_code == "US":
                weight *= 0.4
            weights.append(weight)

        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]

        chosen_hour = random.choices(range(24), weights=weights, k=1)[0]
        return base_time.replace(
            hour=chosen_hour,
            minute=random.randint(0, 59),
            second=random.randint(0, 59),
        )

    def _generate_events_batched(self, users: list[dict]) -> Iterator[list[tuple]]:
        batch: list[tuple] = []
        seed_days = self.config.seed_days if self.config.seed_days else 0
        base_time = datetime.now() - timedelta(days=seed_days)

        for user in users:
            if user["is_power_user"]:
                num_sessions = random.randint(8, 20)
            elif user["is_returning"]:
                num_sessions = random.randint(2, 7)
            else:
                num_sessions = random.randint(1, 3)

            user_sessions = []

            for session_idx in range(num_sessions):
                session_date = base_time + timedelta(
                    days=random.randint(0, seed_days - 1)
                )
                session_start = self._generate_session_start(
                    session_date, user["country"]
                )
                session_id = f"{user['id']}_{session_idx + 1}"
                user_sessions.append(session_id)

                referrer = self._weighted_choice(REFERRERS)

                if user["browser_only"] and random.random() < 0.8:
                    session_events = self._generate_browse_session(
                        user, session_start, session_id, referrer
                    )
                else:
                    session_events = self._generate_funnel_session(
                        user, session_start, session_id, referrer
                    )

                batch.extend(session_events)

                if len(batch) >= INSERT_BATCH_SIZE:
                    yield batch
                    batch = []

            user["sessions"] = user_sessions

        if batch:
            yield batch

    def _generate_funnel_session(
        self, user: dict, session_start: datetime, session_id: str, referrer: str
    ) -> list[tuple]:
        events = []
        current_time = session_start
        visited_products: list[dict] = []
        progress_prob = 1.0

        for step_idx, event_name in enumerate(FUNNEL_PATH):
            if random.random() > progress_prob:
                break

            if step_idx > 0:
                current_time += timedelta(
                    minutes=random.randint(1, 5)
                    if event_name == "AddToCart"
                    else random.randint(2, 8)
                )

            properties = self._build_event_properties(
                user, session_id, referrer, event_name, visited_products
            )

            if event_name == "ProductView":
                product = self._get_random_product()
                properties.update(
                    {
                        "product_id": product["product_id"],
                        "product_name": product["product_name"],
                        "product_category": product["product_category"],
                        "product_price": product["product_price"],
                    }
                )
                visited_products.append(product)

                while random.random() < 0.4:
                    current_time += timedelta(minutes=random.randint(1, 4))
                    product = self._get_random_product()
                    additional_props = self._build_event_properties(
                        user, session_id, referrer, "ProductView", visited_products
                    )
                    additional_props.update(
                        {
                            "product_id": product["product_id"],
                            "product_name": product["product_name"],
                            "product_category": product["product_category"],
                            "product_price": product["product_price"],
                        }
                    )
                    events.append(
                        (user["id"], "ProductView", current_time, additional_props,
                         self._get_server(user["country"]))
                    )
                    visited_products.append(product)

            elif event_name == "AddToCart":
                if visited_products:
                    cart_product = random.choice(visited_products)
                    properties.update(
                        {
                            "product_id": cart_product["product_id"],
                            "product_name": cart_product["product_name"],
                            "product_category": cart_product["product_category"],
                            "product_price": cart_product["product_price"],
                            "quantity": random.randint(1, 3),
                        }
                    )

            elif event_name == "Purchase":
                if visited_products:
                    purchased = random.sample(
                        visited_products,
                        min(len(visited_products), random.randint(1, 3)),
                    )
                    total = sum(p["product_price"] for p in purchased)
                    properties.update(
                        {
                            "order_id": str(uuid.uuid4())[:12],
                            "total_amount": round(total, 2),
                            "currency": user["currency"],
                            "item_count": len(purchased),
                            "payment_method": random.choice(
                                ["credit_card", "paypal", "apple_pay", "google_pay"]
                            ),
                        }
                    )
                    user["completed_purchase"] = True

            events.append((user["id"], event_name, current_time, properties,
                           self._get_server(user["country"])))
            progress_prob = FUNNEL_DROP_OFF[event_name]

        return events

    def _generate_browse_session(
        self, user: dict, session_start: datetime, session_id: str, referrer: str
    ) -> list[tuple]:
        events = []
        current_time = session_start

        events.append(
            (
                user["id"],
                "Home",
                current_time,
                self._build_event_properties(user, session_id, referrer, "Home", []),
                self._get_server(user["country"]),
            )
        )

        current_time += timedelta(minutes=random.randint(1, 3))
        events.append(
            (
                user["id"],
                "Search",
                current_time,
                self._build_event_properties(user, session_id, referrer, "Search", []),
                self._get_server(user["country"]),
            )
        )

        num_products = random.randint(1, 5)
        for _ in range(num_products):
            current_time += timedelta(minutes=random.randint(1, 4))
            product = self._get_random_product()
            props = self._build_event_properties(
                user, session_id, referrer, "ProductView", []
            )
            props.update(
                {
                    "product_id": product["product_id"],
                    "product_name": product["product_name"],
                    "product_category": product["product_category"],
                    "product_price": product["product_price"],
                }
            )
            events.append((user["id"], "ProductView", current_time, props,
                           self._get_server(user["country"])))

        return events

    def _build_event_properties(
        self,
        user: dict,
        session_id: str,
        referrer: str,
        event_name: str,
        visited_products: list[dict],
    ) -> dict:
        properties = {
            "session_id": session_id,
            "country": user["country"],
            "city": user["city"],
            "timezone": user["timezone"],
            "device_type": user["device_type"],
            "browser": user["browser"],
            "os": user["os"],
            "screen_resolution": user["screen_resolution"],
            "referrer": referrer,
            "is_returning_user": user["is_returning"],
        }

        if event_name == "Home":
            properties["page_url"] = URL_PATHS["Home"]
        elif event_name == "Search":
            query = random.choice(SEARCH_QUERIES)
            properties["page_url"] = URL_PATHS["Search"].format(
                query=query.replace(" ", "+")
            )
            properties["search_query"] = query
        elif event_name == "ProductView":
            if visited_products:
                product = visited_products[-1]
                properties["page_url"] = URL_PATHS["ProductView"].format(
                    product_id=product["product_id"]
                )
        elif event_name == "AddToCart":
            properties["page_url"] = "/cart"
        elif event_name == "Purchase":
            properties["page_url"] = URL_PATHS["Purchase"]

        return properties

    def _weighted_choice(self, choices: list[tuple]) -> str:
        items = [c[0] for c in choices]
        weights = [c[1] for c in choices]
        return random.choices(items, weights=weights, k=1)[0]

    def _get_server(self, country_code: str) -> str:
        region = COUNTRY_TO_SERVER_REGION.get(country_code, "us")
        number = random.choice(("1", "2"))
        return f"server.{region}.{number}"
