from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class CollectRewardArgs(typing.TypedDict):
    reward_index: int


layout = borsh.CStruct("reward_index" / borsh.U8)


class CollectRewardAccounts(typing.TypedDict):
    whirlpool: PublicKey
    position_authority: PublicKey
    position: PublicKey
    position_token_account: PublicKey
    reward_owner_account: PublicKey
    reward_vault: PublicKey
    token_program: PublicKey


def collect_reward(
    args: CollectRewardArgs,
    accounts: CollectRewardAccounts,
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
            pubkey=accounts["reward_owner_account"], is_signer=False, is_writable=True
        ),
        AccountMeta(pubkey=accounts["reward_vault"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b'F\x05\x84WV\xeb\xb1"'
    encoded_args = layout.build(
        {
            "reward_index": args["reward_index"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
