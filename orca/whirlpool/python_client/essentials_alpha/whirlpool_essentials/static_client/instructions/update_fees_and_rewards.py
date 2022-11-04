from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class UpdateFeesAndRewardsAccounts(typing.TypedDict):
    whirlpool: PublicKey
    position: PublicKey
    tick_array_lower: PublicKey
    tick_array_upper: PublicKey


def update_fees_and_rewards(
    accounts: UpdateFeesAndRewardsAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["position"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["tick_array_lower"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["tick_array_upper"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\x9a\xe6\xfa\r\xec\xd1K\xdf"
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
