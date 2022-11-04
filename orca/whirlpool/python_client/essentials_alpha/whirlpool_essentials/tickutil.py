import math
from .constants import TICK_ARRAY_SIZE, MIN_TICK_INDEX, MAX_TICK_INDEX
from .invariant import invariant


def div_floor(a: int, b: int) -> int:
    return math.floor(a / b)


class TickUtil:
    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#getStartTickIndex
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/tick-utils.ts#L33
    @staticmethod
    def get_start_tick_index(tick_index: int, tick_spacing: int, offset: int = 0) -> int:
        ticks_in_array = TICK_ARRAY_SIZE * tick_spacing
        real_index = div_floor(tick_index, ticks_in_array)
        start_tick_index = (real_index + offset) * ticks_in_array

        invariant(MIN_TICK_INDEX < start_tick_index + ticks_in_array, "too small start_tick_index")
        invariant(start_tick_index <= MAX_TICK_INDEX, "too large start_tick_index")
        return start_tick_index

    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#getInitializableTickIndex
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/tick-utils.ts#L49
    @staticmethod
    def get_initializable_tick_index(tick_index: int, tick_spacing: int) -> int:
        # Note: javascript: -5 % 3 = -2, python: -5 % 3 = 1
        initializable_tick_index_abs = abs(tick_index) - abs(tick_index) % tick_spacing
        if tick_index >= 0:
            return initializable_tick_index_abs
        else:
            return -1 * initializable_tick_index_abs

    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#isTickInitializable
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/tick-utils.ts#L142
    @staticmethod
    def is_initializable_tick_index(tick_index: int, tick_spacing: int) -> bool:
        return tick_index % tick_spacing == 0

    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#checkTickInBounds
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/tick-utils.ts#L138
    @staticmethod
    def is_tick_index_in_bounds(tick_index: int) -> bool:
        return MIN_TICK_INDEX <= tick_index <= MAX_TICK_INDEX
