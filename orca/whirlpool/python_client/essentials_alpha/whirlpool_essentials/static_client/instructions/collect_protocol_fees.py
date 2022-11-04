from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class CollectProtocolFeesAccounts(typing.TypedDict):
    whirlpools_config: PublicKey
    whirlpool: PublicKey
    collect_protocol_fees_authority: PublicKey
    token_vault_a: PublicKey
    token_vault_b: PublicKey
    token_destination_a: PublicKey
    token_destination_b: PublicKey
    token_program: PublicKey


def collect_protocol_fees(
    accounts: CollectProtocolFeesAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["whirlpools_config"], is_signer=False, is_writable=False
        ),
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["collect_protocol_fees_authority"],
            is_signer=True,
            is_writable=False,
        ),
        AccountMeta(
            pubkey=accounts["token_vault_a"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_vault_b"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_destination_a"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_destination_b"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\x16C\x17b\x96\xb2F\xdc"
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
