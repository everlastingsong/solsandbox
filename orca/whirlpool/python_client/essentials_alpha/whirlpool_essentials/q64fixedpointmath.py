import math
from decimal import Decimal


class Q64FixedPointMath:
    @staticmethod
    def to_x64(num: Decimal) -> int:
        shift_64 = Decimal(2)**64
        return math.floor(num * shift_64)

    @staticmethod
    def from_x64(num: int) -> Decimal:
        shift_64 = Decimal(2)**64
        return Decimal(num) / shift_64
