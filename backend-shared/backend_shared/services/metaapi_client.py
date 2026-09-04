"""MetaApi.cloud client wrapper for MT5 account provisioning and sync.

Provisioning is async and non-blocking: `provision_account` creates + deploys
the cloud account and returns immediately once deployment has *started* — it
does not wait_connected() (that can take minutes), so the caller stores the
returned "pending"/"deployed" status and the external sync job
(`/internal/sync-metaapi`, see architecture doc §4) polls status forward from
there via `check_account_status` on each run until it reaches "connected".

Credentials/token are read lazily on first use, matching the R2 storage
pattern — a deployment without METAAPI_TOKEN configured doesn't fail to
start, provisioning just raises until the env var is set.
"""
import logging
import os
from typing import Optional, TypedDict

from metaapi_cloud_sdk import MetaApi

_client: Optional[MetaApi] = None

# Maps MetaApi's raw state/connectionStatus onto our own MT5Account.metaapi_connection_status vocabulary.
_STATE_TO_STATUS = {
    "CREATED": "pending",
    "DEPLOYING": "pending",
    "DEPLOYED": "deployed",
    "DEPLOY_FAILED": "error",
    "UNDEPLOYING": "error",
    "UNDEPLOYED": "error",
    "UNDEPLOY_FAILED": "error",
    "DELETING": "error",
    "DELETE_FAILED": "error",
    "REDEPLOY_FAILED": "error",
    "DRAFT": "pending",
}


class ProvisionResult(TypedDict):
    metaapi_account_id: str
    status: str


def _get_client() -> MetaApi:
    global _client
    if _client is None:
        token = os.environ["METAAPI_TOKEN"]
        _client = MetaApi(token)
    return _client


def get_client() -> MetaApi:
    """Public accessor for other modules (e.g. the sync job) that need the
    raw SDK client for calls this module doesn't wrap directly."""
    return _get_client()


def configured() -> bool:
    return bool(os.environ.get("METAAPI_TOKEN"))


async def provision_account(
    *,
    login: str,
    server: str,
    platform: str,
    investor_password: str,
    name: str,
) -> ProvisionResult:
    """Registers a customer's MT5 account with MetaApi and starts deployment.
    `platform` must be "mt4" or "mt5". `investor_password` must be the
    read-only investor password — never the account's main trading password.

    Always returns the created metaapi_account_id, even if deploy() fails
    (e.g. a billing gate) — the account already exists on MetaApi's side at
    that point, so callers must persist the id to retry deploying the same
    account later instead of calling create_account again and orphaning a
    duplicate (MetaApi bills per connected account)."""
    api = _get_client()
    account = await api.metatrader_account_api.create_account(
        {
            "login": login,
            "password": investor_password,
            "server": server,
            "platform": platform,
            "name": name,
            "type": "cloud-g2",
            "magic": 0,
            # "high" reliability bills as 2x a standard resource slot (redundant
            # infra) — not needed here since we only ever connect briefly to
            # poll deal history (§4), never for live/real-time copy trading.
            "reliability": "regular",
        }
    )
    try:
        await account.deploy()
        status = _STATE_TO_STATUS.get(account.state, "pending")
    except Exception:
        logging.getLogger(__name__).exception("MetaApi deploy failed for account %s", account.id)
        status = "error"
    return {"metaapi_account_id": account.id, "status": status}


async def check_account_status(metaapi_account_id: str) -> str:
    """Reloads the account from MetaApi and returns our internal status
    string. Once state is DEPLOYED, connection_status distinguishes actually
    "connected" to the broker's trade server from merely deployed-but-not-yet-linked."""
    api = _get_client()
    account = await api.metatrader_account_api.get_account(metaapi_account_id)
    await account.reload()
    if account.state == "DEPLOYED" and account.connection_status == "CONNECTED":
        return "connected"
    return _STATE_TO_STATUS.get(account.state, "error")


async def redeploy_and_check_status(metaapi_account_id: str) -> str:
    """Deploys the account only if it isn't already, then returns its fresh
    status — the shared "make sure this is up" primitive used both by
    copyfactory_sync.py's keep-alive job (accounts that must stay
    continuously deployed) and by mt5_accounts.py's customer-facing
    reconnect endpoint (a one-off retry for a broken/never-connected
    account)."""
    api = _get_client()
    account = await api.metatrader_account_api.get_account(metaapi_account_id)
    if account.state != "DEPLOYED":
        await account.deploy()
    return await check_account_status(metaapi_account_id)


async def remove_account(metaapi_account_id: str) -> None:
    """Deletes a registered account on MetaApi's own side — used when a
    customer removes a never-connected/failed MT5Account row (see
    routers/mt5_accounts.py) so the account doesn't keep existing (and
    billing) on MetaApi with nothing in our DB pointing at it anymore.
    Callers should treat failures here as non-blocking — the DB row is the
    source of truth for what the customer sees, and provision_account()
    already accepts creating a fresh account if this one is ever retried."""
    api = _get_client()
    account = await api.metatrader_account_api.get_account(metaapi_account_id)
    await account.remove()
