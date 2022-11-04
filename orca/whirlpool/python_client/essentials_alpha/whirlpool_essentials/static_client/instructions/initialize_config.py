from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from anchorpy.borsh_extension import BorshPubkey
import borsh_construct as borsh
from ..program_id import PROGRAM_ID


class InitializeConfigArgs(typing.TypedDict):
    fee_authority: PublicKey
    collect_protocol_fees_authority: PublicKey
    reward_emissions_super_authority: PublicKey
    default_protocol_fee_rate: int


layout = borsh.CStruct(
    "fee_authority" / BorshPubkey,
    "collect_protocol_fees_authority" / BorshPubkey,
    "reward_emissions_super_authority" / BorshPubkey,
    "default_protocol_fee_rate" / borsh.U16,
)


class InitializeConfigAccounts(typing.TypedDict):
    config: PublicKey
    funder: PublicKey
    system_program: PublicKey


def initialize_config(
    args: InitializeConfigArgs,
    accounts: InitializeConfigAccounts,
    program_id: PublicKey = PROGRAM_ID,
    remaining_accounts: typing.Optional[typing.List[AccountMeta]] = None,
) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["config"], is_signer=True, is_writable=True),
        AccountMeta(pubkey=accounts["funder"], is_signer=True, is_writable=True),
        AccountMeta(
            pubkey=accounts["system_program"], is_signer=False, is_writable=False
        ),
    ]
    if remaining_accounts is not None:
        keys += remaining_accounts
    identifier = b"\xd0\x7f\x15\x01\xc2\xbe\xc4F"
    encoded_args = layout.build(
        {
            "fee_authority": args["fee_authority"],
            "collect_protocol_fees_authority": args["collect_protocol_fees_authority"],
            "reward_emissions_super_authority": args[
                "reward_emissions_super_authority"
            ],
            "default_protocol_fee_rate": args["default_protocol_fee_rate"],
        }
    )
    data = identifier + encoded_args
    return TransactionInstruction(keys, program_id, data)
