from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class InitializeTickArrayArgs(typing.TypedDict):
    start_tick_index: int


layout = borsh.CStruct("start_tick_index" / borsh.I32)


class InitializeTickArrayAccounts(typing.TypedDict):
    whirlpool: PublicKey
    funder: PublicKey
    tick_array: PublicKey
    system_program: PublicKey


def initialize_tick_array(
    args: InitializeTickArrayArgs,
    accounts: InitializeTickArrayAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=False),
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["tick_array"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["system_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\x0b\xbc\xc1\xd6\x8d[\x95\xb8"
    encoded_args = layout.build(
        {
            "start_tick_index": args["start_tick_index"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
