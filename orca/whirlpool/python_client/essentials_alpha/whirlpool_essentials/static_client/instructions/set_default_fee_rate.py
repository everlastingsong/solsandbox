from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class SetDefaultFeeRateArgs(typing.TypedDict):
    default_fee_rate: int


layout = borsh.CStruct("default_fee_rate" / borsh.U16)


class SetDefaultFeeRateAccounts(typing.TypedDict):
    whirlpools_config: PublicKey
    fee_tier: PublicKey
    fee_authority: PublicKey


def set_default_fee_rate(
    args: SetDefaultFeeRateArgs,
    accounts: SetDefaultFeeRateAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["whirlpools_config"], is_signer=False, is_writable=False
        ),
        AccountMeta(pubkey=accounts["fee_tier"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["fee_authority"], is_signer=True, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"v\xd7\xd6\x9d\xb6\xe5\xd0\xe4"
    encoded_args = layout.build(
        {
            "default_fee_rate": args["default_fee_rate"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
