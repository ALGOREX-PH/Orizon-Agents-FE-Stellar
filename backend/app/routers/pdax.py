"""
/api/pdax/* — surfaces the PDAX institutions API (PHP ↔ crypto on/off-ramp)
to the frontend.

Auth is handled server-side: the backend logs into PDAX with its own
credentials and caches tokens, so the frontend never sees them. Endpoints
mirror the PDAX domains: trade, funding, withdrawals, transactions, balances,
and webhooks. PdaxError is translated to an HTTPException preserving the
upstream status + message.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from ..config import settings
from ..pdax import (
    balances as pb,
    funding as pf,
    trade as pt,
    transactions as ptx,
    webhooks as pw,
    withdrawals as pwd,
)
from ..pdax import base_url, get_pdax_client
from ..pdax.errors import PdaxError
from ..pdax.models.common import Side
from ..pdax.models.funding import FiatDepositRequest
from ..pdax.models.trade import (
    FirmQuoteRequest,
    FirmQuoteV2Request,
    IndicativePriceParams,
    IndicativePriceV2Params,
    OrderRequest,
)
from ..pdax.models.webhooks import WebhookRegisterRequest
from ..pdax.models.withdrawals import CryptoOutRequest, FiatWithdrawRequest

router = APIRouter(prefix="/pdax", tags=["pdax"])


def _fail(e: PdaxError) -> HTTPException:
    status = e.http_status if e.http_status and 400 <= e.http_status < 600 else 502
    return HTTPException(status, detail=str(e))


@router.get("/environment")
async def environment() -> dict:
    """Report the active PDAX environment + base URL (no secrets)."""
    return {
        "environment": settings.pdax_environment,
        "base_url": base_url(),
        "configured": bool(settings.pdax_username and settings.pdax_password),
    }
