import dataclasses
from typing import List
from solana.keypair import Keypair
from solana.transaction import Transaction, TransactionInstruction


@dataclasses.dataclass(frozen=True)
class Instruction:
    instructions: List[TransactionInstruction]
    cleanup_instructions: List[TransactionInstruction]
    signers: List[Keypair]


@dataclasses.dataclass(frozen=True)
class TransactionPayload:
    transaction: Transaction
    signers: List[Keypair]


EMPTY_INSTRUCTION = Instruction([], [], [])
