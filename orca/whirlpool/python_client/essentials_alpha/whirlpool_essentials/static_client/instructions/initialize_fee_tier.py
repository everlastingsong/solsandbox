from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class InitializeFeeTierArgs(typing.TypedDict):
    tick_spacing: int
    default_fee_rate: int


layout = borsh.CStruct("tick_spacing" / borsh.U16, "default_fee_rate" / borsh.U16)


class InitializeFeeTierAccounts(typing.TypedDict):
    config: PublicKey
    fee_tier: PublicKey
    funder: PublicKey
    fee_authority: PublicKey
    system_program: PublicKey


def initialize_fee_tier(
    args: InitializeFeeTierArgs,
    accounts: InitializeFeeTierAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["config"], is_signer=False, is_writable=False),
        AccountMeta(pubkey=accounts["fee_tier"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(
            pubkey=accounts["fee_authority"], is_signer=True, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["system_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\xb7J\x9c\xa0p\x02*\x1e"
    encoded_args = layout.build(
        {
            "tick_spacing": args["tick_spacing"],
            "default_fee_rate": args["default_fee_rate"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
