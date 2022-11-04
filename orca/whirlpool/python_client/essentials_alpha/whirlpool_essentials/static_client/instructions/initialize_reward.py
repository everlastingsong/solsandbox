from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class InitializeRewardArgs(typing.TypedDict):
    reward_index: int


layout = borsh.CStruct("reward_index" / borsh.U8)


class InitializeRewardAccounts(typing.TypedDict):
    reward_authority: PublicKey
    funder: PublicKey
    whirlpool: PublicKey
    reward_mint: PublicKey
    reward_vault: PublicKey
    token_program: PublicKey
    system_program: PublicKey
    rent: PublicKey


def initialize_reward(
    args: InitializeRewardArgs,
    accounts: InitializeRewardAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["reward_authority"], is_signer=True, is_writable=False
        ),
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["reward_mint"], is_signer=False, is_writable=False),
        AccountMeta(pubkey=accounts["reward_vault"], is_signer=True, is_writable=True),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["system_program"], is_signer=False, is_writable=False
        ),
        AccountMeta(pubkey=accounts["rent"], is_signer=False, is_writable=False),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"_\x87\xc0\xc4\xf2\x81\xe6D"
    encoded_args = layout.build(
        {
            "reward_index": args["reward_index"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
