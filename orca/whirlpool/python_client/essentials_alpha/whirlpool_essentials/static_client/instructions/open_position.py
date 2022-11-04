from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from .. import types
from ..program_id import PROGRAM_ID


class OpenPositionArgs(typing.TypedDict):
    bumps: types.open_position_bumps.OpenPositionBumps
    tick_lower_index: int
    tick_upper_index: int


layout = borsh.CStruct(
    "bumps" / types.open_position_bumps.OpenPositionBumps.layout,
    "tick_lower_index" / borsh.I32,
    "tick_upper_index" / borsh.I32,
)


class OpenPositionAccounts(typing.TypedDict):
    funder: PublicKey
    owner: PublicKey
    position: PublicKey
    position_mint: PublicKey
    position_token_account: PublicKey
    whirlpool: PublicKey
    token_program: PublicKey
    system_program: PublicKey
    rent: PublicKey
    associated_token_program: PublicKey


def open_position(
    args: OpenPositionArgs,
    accounts: OpenPositionAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["owner"], is_signer=False, is_writable=False),
        AccountMeta(pubkey=accounts["position"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["position_mint"], is_signer=True, is_writable=True),
        AccountMeta(
            pubkey=accounts["position_token_account"], is_signer=False, is_writable=True
        ),
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=False),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["system_program"], is_signer=False, is_writable=False
        ),
        AccountMeta(pubkey=accounts["rent"], is_signer=False, is_writable=False),
        AccountMeta(
            pubkey=accounts["associated_token_program"],
            is_signer=False,
            is_writable=False,
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\x87\x80/M\x0f\x98\xf01"
    encoded_args = layout.build(
        {
            "bumps": args["bumps"].to_encodable(),
            "tick_lower_index": args["tick_lower_index"],
            "tick_upper_index": args["tick_upper_index"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
