import math
from decimal import Decimal
from .types import TokenAmounts
from .invariant import invariant


class LiquidityMath:
    # https://orca-so.github.io/whirlpools/classes/PoolUtil.html#getTokenAmountsFromLiquidity
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pool-utils.ts#L84
    @staticmethod
    def get_token_amounts_from_liquidity(
        liquidity: int,
        sqrt_price_x64_current: int,
        sqrt_price_x64_lower: int,
        sqrt_price_x64_upper: int,
        round_up: bool
    ) -> TokenAmounts:
        invariant(sqrt_price_x64_lower < sqrt_price_x64_upper, "sqrt_price_x64_lower < sqrt_price_x64_upper")

        liq = Decimal(liquidity)
        lower = Decimal(sqrt_price_x64_lower)
        upper = Decimal(sqrt_price_x64_upper)
        current = min(max(Decimal(sqrt_price_x64_current), lower), upper)  # bounded

        shift_64 = Decimal(2)**64
        token_a = liq * shift_64 * (upper - current) / (current * upper)
        token_b = liq * (current - lower) / shift_64

        if round_up:
            return TokenAmounts(int(math.ceil(token_a)), int(math.ceil(token_b)))
        else:
            return TokenAmounts(int(math.floor(token_a)), int(math.floor(token_b)))

    @staticmethod
    def get_token_a_from_liquidity(
        liquidity: int,
        sqrt_price_x64_current: int,
        sqrt_price_x64_lower: int,
        sqrt_price_x64_upper: int,
        round_up: bool
    ) -> int:
        return LiquidityMath.get_token_amounts_from_liquidity(
            liquidity,
            sqrt_price_x64_current,
            sqrt_price_x64_lower,
            sqrt_price_x64_upper,
            round_up
        ).token_a

    @staticmethod
    def get_token_b_from_liquidity(
            liquidity: int,
            sqrt_price_x64_current: int,
            sqrt_price_x64_lower: int,
            sqrt_price_x64_upper: int,
            round_up: bool
    ) -> int:
        return LiquidityMath.get_token_amounts_from_liquidity(
            liquidity,
            sqrt_price_x64_current,
            sqrt_price_x64_lower,
            sqrt_price_x64_upper,
            round_up
        ).token_b

    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pool-utils.ts#L237
    @staticmethod
    def get_liquidity_from_token_a(sqrt_price_x64_0: int, sqrt_price_x64_1: int, amount: int) -> int:
        small_sqrt_price_x64 = min(sqrt_price_x64_0, sqrt_price_x64_1)
        large_sqrt_price_x64 = max(sqrt_price_x64_0, sqrt_price_x64_1)
        if small_sqrt_price_x64 == large_sqrt_price_x64:
            return 0

        # a = L/small_sqrt_price_x64/x64 - L/large_sqrt_price_x64/x64
        # a = L * x64 * ( 1/small_sqrt_price_x64 - 1/large_sqrt_price_x64 )
        # a = L * x64 * ( (large_sqrt_price_x64 - small_sqrt_price_x64) / (small_sqrt_price_x64 * large_sqrt_price_x64) )
        # L = a / x64 / ( (large_sqrt_price_x64 - small_sqrt_price_x64) / (small_sqrt_price_x64 * large_sqrt_price_x64) )
        # L = a * (small_sqrt_price_x64 * large_sqrt_price_x64) / (x64 * (large_sqrt_price_x64 - small_sqrt_price_x64))
        shift_64 = 2**64
        num = amount * (small_sqrt_price_x64 * large_sqrt_price_x64)
        denom = shift_64 * (large_sqrt_price_x64 - small_sqrt_price_x64)
        return num // denom

    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pool-utils.ts#L248
    @staticmethod
    def get_liquidity_from_token_b(sqrt_price_x64_0: int, sqrt_price_x64_1: int, amount: int) -> int:
        small_sqrt_price_x64 = min(sqrt_price_x64_0, sqrt_price_x64_1)
        large_sqrt_price_x64 = max(sqrt_price_x64_0, sqrt_price_x64_1)
        if small_sqrt_price_x64 == large_sqrt_price_x64:
            return 0

        # b = L*large_sqrt_price_x64/x64 - L*small_sqrt_sqrt_price_x64/x64
        # L = b / ( large_sqrt_price_x64/x64 - small_sqrt_sqrt_price_x64/x64 )
        # L = b * x64 / ( large_sqrt_price_x64 - small_sqrt_price_x64 )
        shift_64 = 2**64
        num = amount * shift_64
        denom = large_sqrt_price_x64 - small_sqrt_price_x64
        return num // denom

    # https://orca-so.github.io/whirlpools/classes/PoolUtil.html#estimateLiquidityFromTokenAmounts
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pool-utils.ts#L141
    @staticmethod
    def get_max_liquidity_from_token_amounts(
        sqrt_price_x64_current: int,
        sqrt_price_x64_lower: int,
        sqrt_price_x64_upper: int,
        amounts: TokenAmounts
    ) -> int:
        invariant(sqrt_price_x64_lower < sqrt_price_x64_upper, "sqrt_price_x64_lower < sqrt_price_x64_upper")

        if sqrt_price_x64_current >= sqrt_price_x64_upper:
            return LiquidityMath.get_liquidity_from_token_b(sqrt_price_x64_lower, sqrt_price_x64_upper, amounts.token_b)
        elif sqrt_price_x64_current <= sqrt_price_x64_lower:
            return LiquidityMath.get_liquidity_from_token_a(sqrt_price_x64_lower, sqrt_price_x64_upper, amounts.token_a)
        else:
            liquidity_a = LiquidityMath.get_liquidity_from_token_a(sqrt_price_x64_current, sqrt_price_x64_upper, amounts.token_a)
            liquidity_b = LiquidityMath.get_liquidity_from_token_b(sqrt_price_x64_lower, sqrt_price_x64_current, amounts.token_b)
            return min(liquidity_a, liquidity_b)
