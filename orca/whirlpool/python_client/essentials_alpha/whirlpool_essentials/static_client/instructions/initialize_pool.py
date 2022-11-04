from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
import borsh_construct as borsh
from .. import types
from ..program_id import PROGRAM_ID


class InitializePoolArgs(typing.TypedDict):
    bumps: types.whirlpool_bumps.WhirlpoolBumps
    tick_spacing: int
    initial_sqrt_price: int


layout = borsh.CStruct(
    "bumps" / types.whirlpool_bumps.WhirlpoolBumps.layout,
    "tick_spacing" / borsh.U16,
    "initial_sqrt_price" / borsh.U128,
)


class InitializePoolAccounts(typing.TypedDict):
    whirlpools_config: PublicKey
    token_mint_a: PublicKey
    token_mint_b: PublicKey
    funder: PublicKey
    whirlpool: PublicKey
    token_vault_a: PublicKey
    token_vault_b: PublicKey
    fee_tier: PublicKey
    token_program: PublicKey
    system_program: PublicKey
    rent: PublicKey


def initialize_pool(
    args: InitializePoolArgs,
    accounts: InitializePoolAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(
            pubkey=accounts["whirlpools_config"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["token_mint_a"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["token_mint_b"], is_signer=False, is_writable=False
        ),
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["whirlpool"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["token_vault_a"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["token_vault_b"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["fee_tier"], is_signer=False, is_writable=False),
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
    identifier = b"_\xb4\n\xacT\xae\xe8("
    encoded_args = layout.build(
        {
            "bumps": args["bumps"].to_encodable(),
            "tick_spacing": args["tick_spacing"],
            "initial_sqrt_price": args["initial_sqrt_price"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
