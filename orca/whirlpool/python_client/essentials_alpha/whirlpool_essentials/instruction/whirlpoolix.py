import dataclasses
from typing import List

from solana.transaction import TransactionInstruction
from solana.publickey import PublicKey
from solana.keypair import Keypair
from solana.sysvar import SYSVAR_RENT_PUBKEY
from solana.system_program import SYS_PROGRAM_ID
from spl.token.constants import TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
from ..static_client import instructions
from ..static_client import types
from ..constants import METAPLEX_METADATA_PROGRAM_ID, ORCA_WHIRLPOOL_NFT_UPDATE_AUTHORITY
from ..types import PDA
from ..transaction import Instruction


def to_instruction(
    instructions: List[TransactionInstruction],
    cleanup_instructions: List[TransactionInstruction] = None,
    signers: List[Keypair] = None
) -> Instruction:
    cleanup_instructions = [] if cleanup_instructions is None else cleanup_instructions
    signers = [] if signers is None else signers
    return Instruction(
        instructions=instructions,
        cleanup_instructions=cleanup_instructions,
        signers=signers,
    )


@dataclasses.dataclass(frozen=True)
class SwapParams:
    amount: int
    other_amount_threshold: int
    sqrt_price_limit: int
    amount_specified_is_input: bool
    a_to_b: bool
    token_authority: PublicKey
    whirlpool: PublicKey
    token_owner_account_a: PublicKey
    token_vault_a: PublicKey
    token_owner_account_b: PublicKey
    token_vault_b: PublicKey
    tick_array_0: PublicKey
    tick_array_1: PublicKey
    tick_array_2: PublicKey
    oracle: PublicKey


@dataclasses.dataclass(frozen=True)
class OpenPositionParams:
    tick_lower_index: int
    tick_upper_index: int
    position_pda: PDA
    funder: PublicKey
    owner: PublicKey
    position_mint: PublicKey
    position_token_account: PublicKey
    whirlpool: PublicKey


@dataclasses.dataclass(frozen=True)
class OpenPositionWithMetadataParams:
    tick_lower_index: int
    tick_upper_index: int
    position_pda: PDA
    metadata_pda: PDA
    funder: PublicKey
    owner: PublicKey
    position_mint: PublicKey
    position_token_account: PublicKey
    whirlpool: PublicKey


@dataclasses.dataclass(frozen=True)
class IncreaseLiquidityParams:
    liquidity_amount: int
    token_max_a: int
    token_max_b: int
    whirlpool: PublicKey
    position_authority: PublicKey
    position: PublicKey
    position_token_account: PublicKey
    token_owner_account_a: PublicKey
    token_owner_account_b: PublicKey
    token_vault_a: PublicKey
    token_vault_b: PublicKey
    tick_array_lower: PublicKey
    tick_array_upper: PublicKey


@dataclasses.dataclass(frozen=True)
class DecreaseLiquidityParams:
    liquidity_amount: int
    token_min_a: int
    token_min_b: int
    whirlpool: PublicKey
    position_authority: PublicKey
    position: PublicKey
    position_token_account: PublicKey
    token_owner_account_a: PublicKey
    token_owner_account_b: PublicKey
    token_vault_a: PublicKey
    token_vault_b: PublicKey
    tick_array_lower: PublicKey
    tick_array_upper: PublicKey


@dataclasses.dataclass(frozen=True)
class UpdateFeesAndRewardsParams:
    whirlpool: PublicKey
    position: PublicKey
    tick_array_lower: PublicKey
    tick_array_upper: PublicKey


@dataclasses.dataclass(frozen=True)
class CollectFeesParams:
    whirlpool: PublicKey
    position_authority: PublicKey
    position: PublicKey
    position_token_account: PublicKey
    token_owner_account_a: PublicKey
    token_vault_a: PublicKey
    token_owner_account_b: PublicKey
    token_vault_b: PublicKey


@dataclasses.dataclass(frozen=True)
class CollectRewardParams:
    reward_index: int
    whirlpool: PublicKey
    position_authority: PublicKey
    position: PublicKey
    position_token_account: PublicKey
    reward_owner_account: PublicKey
    reward_vault: PublicKey


@dataclasses.dataclass(frozen=True)
class ClosePositionParams:
    position_authority: PublicKey
    receiver: PublicKey
    position: PublicKey
    position_mint: PublicKey
    position_token_account: PublicKey


@dataclasses.dataclass(frozen=True)
class InitializeTickArrayParams:
    start_tick_index: int
    whirlpool: PublicKey
    funder: PublicKey
    tick_array: PublicKey


@dataclasses.dataclass(frozen=True)
class InitializeConfigParams:
    default_protocol_fee_rate: int
    fee_authority: PublicKey
    collect_protocol_fees_authority: PublicKey
    reward_emissions_super_authority: PublicKey
    config: PublicKey
    funder: PublicKey


@dataclasses.dataclass(frozen=True)
class InitializeFeeTierParams:
    tick_spacing: int
    default_fee_rate: int
    config: PublicKey
    fee_tier: PublicKey
    funder: PublicKey
    fee_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class InitializePoolParams:
    tick_spacing: int
    initial_sqrt_price: int
    whirlpool_pda: PDA
    whirlpools_config: PublicKey
    token_mint_a: PublicKey
    token_mint_b: PublicKey
    funder: PublicKey
    token_vault_a: PublicKey
    token_vault_b: PublicKey
    fee_tier: PublicKey


@dataclasses.dataclass(frozen=True)
class InitializeRewardParams:
    reward_index: int
    reward_authority: PublicKey
    funder: PublicKey
    whirlpool: PublicKey
    reward_mint: PublicKey
    reward_vault: PublicKey


@dataclasses.dataclass(frozen=True)
class CollectProtocolFeesParams:
    whirlpools_config: PublicKey
    whirlpool: PublicKey
    collect_protocol_fees_authority: PublicKey
    token_vault_a: PublicKey
    token_vault_b: PublicKey
    token_destination_a: PublicKey
    token_destination_b: PublicKey


@dataclasses.dataclass(frozen=True)
class SetCollectProtocolFeesAuthorityParams:
    whirlpools_config: PublicKey
    collect_protocol_fees_authority: PublicKey
    new_collect_protocol_fees_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetDefaultFeeRateParams:
    default_fee_rate: int
    whirlpools_config: PublicKey
    fee_tier: PublicKey
    fee_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetDefaultProtocolFeeRateParams:
    default_protocol_fee_rate: int
    whirlpools_config: PublicKey
    fee_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetFeeAuthorityParams:
    whirlpools_config: PublicKey
    fee_authority: PublicKey
    new_fee_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetFeeRateParams:
    fee_rate: int
    whirlpools_config: PublicKey
    whirlpool: PublicKey
    fee_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetProtocolFeeRateParams:
    protocol_fee_rate: int
    whirlpools_config: PublicKey
    whirlpool: PublicKey
    fee_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetRewardAuthorityParams:
    reward_index: int
    whirlpool: PublicKey
    reward_authority: PublicKey
    new_reward_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetRewardAuthorityBySuperAuthorityParams:
    reward_index: int
    whirlpools_config: PublicKey
    whirlpool: PublicKey
    reward_emissions_super_authority: PublicKey
    new_reward_authority: PublicKey


@dataclasses.dataclass(frozen=True)
class SetRewardEmissionsParams:
    reward_index: int
    emissions_per_second_x64: int
    whirlpool: PublicKey
    reward_authority: PublicKey
    reward_vault: PublicKey


@dataclasses.dataclass(frozen=True)
class SetRewardEmissionsSuperAuthorityParams:
    whirlpools_config: PublicKey
    reward_emissions_super_authority: PublicKey
    new_reward_emissions_super_authority: PublicKey


class WhirlpoolIx:
    @staticmethod
    def swap(program_id: PublicKey, params: SwapParams):
        ix = instructions.swap(
            instructions.SwapArgs(
                amount=params.amount,
                other_amount_threshold=params.other_amount_threshold,
                sqrt_price_limit=params.sqrt_price_limit,
                amount_specified_is_input=params.amount_specified_is_input,
                a_to_b=params.a_to_b,
            ),
            instructions.SwapAccounts(
                token_program=TOKEN_PROGRAM_ID,
                token_authority=params.token_authority,
                whirlpool=params.whirlpool,
                token_owner_account_a=params.token_owner_account_a,
                token_vault_a=params.token_vault_a,
                token_owner_account_b=params.token_owner_account_b,
                token_vault_b=params.token_vault_b,
                tick_array0=params.tick_array_0,
                tick_array1=params.tick_array_1,
                tick_array2=params.tick_array_2,
                oracle=params.oracle,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def open_position(program_id: PublicKey, params: OpenPositionParams):
        ix = instructions.open_position(
            instructions.OpenPositionArgs(
                tick_lower_index=params.tick_lower_index,
                tick_upper_index=params.tick_upper_index,
                bumps=types.open_position_bumps.OpenPositionBumps(params.position_pda.bump),
            ),
            instructions.OpenPositionAccounts(
                funder=params.funder,
                owner=params.owner,
                position=params.position_pda.pubkey,
                position_mint=params.position_mint,
                position_token_account=params.position_token_account,
                whirlpool=params.whirlpool,
                token_program=TOKEN_PROGRAM_ID,
                system_program=SYS_PROGRAM_ID,
                rent=SYSVAR_RENT_PUBKEY,
                associated_token_program=ASSOCIATED_TOKEN_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def open_position_with_metadata(program_id: PublicKey, params: OpenPositionWithMetadataParams):
        ix = instructions.open_position_with_metadata(
            instructions.OpenPositionWithMetadataArgs(
                tick_lower_index=params.tick_lower_index,
                tick_upper_index=params.tick_upper_index,
                bumps=types.open_position_with_metadata_bumps.OpenPositionWithMetadataBumps(
                    position_bump=params.position_pda.bump,
                    metadata_bump=params.metadata_pda.bump,
                ),
            ),
            instructions.OpenPositionWithMetadataAccounts(
                funder=params.funder,
                owner=params.owner,
                position=params.position_pda.pubkey,
                position_mint=params.position_mint,
                position_metadata_account=params.metadata_pda.pubkey,
                position_token_account=params.position_token_account,
                whirlpool=params.whirlpool,
                token_program=TOKEN_PROGRAM_ID,
                system_program=SYS_PROGRAM_ID,
                rent=SYSVAR_RENT_PUBKEY,
                associated_token_program=ASSOCIATED_TOKEN_PROGRAM_ID,
                metadata_program=METAPLEX_METADATA_PROGRAM_ID,
                metadata_update_auth=ORCA_WHIRLPOOL_NFT_UPDATE_AUTHORITY,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def increase_liquidity(program_id: PublicKey, params: IncreaseLiquidityParams):
        ix = instructions.increase_liquidity(
            instructions.IncreaseLiquidityArgs(
                liquidity_amount=params.liquidity_amount,
                token_max_a=params.token_max_a,
                token_max_b=params.token_max_b,
            ),
            instructions.IncreaseLiquidityAccounts(
                whirlpool=params.whirlpool,
                token_program=TOKEN_PROGRAM_ID,
                position_authority=params.position_authority,
                position=params.position,
                position_token_account=params.position_token_account,
                token_owner_account_a=params.token_owner_account_a,
                token_owner_account_b=params.token_owner_account_b,
                token_vault_a=params.token_vault_a,
                token_vault_b=params.token_vault_b,
                tick_array_lower=params.tick_array_lower,
                tick_array_upper=params.tick_array_upper,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def decrease_liquidity(program_id: PublicKey, params: DecreaseLiquidityParams):
        ix = instructions.decrease_liquidity(
            instructions.DecreaseLiquidityArgs(
                liquidity_amount=params.liquidity_amount,
                token_min_a=params.token_min_a,
                token_min_b=params.token_min_b,
            ),
            instructions.DecreaseLiquidityAccounts(
                whirlpool=params.whirlpool,
                token_program=TOKEN_PROGRAM_ID,
                position_authority=params.position_authority,
                position=params.position,
                position_token_account=params.position_token_account,
                token_owner_account_a=params.token_owner_account_a,
                token_owner_account_b=params.token_owner_account_b,
                token_vault_a=params.token_vault_a,
                token_vault_b=params.token_vault_b,
                tick_array_lower=params.tick_array_lower,
                tick_array_upper=params.tick_array_upper,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def update_fees_and_rewards(program_id: PublicKey, params: UpdateFeesAndRewardsParams):
        ix = instructions.update_fees_and_rewards(
            instructions.UpdateFeesAndRewardsAccounts(
                whirlpool=params.whirlpool,
                position=params.position,
                tick_array_lower=params.tick_array_lower,
                tick_array_upper=params.tick_array_upper,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def collect_fees(program_id: PublicKey, params: CollectFeesParams):
        ix = instructions.collect_fees(
            instructions.CollectFeesAccounts(
                whirlpool=params.whirlpool,
                position_authority=params.position_authority,
                position=params.position,
                position_token_account=params.position_token_account,
                token_owner_account_a=params.token_owner_account_a,
                token_vault_a=params.token_vault_a,
                token_owner_account_b=params.token_owner_account_b,
                token_vault_b=params.token_vault_b,
                token_program=TOKEN_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def collect_reward(program_id: PublicKey, params: CollectRewardParams):
        ix = instructions.collect_reward(
            instructions.CollectRewardArgs(
                reward_index=params.reward_index,
            ),
            instructions.CollectRewardAccounts(
                whirlpool=params.whirlpool,
                position_authority=params.position_authority,
                position=params.position,
                position_token_account=params.position_token_account,
                reward_owner_account=params.reward_owner_account,
                reward_vault=params.reward_vault,
                token_program=TOKEN_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def close_position(program_id: PublicKey, params: ClosePositionParams):
        ix = instructions.close_position(
            instructions.ClosePositionAccounts(
                position_authority=params.position_authority,
                receiver=params.receiver,
                position=params.position,
                position_mint=params.position_mint,
                position_token_account=params.position_token_account,
                token_program=TOKEN_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def initialize_tick_array(program_id: PublicKey, params: InitializeTickArrayParams):
        ix = instructions.initialize_tick_array(
            instructions.InitializeTickArrayArgs(
                start_tick_index=params.start_tick_index,
            ),
            instructions.InitializeTickArrayAccounts(
                whirlpool=params.whirlpool,
                funder=params.funder,
                tick_array=params.tick_array,
                system_program=SYS_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def initialize_config(program_id: PublicKey, params: InitializeConfigParams):
        ix = instructions.initialize_config(
            instructions.InitializeConfigArgs(
                default_protocol_fee_rate=params.default_protocol_fee_rate,
                fee_authority=params.fee_authority,
                collect_protocol_fees_authority=params.collect_protocol_fees_authority,
                reward_emissions_super_authority=params.reward_emissions_super_authority,
            ),
            instructions.InitializeConfigAccounts(
                config=params.config,
                funder=params.funder,
                system_program=SYS_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def initialize_fee_tier(program_id: PublicKey, params: InitializeFeeTierParams):
        ix = instructions.initialize_fee_tier(
            instructions.InitializeFeeTierArgs(
                tick_spacing=params.tick_spacing,
                default_fee_rate=params.default_fee_rate
            ),
            instructions.InitializeFeeTierAccounts(
                config=params.config,
                fee_tier=params.fee_tier,
                funder=params.funder,
                fee_authority=params.fee_authority,
                system_program=SYS_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def initialize_pool(program_id: PublicKey, params: InitializePoolParams):
        ix = instructions.initialize_pool(
            instructions.InitializePoolArgs(
                tick_spacing=params.tick_spacing,
                initial_sqrt_price=params.initial_sqrt_price,
                bumps=types.whirlpool_bumps.WhirlpoolBumps(params.whirlpool_pda.bump),
            ),
            instructions.InitializePoolAccounts(
                whirlpools_config=params.whirlpools_config,
                token_mint_a=params.token_mint_a,
                token_mint_b=params.token_mint_b,
                funder=params.funder,
                whirlpool=params.whirlpool_pda.pubkey,
                token_vault_a=params.token_vault_a,
                token_vault_b=params.token_vault_b,
                fee_tier=params.fee_tier,
                token_program=TOKEN_PROGRAM_ID,
                system_program=SYS_PROGRAM_ID,
                rent=SYSVAR_RENT_PUBKEY,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def initialize_reward(program_id: PublicKey, params: InitializeRewardParams):
        ix = instructions.initialize_reward(
            instructions.InitializeRewardArgs(
                reward_index=params.reward_index,
            ),
            instructions.InitializeRewardAccounts(
                reward_authority=params.reward_authority,
                funder=params.funder,
                whirlpool=params.whirlpool,
                reward_mint=params.reward_mint,
                reward_vault=params.reward_vault,
                token_program=TOKEN_PROGRAM_ID,
                system_program=SYS_PROGRAM_ID,
                rent=SYSVAR_RENT_PUBKEY,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def collect_protocol_fees(program_id: PublicKey, params: CollectProtocolFeesParams):
        ix = instructions.collect_protocol_fees(
            instructions.CollectProtocolFeesAccounts(
                whirlpools_config=params.whirlpools_config,
                whirlpool=params.whirlpool,
                collect_protocol_fees_authority=params.collect_protocol_fees_authority,
                token_vault_a=params.token_vault_a,
                token_vault_b=params.token_vault_b,
                token_destination_a=params.token_destination_a,
                token_destination_b=params.token_destination_b,
                token_program=TOKEN_PROGRAM_ID,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_collect_protocol_fees_authority(program_id: PublicKey, params: SetCollectProtocolFeesAuthorityParams):
        ix = instructions.set_collect_protocol_fees_authority(
            instructions.SetCollectProtocolFeesAuthorityAccounts(
                whirlpools_config=params.whirlpools_config,
                collect_protocol_fees_authority=params.collect_protocol_fees_authority,
                new_collect_protocol_fees_authority=params.new_collect_protocol_fees_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_default_fee_rate(program_id: PublicKey, params: SetDefaultFeeRateParams):
        ix = instructions.set_default_fee_rate(
            instructions.SetDefaultFeeRateArgs(
                default_fee_rate=params.default_fee_rate,
            ),
            instructions.SetDefaultFeeRateAccounts(
                whirlpools_config=params.whirlpools_config,
                fee_tier=params.fee_tier,
                fee_authority=params.fee_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_default_protocol_fee_rate(program_id: PublicKey, params: SetDefaultProtocolFeeRateParams):
        ix = instructions.set_default_protocol_fee_rate(
            instructions.SetDefaultProtocolFeeRateArgs(
                default_protocol_fee_rate=params.default_protocol_fee_rate,
            ),
            instructions.SetDefaultProtocolFeeRateAccounts(
                whirlpools_config=params.whirlpools_config,
                fee_authority=params.fee_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_fee_authority(program_id: PublicKey, params: SetFeeAuthorityParams):
        ix = instructions.set_fee_authority(
            instructions.SetFeeAuthorityAccounts(
                whirlpools_config=params.whirlpools_config,
                fee_authority=params.fee_authority,
                new_fee_authority=params.new_fee_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_fee_rate(program_id: PublicKey, params: SetFeeRateParams):
        ix = instructions.set_fee_rate(
            instructions.SetFeeRateArgs(
                fee_rate=params.fee_rate,
            ),
            instructions.SetFeeRateAccounts(
                whirlpools_config=params.whirlpools_config,
                whirlpool=params.whirlpool,
                fee_authority=params.fee_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_protocol_fee_rate(program_id: PublicKey, params: SetProtocolFeeRateParams):
        ix = instructions.set_protocol_fee_rate(
            instructions.SetProtocolFeeRateArgs(
                protocol_fee_rate=params.protocol_fee_rate,
            ),
            instructions.SetProtocolFeeRateAccounts(
                whirlpools_config=params.whirlpools_config,
                whirlpool=params.whirlpool,
                fee_authority=params.fee_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_reward_authority(program_id: PublicKey, params: SetRewardAuthorityParams):
        ix = instructions.set_reward_authority(
            instructions.SetRewardAuthorityArgs(
                reward_index=params.reward_index
            ),
            instructions.SetRewardAuthorityAccounts(
                whirlpool=params.whirlpool,
                reward_authority=params.reward_authority,
                new_reward_authority=params.new_reward_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_reward_authority_by_super_authority(program_id: PublicKey, params: SetRewardAuthorityBySuperAuthorityParams):
        ix = instructions.set_reward_authority_by_super_authority(
            instructions.SetRewardAuthorityBySuperAuthorityArgs(
                reward_index=params.reward_index
            ),
            instructions.SetRewardAuthorityBySuperAuthorityAccounts(
                whirlpools_config=params.whirlpools_config,
                whirlpool=params.whirlpool,
                reward_emissions_super_authority=params.reward_emissions_super_authority,
                new_reward_authority=params.new_reward_authority,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_reward_emissions(program_id: PublicKey, params: SetRewardEmissionsParams):
        ix = instructions.set_reward_emissions(
            instructions.SetRewardEmissionsArgs(
                reward_index=params.reward_index,
                emissions_per_second_x64=params.emissions_per_second_x64,
            ),
            instructions.SetRewardEmissionsAccounts(
                whirlpool=params.whirlpool,
                reward_authority=params.reward_authority,
                reward_vault=params.reward_vault,
            ),
            program_id
        )
        return to_instruction([ix])

    @staticmethod
    def set_reward_emissions_super_authority(program_id: PublicKey, params: SetRewardEmissionsSuperAuthorityParams):
        ix = instructions.set_reward_emissions_super_authority(
            instructions.SetRewardEmissionsSuperAuthorityAccounts(
                whirlpools_config=params.whirlpools_config,
                reward_emissions_super_authority=params.reward_emissions_super_authority,
                new_reward_emissions_super_authority=params.new_reward_emissions_super_authority,
            ),
            program_id
        )
        return to_instruction([ix])
