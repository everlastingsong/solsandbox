import dataclasses
from enum import Enum
from solana.publickey import PublicKey

from .transaction import Instruction
from .percentage import Percentage


@dataclasses.dataclass(frozen=True)
class TokenAmounts:
    token_a: int
    token_b: int


@dataclasses.dataclass(frozen=True)
class PDA:
    pubkey: PublicKey
    bump: int


@dataclasses.dataclass(frozen=True)
class PublicKeyWithInstruction:
    pubkey: PublicKey
    instruction: Instruction


class PositionStatus(str, Enum):
    PriceIsBelowRange = "Below Range"
    PriceIsAboveRange = "Above Range"
    PriceIsInRange = "In Range"
