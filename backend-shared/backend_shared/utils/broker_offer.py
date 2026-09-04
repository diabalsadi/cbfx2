from urllib.parse import urlencode, urlparse, parse_qsl, urlunparse
from typing import Optional


def referral_url(signup_url: Optional[str], broker_id: str, referral_id: Optional[str]) -> Optional[str]:
    """The broker's signup_url with UTM attribution appended, so a click
    through from our site is traceable back to us. Returns None if the
    broker has no signup_url configured yet — nothing for the customer to
    click through to. referral_id, when set, rides along as one more query
    param for brokers whose own tracking needs it alongside (or instead of)
    UTM tags."""
    if not signup_url:
        return None

    parsed = urlparse(signup_url)
    params = dict(parse_qsl(parsed.query))
    params.update({
        "utm_source": "tradeverse",
        "utm_medium": "referral",
        "utm_campaign": broker_id,
    })
    if referral_id:
        params["ref"] = referral_id

    return urlunparse(parsed._replace(query=urlencode(params)))
