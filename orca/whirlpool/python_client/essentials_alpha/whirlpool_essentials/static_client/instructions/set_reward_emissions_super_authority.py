from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class SetRewardEmissionsSuperAuthorityAccounts(typing.TypedDict):
    whirlpools_config: PublicKey
    reward_emissions_super_authority: PublicKey
    new_reward_emissions_super_authority: PublicKey


def set_reward_emissions_super_authority(
    accounts: SetRewardEmissionsSuperAuthorityAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["whirlpools_config"], is_signer=False, is_writable=True
        ),
        AccountMeta(
            pubkey=accounts["reward_emissions_super_authority"],
            is_signer=True,
            is_writable=False,
        ),
        AccountMeta(
            pubkey=accounts["new_reward_emissions_super_authority"],
            is_signer=False,
            is_writable=False,
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\xcf\x05\xc8\xd1z8R\xb7"
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
