from decimal import Decimal
from .constants import U64_MAX
from .invariant import invariant


class DecimalUtil:
    # https://github.com/orca-so/orca-sdks/blob/main/packages/common-sdk/src/math/decimal-util.ts
    @staticmethod
    def to_u64(num: Decimal, shift: int = 0) -> int:
        u64 = int(num * 10**shift)
        invariant(0 <= u64 <= U64_MAX, "0 <= u64 <= U64_MAX")
        return u64

    @staticmethod
    def from_u64(u64: int, shift: int = 0) -> Decimal:
        invariant(0 <= u64 <= U64_MAX, "0 <= u64 <= U64_MAX")
        return Decimal(u64) / Decimal(10**shift)

    @staticmethod
    def to_fixed(num: Decimal, decimals: int) -> Decimal:
        if decimals == 0:
            return num.quantize(Decimal("1"))
        else:
            return num.quantize(Decimal("0." + "0"*(decimals-1) + "1"))
