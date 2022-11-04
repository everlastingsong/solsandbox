# https://github.com/orca-so/whirlpools/blob/main/sdk/src/quotes/public/increase-liquidity-quote.ts

import dataclasses
from solana.publickey import PublicKey
from ..types import Percentage
from ..invariant import invariant
from ..tickutil import TickUtil
from ..liquiditymath import LiquidityMath
from ..positionutil import PositionUtil, PositionStatus
from ..pricemath import PriceMath


@dataclasses.dataclass(frozen=True)
class IncreaseLiquidityQuoteParams:
    input_token_amount: int
    input_token_mint: PublicKey
    token_mint_a: PublicKey
    token_mint_b: PublicKey
    tick_current_index: int
    sqrt_price: int
    tick_lower_index: int
    tick_upper_index: int
    slippage_tolerance: Percentage


@dataclasses.dataclass(frozen=True)
class IncreaseLiquidityQuote:
    liquidity: int
    token_est_a: int
    token_est_b: int
    token_max_a: int
    token_max_b: int


def increase_liquidity_quote_by_input_token_with_params(
    params: IncreaseLiquidityQuoteParams
) -> IncreaseLiquidityQuote:
    invariant(TickUtil.is_tick_index_in_bounds(params.tick_lower_index), "tick_lower_index is out of bounds")
    invariant(TickUtil.is_tick_index_in_bounds(params.tick_upper_index), "tick_upper_index is out of bounds")
    invariant(TickUtil.is_tick_index_in_bounds(params.tick_current_index), "tick_current_index is out of bounds")
    invariant(params.tick_lower_index < params.tick_upper_index, "tick_lower_index < tick_upper_index")
    invariant(
        params.input_token_mint in [params.token_mint_a, params.token_mint_b],
        "input_token_mint does not match either token_mint_a or token_mint_b"
    )

    input_token_is_a = params.input_token_mint == params.token_mint_a
    input_token_is_b = not input_token_is_a
    position_status = PositionUtil.get_position_status(
        params.tick_current_index,
        params.tick_lower_index,
        params.tick_upper_index
    )

    if position_status == PositionStatus.PriceIsAboveRange and input_token_is_a:
        return IncreaseLiquidityQuote(0, 0, 0, 0, 0)
    if position_status == PositionStatus.PriceIsBelowRange and input_token_is_b:
        return IncreaseLiquidityQuote(0, 0, 0, 0, 0)

    lower = PriceMath.tick_index_to_sqrt_price_x64(params.tick_lower_index)
    upper = PriceMath.tick_index_to_sqrt_price_x64(params.tick_upper_index)
    current = min(max(params.sqrt_price, lower), upper)  # bounded

    liquidity = 0
    if input_token_is_a:
        liquidity = LiquidityMath.get_liquidity_from_token_a(current, upper, params.input_token_amount)
    if input_token_is_b:
        liquidity = LiquidityMath.get_liquidity_from_token_b(lower, current, params.input_token_amount)

    estimate_amount = LiquidityMath.get_token_amounts_from_liquidity(
        liquidity,
        current,
        lower,
        upper,
        True
    )

    return IncreaseLiquidityQuote(
        liquidity=liquidity,
        token_est_a=estimate_amount.token_a,
        token_est_b=estimate_amount.token_b,
        token_max_a=params.slippage_tolerance.adjust_add(estimate_amount.token_a),
        token_max_b=params.slippage_tolerance.adjust_add(estimate_amount.token_b),
    )
