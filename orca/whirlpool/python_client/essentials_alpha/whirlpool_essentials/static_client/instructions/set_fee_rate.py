from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class SetFeeRateArgs(typing.TypedDict):
    fee_rate: int


layout = borsh.CStruct("fee_rate" / borsh.U16)


class SetFeeRateAccounts(typing.TypedDict):
    whirlpools_config: PublicKey
    whirlpool: PublicKey
    fee_authority: PublicKey


def set_fee_rate(
    args: SetFeeRateArgs,
    accounts: SetFeeRateAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["whirlpools_config"], is_signer=False, is_writable=False
        ),
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["fee_authority"], is_signer=True, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"5\xf3\x89A\x08\x8c\x9e\x06"
    encoded_args = layout.build(
        {
            "fee_rate": args["fee_rate"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
