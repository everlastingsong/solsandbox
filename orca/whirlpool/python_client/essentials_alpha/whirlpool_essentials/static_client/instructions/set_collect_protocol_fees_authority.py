from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class SetCollectProtocolFeesAuthorityAccounts(typing.TypedDict):
    whirlpools_config: PublicKey
    collect_protocol_fees_authority: PublicKey
    new_collect_protocol_fees_authority: PublicKey


def set_collect_protocol_fees_authority(
    accounts: SetCollectProtocolFeesAuthorityAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["whirlpools_config"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["collect_protocol_fees_authority"],
            is_signer=True,
            is_writable=False,
        ),
        AccountMeta(
            pubkey=accounts["new_collect_protocol_fees_authority"],
            is_signer=False,
            is_writable=False,
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b'"\x96]\xf4\x8b\xe1\xe9C'
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
