# https://github.com/orca-so/whirlpools/blob/main/sdk/src/quotes/public/decrease-liquidity-quote.ts

import dataclasses
from ..types import Percentage
from ..invariant import invariant
from ..tickutil import TickUtil
from ..liquiditymath import LiquidityMath
from ..pricemath import PriceMath


@dataclasses.dataclass(frozen=True)
class DecreaseLiquidityQuoteParams:
    liquidity: int
    tick_current_index: int
    sqrt_price: int
    tick_lower_index: int
    tick_upper_index: int
    slippage_tolerance: Percentage


@dataclasses.dataclass(frozen=True)
class DecreaseLiquidityQuote:
    liquidity: int
    token_est_a: int
    token_est_b: int
    token_min_a: int
    token_min_b: int


def decrease_liquidity_quote_by_liquidity_with_params(
    params: DecreaseLiquidityQuoteParams
) -> DecreaseLiquidityQuote:
    invariant(TickUtil.is_tick_index_in_bounds(params.tick_lower_index), "tick_lower_index is out of bounds")
    invariant(TickUtil.is_tick_index_in_bounds(params.tick_upper_index), "tick_upper_index is out of bounds")
    invariant(TickUtil.is_tick_index_in_bounds(params.tick_current_index), "tick_current_index is out of bounds")
    invariant(params.tick_lower_index < params.tick_upper_index, "tick_lower_index < tick_upper_index")

    lower = PriceMath.tick_index_to_sqrt_price_x64(params.tick_lower_index)
    upper = PriceMath.tick_index_to_sqrt_price_x64(params.tick_upper_index)
    current = min(max(params.sqrt_price, lower), upper)  # bounded

    estimate_amount = LiquidityMath.get_token_amounts_from_liquidity(
        params.liquidity,
        current,
        lower,
        upper,
        False
    )

    return DecreaseLiquidityQuote(
        liquidity=params.liquidity,
        token_est_a=estimate_amount.token_a,
        token_est_b=estimate_amount.token_b,
        token_min_a=params.slippage_tolerance.adjust_sub(estimate_amount.token_a),
        token_min_b=params.slippage_tolerance.adjust_sub(estimate_amount.token_b),
    )
