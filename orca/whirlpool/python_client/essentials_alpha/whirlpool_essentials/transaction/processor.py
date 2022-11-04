from typing import List, Optional
from solders.signature import Signature
from solana.rpc.commitment import Commitment, Confirmed
from solana.keypair import Keypair
from solana.blockhash import Blockhash
from solana.transaction import Transaction, TransactionInstruction
from solana.rpc.async_api import AsyncClient
from .types import Instruction, TransactionPayload


CONFIRM_TRANSACTION_CHECK_INTERVAL_SECOND = 2


class TransactionProcessor:
    def __init__(self, connection: AsyncClient, fee_payer: Keypair, commitment: Commitment = Confirmed):
        self._connection = connection
        self._fee_payer = fee_payer
        self._commitment = commitment

    async def sign_and_construct_transaction(self, transaction_payload: TransactionPayload) -> "SignedTransaction":
        signed_transaction = await self.sign_transaction(transaction_payload)
        return signed_transaction

    async def sign_transaction(self, transaction_payload: TransactionPayload) -> "SignedTransaction":
        latest_blockhash = (await self._connection.get_latest_blockhash()).value
        transaction = transaction_payload.transaction
        signers = [self._fee_payer] + transaction_payload.signers

        transaction.fee_payer = self._fee_payer.public_key
        transaction.recent_blockhash = Blockhash(str(latest_blockhash.blockhash))
        transaction.sign(*signers)

        return SignedTransaction(self, transaction, latest_blockhash.last_valid_block_height)

    async def send_transaction(self, signed_transaction: "SignedTransaction") -> Signature:
        serialized = signed_transaction.transaction.serialize()
        signature = (await self._connection.send_raw_transaction(serialized)).value
        await self._connection.confirm_transaction(
            signature,
            commitment=Confirmed,
            sleep_seconds=CONFIRM_TRANSACTION_CHECK_INTERVAL_SECOND,
            last_valid_block_height=signed_transaction.last_valid_block_height
        )
        return signature


class SignedTransaction:
    def __init__(self, processor: TransactionProcessor, transaction: Transaction, last_valid_block_height: int):
        self._processor = processor
        self.transaction = transaction
        self.last_valid_block_height = last_valid_block_height

    async def execute(self) -> Signature:
        return await self._processor.send_transaction(self)
