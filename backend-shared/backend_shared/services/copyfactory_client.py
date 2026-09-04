"""MetaApi CopyFactory client wrapper — real trade copying, layered on top
of the MetaApi trading-account connections `metaapi_client.py` provisions.

CopyFactory is a separate top-level client sharing the same METAAPI_TOKEN
(METAAPI_INTEGRATION_ARCHITECTURE.md §7 — one platform credential covers
the trading account API, MetaStats, and CopyFactory together).

Master (strategy) side only ever needs read access to the provider's trades,
so its MetaApi account is provisioned with the investor password like any
other tracked account. The follower (subscriber) side is different: a
subscriber's MetaApi account id doubles as its CopyFactory "subscriber id",
and CopyFactory places/closes real trades on it — that account must be
provisioned with the customer's actual trading password, never the
investor password (see CopySubscription.trading_password_encrypted).
"""
import os
from typing import Optional

from metaapi_cloud_copyfactory_sdk import CopyFactory

_client: Optional[CopyFactory] = None


def _get_client() -> CopyFactory:
    global _client
    if _client is None:
        token = os.environ["METAAPI_TOKEN"]
        _client = CopyFactory(token)
    return _client


def configured() -> bool:
    return bool(os.environ.get("METAAPI_TOKEN"))


async def create_strategy(master_account_id: str, name: str) -> str:
    """Registers (or re-registers) a CopyFactory strategy sourced from the
    master's MetaApi trading account. Returns the strategy id to persist as
    CopyTrader.copyfactory_strategy_id."""
    client = _get_client()
    generated = await client.configuration_api.generate_strategy_id()
    strategy_id = generated["id"]
    await client.configuration_api.update_strategy(
        strategy_id,
        {"name": name, "accountId": master_account_id},
    )
    return strategy_id


async def remove_strategy(strategy_id: str) -> None:
    """Tears down a master trader's strategy — e.g. an admin disconnecting a
    live CopyTrader. close-immediately is CopyFactory's own default, kept
    explicit here so a disconnected master never leaves open positions
    quietly still being managed on subscribers' accounts."""
    client = _get_client()
    await client.configuration_api.remove_strategy(strategy_id, {"mode": "close-immediately"})


async def subscribe(follower_account_id: str, strategy_id: str, multiplier: float, name: str) -> str:
    """Subscribes a follower's MetaApi trading account to a strategy. The
    follower's own MetaApi account id doubles as the CopyFactory subscriber
    id — returned here for CopySubscription.copyfactory_subscriber_id."""
    client = _get_client()
    await client.configuration_api.update_subscriber(
        follower_account_id,
        {
            "name": name,
            "subscriptions": [{"strategyId": strategy_id, "multiplier": multiplier}],
        },
    )
    return follower_account_id


async def unsubscribe(follower_account_id: str, strategy_id: str) -> None:
    """Removes one follower's subscription to one strategy — used when a
    customer stops copying a trader. close-immediately, same reasoning as
    remove_strategy: don't leave copied positions silently unmanaged."""
    client = _get_client()
    await client.configuration_api.remove_subscription(
        follower_account_id, strategy_id, {"mode": "close-immediately"}
    )
