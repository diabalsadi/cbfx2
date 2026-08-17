from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Literal, Sequence, Union

Granularity = Literal["day", "week", "month", "year"]

# How many trailing buckets to return per granularity.
BUCKET_COUNTS: Dict[str, int] = {"day": 30, "week": 12, "month": 12, "year": 5}


def _to_date(value: Union[datetime, date]) -> date:
    return value.date() if isinstance(value, datetime) else value


def _bucket_start(d: date, granularity: Granularity) -> date:
    if granularity == "day":
        return d
    if granularity == "week":
        return d - timedelta(days=d.weekday())
    if granularity == "month":
        return d.replace(day=1)
    return d.replace(month=1, day=1)  # year


def _shift_back(d: date, granularity: Granularity, n: int) -> date:
    """The bucket start n buckets before d (n >= 0, d already a bucket start)."""
    if granularity == "day":
        return d - timedelta(days=n)
    if granularity == "week":
        return d - timedelta(weeks=n)
    if granularity == "month":
        total = d.year * 12 + (d.month - 1) - n
        year, month = divmod(total, 12)
        return date(year, month + 1, 1)
    return date(d.year - n, 1, 1)  # year


def _label(d: date, granularity: Granularity) -> str:
    if granularity == "year":
        return str(d.year)
    if granularity == "month":
        return d.strftime("%Y-%m")
    return d.isoformat()


def bucket_counts(timestamps: Sequence[datetime], granularity: Granularity) -> List[dict]:
    """Bucket a list of timestamps into the trailing N buckets (BUCKET_COUNTS)
    for the given granularity, oldest first. Buckets with no data are
    included with count 0 so the chart's x-axis stays contiguous."""
    now = datetime.now(timezone.utc)
    current_start = _bucket_start(_to_date(now), granularity)
    n = BUCKET_COUNTS[granularity]
    starts = [_shift_back(current_start, granularity, i) for i in range(n - 1, -1, -1)]
    counts = {s: 0 for s in starts}

    for ts in timestamps:
        if ts is None:
            continue
        s = _bucket_start(_to_date(ts), granularity)
        if s in counts:
            counts[s] += 1

    return [{"label": _label(s, granularity), "count": counts[s]} for s in starts]
