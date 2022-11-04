from decimal import Decimal
from fractions import Fraction
from .constants import U64_MAX
from .invariant import invariant


class Percentage:
    def __init__(self, numerator: int, denominator: int):
        invariant(0 <= numerator <= U64_MAX, "0 <= numerator <= U64_MAX")
        invariant(0 <= denominator <= U64_MAX, "0 <= denominator <= U64_MAX")
        self.numerator = numerator
        self.denominator = denominator

    def __str__(self):
        return "{}/{}".format(self.numerator, self.denominator)

    def to_decimal(self) -> Decimal:
        if self.denominator == 0:
            return Decimal(0)
        return Decimal(self.numerator) / Decimal(self.denominator)

    def adjust_add(self, num: int) -> int:
        return num * (self.numerator + self.denominator) // self.denominator

    def adjust_sub(self, num: int) -> int:
        return num * (self.denominator - self.numerator) // self.denominator

    @staticmethod
    def from_fraction(numerator: int, denominator: int) -> "Percentage":
        return Percentage(numerator, denominator)

    @staticmethod
    def from_percentage(percentage: str) -> "Percentage":
        d = Decimal(percentage)
        invariant(d == 0 or Decimal("0.0001") <= d <= Decimal("100"))

        f = Fraction(int(d * 10000), 100*10000)
        return Percentage(f.numerator, f.denominator)
