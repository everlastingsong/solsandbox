from solana.publickey import PublicKey
from .constants import METAPLEX_METADATA_PROGRAM_ID
from .types import PDA


PDA_WHIRLPOOL_SEED = b"whirlpool"
PDA_POSITION_SEED = b"position"
PDA_METADATA_SEED = b"metadata"
PDA_TICK_ARRAY_SEED = b"tick_array"
PDA_FEE_TIER_SEED = b"fee_tier"
PDA_ORACLE_SEED = b"oracle"


class PDAUtil:
    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getWhirlpool
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pda-utils.ts#L28
    @staticmethod
    def get_whirlpool(
        program_id: PublicKey,
        whirlpools_config_pubkey: PublicKey,
        mint_a: PublicKey,
        mint_b: PublicKey,
        tick_spacing: int
    ) -> PDA:
        seeds = [
            PDA_WHIRLPOOL_SEED,
            bytes(whirlpools_config_pubkey),
            bytes(mint_a),
            bytes(mint_b),
            tick_spacing.to_bytes(2, "little")
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return PDA(pubkey, nonce)

    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getPosition
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pda-utils.ts#L53
    @staticmethod
    def get_position(program_id: PublicKey, position_mint: PublicKey) -> PDA:
        seeds = [
            PDA_POSITION_SEED,
            bytes(position_mint)
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return PDA(pubkey, nonce)

    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getPositionMetadata
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pda-utils.ts#L65
    @staticmethod
    def get_position_metadata(position_mint: PublicKey) -> PDA:
        seeds = [
            PDA_METADATA_SEED,
            bytes(METAPLEX_METADATA_PROGRAM_ID),
            bytes(position_mint)
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, METAPLEX_METADATA_PROGRAM_ID)
        return PDA(pubkey, nonce)

    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getTickArray
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/pda-utils.ts#L83
    # https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/initialize_tick_array.rs#L16
    @staticmethod
    def get_tick_array(program_id: PublicKey, whirlpool_pubkey: PublicKey, start_tick_index: int) -> PDA:
        seeds = [
            PDA_TICK_ARRAY_SEED,
            bytes(whirlpool_pubkey),
            str(start_tick_index).encode("utf-8")
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return PDA(pubkey, nonce)

    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getOracle
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/pda-utils.ts#L165
    @staticmethod
    def get_oracle(program_id: PublicKey, whirlpool_pubkey: PublicKey) -> PDA:
        seeds = [
            PDA_ORACLE_SEED,
            bytes(whirlpool_pubkey),
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return PDA(pubkey, nonce)

    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getFeeTier
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pda-utils.ts#L144
    @staticmethod
    def get_fee_tier(program_id: PublicKey, whirlpools_config_pubkey: PublicKey, tick_spacing: int) -> PDA:
        seeds = [
            PDA_FEE_TIER_SEED,
            bytes(whirlpools_config_pubkey),
            tick_spacing.to_bytes(2, "little")
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return PDA(pubkey, nonce)
