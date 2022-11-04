from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class ClosePositionAccounts(typing.TypedDict):
    position_authority: PublicKey
    receiver: PublicKey
    position: PublicKey
    position_mint: PublicKey
    position_token_account: PublicKey
    token_program: PublicKey


def close_position(
    accounts: ClosePositionAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["position_authority"], is_signer=True, is_writable=False
        ),
        AccountMeta(pubkey=accounts["receiver"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["position"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["position_mint"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["position_token_account"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"{\x86Q\x001Dbb"
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
