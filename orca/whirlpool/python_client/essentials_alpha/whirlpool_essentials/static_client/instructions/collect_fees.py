from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class CollectFeesAccounts(typing.TypedDict):
    whirlpool: PublicKey
    position_authority: PublicKey
    position: PublicKey
    position_token_account: PublicKey
    token_owner_account_a: PublicKey
    token_vault_a: PublicKey
    token_owner_account_b: PublicKey
    token_vault_b: PublicKey
    token_program: PublicKey


def collect_fees(
    accounts: CollectFeesAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=False),
        AccountMeta(
            pubkey=accounts["position_authority"], is_signer=True, is_writable=False
        ),
        AccountMeta(pubkey=accounts["position"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["position_token_account"],
            is_signer=False,
            is_writable=False,
        ),
        AccountMeta(
            pubkey=accounts["token_owner_account_a"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_vault_a"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_owner_account_b"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_vault_b"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\xa4\x98\xcfc\x1e\xba\x13\xb6"
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
