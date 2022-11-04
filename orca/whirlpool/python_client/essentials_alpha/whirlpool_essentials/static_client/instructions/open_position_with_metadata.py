from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from .. import types
from ..program_id import PROGRAM_ID


class OpenPositionWithMetadataArgs(typing.TypedDict):
    bumps: types.open_position_with_metadata_bumps.OpenPositionWithMetadataBumps
    tick_lower_index: int
    tick_upper_index: int


layout = borsh.CStruct(
    "bumps"
    / types.open_position_with_metadata_bumps.OpenPositionWithMetadataBumps.layout,
    "tick_lower_index" / borsh.I32,
    "tick_upper_index" / borsh.I32,
)


class OpenPositionWithMetadataAccounts(typing.TypedDict):
    funder: PublicKey
    owner: PublicKey
    position: PublicKey
    position_mint: PublicKey
    position_metadata_account: PublicKey
    position_token_account: PublicKey
    whirlpool: PublicKey
    token_program: PublicKey
    system_program: PublicKey
    rent: PublicKey
    associated_token_program: PublicKey
    metadata_program: PublicKey
    metadata_update_auth: PublicKey


def open_position_with_metadata(
    args: OpenPositionWithMetadataArgs,
    accounts: OpenPositionWithMetadataAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["owner"], is_signer=False, is_writable=False),
        AccountMeta(pubkey=accounts["position"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["position_mint"], is_signer=True, is_writable=True),
        AccountMeta(
            pubkey=accounts["position_metadata_account"],
            is_signer=False,
            is_writable=True,
        ),
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
        AccountMeta(
            pubkey=accounts["metadata_program"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["metadata_update_auth"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\xf2\x1d\x860:n\x0e<"
    encoded_args = layout.build(
        {
            "bumps": args["bumps"].to_encodable(),
            "tick_lower_index": args["tick_lower_index"],
            "tick_upper_index": args["tick_upper_index"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
