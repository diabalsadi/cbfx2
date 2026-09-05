"""Idempotent startup schema patches for the shared Postgres database.

This project has no migration runner (all statements below are idempotent
ALTER TABLE / CREATE INDEX IF NOT EXISTS, extracted verbatim from the old
monolith's main.py). Wrapped in a Postgres advisory transaction lock
(pg_advisory_xact_lock — auto-released on commit or rollback, no manual
unlock needed) because once multiple services (crm-backend, user-backend)
call this independently at cold start against the same shared database,
concurrent DDL could otherwise race.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

# Arbitrary fixed lock key — must stay identical across every service that
# calls run_startup_migrations() against the same database, so concurrent
# cold starts serialize on this lock instead of racing on the DDL below.
_MIGRATION_LOCK_KEY = 847215930


def run_startup_migrations(engine: Engine) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": _MIGRATION_LOCK_KEY}
        )

        connection.execute(
            text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS market_category VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS symbol VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_title VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS og_image VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_keywords VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS image_url VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS image_url VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS referral_id VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS coverage_type VARCHAR DEFAULT 'region'"
            )
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE broker_placements ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'default'"
            )
        )
        connection.execute(
            text("UPDATE broker_placements SET region = 'default' WHERE region IS NULL")
        )
        connection.execute(
            text(
                "ALTER TABLE broker_placements DROP CONSTRAINT IF EXISTS uq_broker_placement_section_position"
            )
        )
        # Postgres has no ADD CONSTRAINT IF NOT EXISTS, and this block re-runs on
        # every startup, so guard it explicitly to stay idempotent.
        connection.execute(
            text(
                """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_broker_placement_section_region_position'
                ) THEN
                    ALTER TABLE broker_placements
                        ADD CONSTRAINT uq_broker_placement_section_region_position UNIQUE (section, region, position);
                END IF;
            END $$;
            """
            )
        )
        connection.execute(
            text(
                "ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'default'"
            )
        )
        connection.execute(
            text("UPDATE ad_banners SET region = 'default' WHERE region IS NULL")
        )
        connection.execute(
            text("ALTER TABLE ad_banners DROP CONSTRAINT IF EXISTS uq_ad_banner_page_slot")
        )
        connection.execute(
            text(
                """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_ad_banner_page_slot_region'
                ) THEN
                    ALTER TABLE ad_banners
                        ADD CONSTRAINT uq_ad_banner_page_slot_region UNIQUE (page, slot, region);
                END IF;
            END $$;
            """
            )
        )
        connection.execute(
            text(
                "ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS features JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS disclaimer VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE seo_meta ADD COLUMN IF NOT EXISTS sub_key VARCHAR DEFAULT ''")
        )
        connection.execute(text("UPDATE seo_meta SET sub_key = '' WHERE sub_key IS NULL"))
        connection.execute(
            text("ALTER TABLE seo_meta DROP CONSTRAINT IF EXISTS seo_meta_route_key")
        )
        connection.execute(
            text(
                """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_seo_meta_route_sub_key'
                ) THEN
                    ALTER TABLE seo_meta
                        ADD CONSTRAINT uq_seo_meta_route_sub_key UNIQUE (route, sub_key);
                END IF;
            END $$;
            """
            )
        )
        connection.execute(
            text(
                "ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS default_keywords VARCHAR"
            )
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR")
        )
        connection.execute(
            text(
                """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_referral_code'
                ) THEN
                    ALTER TABLE users ADD CONSTRAINT uq_users_referral_code UNIQUE (referral_code);
                END IF;
            END $$;
            """
            )
        )
        connection.execute(
            text("ALTER TABLE visits ADD COLUMN IF NOT EXISTS visitor_key VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS token_hash VARCHAR"
            )
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS owner_email VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        connection.execute(
            text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS broker_id VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS images JSON DEFAULT '{}'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS default_image_url VARCHAR"
            )
        )
        # Leftover from the pre-broker_id design (free-text sponsor fields, since
        # replaced by broker_id + images/default_image_url above) — these three
        # are NOT NULL with no default in older databases, which blocks every
        # insert into a page/slot/region combo that didn't already have a row.
        # logo_src/cta_label from that same old design are nullable and harmless,
        # so left alone (same convention as brokers.regulation_badges).
        connection.execute(
            text("ALTER TABLE ad_banners DROP COLUMN IF EXISTS sponsor_name")
        )
        connection.execute(text("ALTER TABLE ad_banners DROP COLUMN IF EXISTS description"))
        connection.execute(text("ALTER TABLE ad_banners DROP COLUMN IF EXISTS badge_text"))
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS signup_url VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS account_types JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS terms_text TEXT")
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS payout_destination VARCHAR DEFAULT 'wallet'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS payout_duration_days INTEGER"
            )
        )
        connection.execute(
            text("ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS server VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS platform VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS investor_password_encrypted VARCHAR"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS metaapi_account_id VARCHAR"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS metaapi_connection_status VARCHAR NOT NULL DEFAULT 'not_connected'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS metaapi_last_synced_at TIMESTAMPTZ"
            )
        )
        # trade_records.rebate_amount/rebate_credited_at (Phase 3) are superseded
        # by expected_amount/payout_id (Phase 4 rework, 2026-08-29) — the table
        # was still empty (nothing had synced yet) when this changed, so the old
        # columns are just left as harmless unused leftovers rather than renamed.
        connection.execute(
            text("ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS expected_amount FLOAT")
        )
        connection.execute(
            text("ALTER TABLE trade_records ADD COLUMN IF NOT EXISTS payout_id VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR NOT NULL DEFAULT 'inactive'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS show_on_cashback BOOLEAN NOT NULL DEFAULT TRUE"
            )
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS rating FLOAT")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS tagline TEXT")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS founded_year INTEGER")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS headquarters VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS min_deposit FLOAT")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS max_leverage VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS execution_type VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS regulation_badges JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS segregated_funds BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS negative_balance_protection BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS compensation_scheme VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS spreads JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS platforms JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS funding_methods JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS support_channels JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS support_languages JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS support_hours VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS pros JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS cons JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS about TEXT"))
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS regulations JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE"
            )
        )
        connection.execute(
            text("ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS broker_id VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS mt5_number VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS server VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS platform VARCHAR")
        )
        connection.execute(
            text(
                "ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS investor_password_encrypted VARCHAR"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS metaapi_account_id VARCHAR"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS metaapi_connection_status VARCHAR NOT NULL DEFAULT 'not_connected'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE copy_traders ADD COLUMN IF NOT EXISTS copyfactory_strategy_id VARCHAR"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE brokers ADD COLUMN IF NOT EXISTS withdrawal_methods JSON DEFAULT '[]'::json"
            )
        )
        connection.execute(
            text("ALTER TABLE plays ADD COLUMN IF NOT EXISTS close_reason VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE plays ADD COLUMN IF NOT EXISTS confidence VARCHAR")
        )

        # Indexes on FK/filter columns that predate their model's index=True —
        # create_all() only applies index=True to brand-new tables, so existing
        # deployments need these added explicitly. Named to match SQLAlchemy's
        # own ix_<table>_<column> convention so a fresh database's create_all()
        # created index and this statement never conflict.
        for _table, _column in [
            ("articles", "author_email"),
            ("articles", "is_published"),
            ("articles", "article_type"),
            ("analysis", "author_email"),
            ("forum_threads", "author_email"),
            ("forum_replies", "thread_id"),
            ("forum_replies", "author_email"),
            ("brokers", "owner_email"),
            ("campaigns", "client_id"),
            ("campaigns", "status"),
            ("campaigns", "created_by"),
            ("broker_placements", "broker_id"),
            ("mt5_accounts", "user_email"),
            ("mt5_accounts", "broker_id"),
            ("wallet_transactions", "mt5_account_id"),
            ("plays", "status"),
            ("plays", "author_email"),
            ("users", "referred_by"),
            ("copy_traders", "is_active"),
            ("mt5_accounts", "metaapi_account_id"),
            ("trade_records", "payout_id"),
            ("users", "stripe_customer_id"),
        ]:
            connection.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS ix_{_table}_{_column} ON {_table} ({_column})"
                )
            )
