from typing import List, Optional
from solana.keypair import Keypair
from solana.blockhash import Blockhash
from solana.transaction import Transaction, TransactionInstruction
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature
from .types import Instruction, TransactionPayload
from .processor import TransactionProcessor


class TransactionBuilder:
    def __init__(self, connection: AsyncClient, fee_payer: Keypair):
        self._connection = connection
        self._fee_payer = fee_payer
        self._instructions = []
        self._signers = []

    def add_instruction(self, instruction: Instruction) -> "TransactionBuilder":
        self._instructions.append(instruction)
        return self

    def add_signer(self, signer: Keypair) -> "TransactionBuilder":
        self._signers.append(signer)
        return self

    def is_empty(self) -> bool:
        return len(self._instructions) == 0

    def pack_instructions(self, merge_cleanup_instructions: bool) -> Instruction:
        instructions = []
        cleanup_instructions = []
        signers = []
        for instruction in self._instructions:
            instructions.extend(instruction.instructions)
            cleanup_instructions = instruction.cleanup_instructions + cleanup_instructions
            signers.extend(instruction.signers)

        if merge_cleanup_instructions:
            instructions.extend(cleanup_instructions)
            cleanup_instructions = []

        return Instruction(
            instructions=instructions,
            cleanup_instructions=cleanup_instructions,
            signers=signers,
        )

    async def build(self, recent_blockhash: Optional[Blockhash] = None) -> TransactionPayload:
        if recent_blockhash is None:
            latest_blockhash = (await self._connection.get_latest_blockhash()).value
            recent_blockhash = Blockhash(str(latest_blockhash.blockhash))

        transaction = Transaction(
            recent_blockhash=recent_blockhash,
            fee_payer=self._fee_payer.public_key,
        )

        packed = self.pack_instructions(True)
        transaction.add(*packed.instructions)

        return TransactionPayload(
            transaction=transaction,
            signers=packed.signers + self._signers
        )

    async def build_and_execute(self) -> Signature:
        payload = await self.build()
        processor = TransactionProcessor(self._connection, self._fee_payer)
        signed_transaction = await processor.sign_and_construct_transaction(payload)
        return await signed_transaction.execute()
