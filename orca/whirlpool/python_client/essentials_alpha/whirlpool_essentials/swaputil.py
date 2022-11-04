from typing import List, NamedTuple
from solana.publickey import PublicKey
from .constants import U64_MAX, MIN_SQRT_PRICE, MAX_SQRT_PRICE, MAX_SWAP_TICK_ARRAYS
from .tickutil import TickUtil
from .pdautil import PDAUtil


class SwapUtil:
    # https://orca-so.github.io/whirlpools/classes/SwapUtils.html#getTickArrayPublicKeys
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/swap-utils.ts#L75
    @staticmethod
    def get_tick_array_pubkeys(
        tick_current_index: int,
        tick_spacing: int,
        a_to_b: bool,
        program_id: PublicKey,
        whirlpool_pubkey: PublicKey,
    ) -> List[PublicKey]:
        offset = 0
        pubkeys = []
        for i in range(MAX_SWAP_TICK_ARRAYS):
            start_tick_index = TickUtil.get_start_tick_index(tick_current_index, tick_spacing, offset)
            tick_array_pubkey = PDAUtil.get_tick_array(program_id, whirlpool_pubkey, start_tick_index).pubkey
            pubkeys.append(tick_array_pubkey)
            offset = (offset - 1) if a_to_b else (offset + 1)
        return pubkeys

    # https://orca-so.github.io/whirlpools/classes/SwapUtils.html#getDefaultSqrtPriceLimit
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/swap-utils.ts#L28
    @staticmethod
    def get_default_sqrt_price_limit(a_to_b: bool) -> int:
        return MIN_SQRT_PRICE if a_to_b else MAX_SQRT_PRICE

    # https://orca-so.github.io/whirlpools/classes/SwapUtils.html#getDefaultOtherAmountThreshold
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/swap-utils.ts#L37
    @staticmethod
    def get_default_other_amount_threshold(amount_specified_is_input: bool) -> int:
        return 0 if amount_specified_is_input else U64_MAX
