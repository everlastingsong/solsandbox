from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class SetRewardEmissionsArgs(typing.TypedDict):
    reward_index: int
    emissions_per_second_x64: int


layout = borsh.CStruct(
    "reward_index" / borsh.U8, "emissions_per_second_x64" / borsh.U128
)


class SetRewardEmissionsAccounts(typing.TypedDict):
    whirlpool: PublicKey
    reward_authority: PublicKey
    reward_vault: PublicKey


def set_reward_emissions(
    args: SetRewardEmissionsArgs,
    accounts: SetRewardEmissionsAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["reward_authority"], is_signer=True, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["reward_vault"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\r\xc5V\xa8m\xb0\x1b\xf4"
    encoded_args = layout.build(
        {
            "reward_index": args["reward_index"],
            "emissions_per_second_x64": args["emissions_per_second_x64"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
