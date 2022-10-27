# ATTENTION! this porting is just example!

import math
from typing import List
from decimal import Decimal
from solana.publickey import PublicKey
from spl.token.instructions import get_associated_token_address
from spl.token.core import MintInfo, AccountInfo
from spl.token._layouts import MINT_LAYOUT, ACCOUNT_LAYOUT

ORCA_WHIRLPOOL_PROGRAM_ID = PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc")
ORCA_WHIRLPOOLS_CONFIG = PublicKey("2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ")
METAPLEX_METADATA_PROGRAM_ID = PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

TICK_ARRAY_SIZE = 88
MIN_TICK_INDEX = -443636
MAX_TICK_INDEX = +443636
MIN_SQRT_PRICE = 4295048016
MAX_SQRT_PRICE = 79226673515401279992447579055
U64_MAX = 18446744073709551615
PDA_WHIRLPOOL_SEED = b"whirlpool"
PDA_POSITION_SEED = b"position"
PDA_METADATA_SEED = b"metadata"
PDA_TICK_ARRAY_SEED = b"tick_array"
PDA_FEE_TIER_SEED = b"fee_tier"
PDA_ORACLE_SEED = b"oracle"


class TokenAmounts:
    def __init__(self, token_a: int, token_b: int):
        self.token_a = token_a
        self.token_b = token_b


class PDA:
    def __init__(self, pubkey: PublicKey, bump: int):
        self.pubkey = pubkey
        self.bump = bump


def div_floor(a: int, b: int) -> int:
    return math.floor(a / b)


def to_fixed(price: Decimal, decimals: int) -> Decimal:
    if decimals == 0:
        return price.quantize(Decimal("1"))
    else:
        return price.quantize(Decimal("0." + "0"*(decimals-1) + "1"))


def mul_shift(a: int, b: int, shift: int) -> int:
    return (a * b) >> shift


def tick_index_to_sqrt_price_positive(tick_index: int) -> int:
    tick_index_shifted = tick_index

    if tick_index_shifted & 1 == 0:
        ratio = 79228162514264337593543950336  # 0
    else:
        ratio = 79232123823359799118286999567  # 1

    precalculated_factor = [
        79236085330515764027303304731,  # 2
        79244008939048815603706035061,  # 4
        79259858533276714757314932305,  # 8
        79291567232598584799939703904,  # ...
        79355022692464371645785046466,
        79482085999252804386437311141,
        79736823300114093921829183326,
        80248749790819932309965073892,
        81282483887344747381513967011,
        83390072131320151908154831281,
        87770609709833776024991924138,
        97234110755111693312479820773,
        119332217159966728226237229890,
        179736315981702064433883588727,
        407748233172238350107850275304,
        2098478828474011932436660412517,
        55581415166113811149459800483533,
        38992368544603139932233054999993551,  # 262144
    ]

    for i in range(len(precalculated_factor)):
        tick_index_shifted = tick_index_shifted >> 1
        if tick_index_shifted & 1 != 0:
            ratio = mul_shift(ratio, precalculated_factor[i], 96)

    return mul_shift(ratio, 1, 32)


def tick_index_to_sqrt_price_negative(tick_index: int) -> int:
    tick_index_shifted = abs(tick_index)

    if tick_index_shifted & 1 == 0:
        ratio = 18446744073709551616  # 0
    else:
        ratio = 18445821805675392311  # 1

    precalculated_factor = [
        18444899583751176498,  # 2
        18443055278223354162,  # 4
        18439367220385604838,  # 8
        18431993317065449817,  # ...
        18417254355718160513,
        18387811781193591352,
        18329067761203520168,
        18212142134806087854,
        17980523815641551639,
        17526086738831147013,
        16651378430235024244,
        15030750278693429944,
        12247334978882834399,
        8131365268884726200,
        3584323654723342297,
        696457651847595233,
        26294789957452057,
        37481735321082,  # 262144
    ]

    for i in range(len(precalculated_factor)):
        tick_index_shifted = tick_index_shifted >> 1
        if tick_index_shifted & 1 != 0:
            ratio = mul_shift(ratio, precalculated_factor[i], 64)

    return ratio


class MathUtil:
    @staticmethod
    def to_x64(num: Decimal) -> int:
        shift_64 = Decimal(2)**64
        return int(num * shift_64)

    @staticmethod
    def from_x64(num: int) -> Decimal:
        shift_64 = Decimal(2)**64
        return Decimal(num) / shift_64


class TokenUtil:
    @staticmethod
    def deserialize_token_account(data: bytes) -> AccountInfo:
        decoded_data = ACCOUNT_LAYOUT.parse(data)

        mint = PublicKey(decoded_data.mint)
        owner = PublicKey(decoded_data.owner)
        amount = decoded_data.amount

        if decoded_data.delegate_option == 0:
            delegate = None
            delegated_amount = 0
        else:
            delegate = PublicKey(decoded_data.delegate)
            delegated_amount = decoded_data.delegated_amount

        is_initialized = decoded_data.state != 0
        is_frozen = decoded_data.state == 2

        if decoded_data.is_native_option == 1:
            rent_exempt_reserve = decoded_data.is_native
            is_native = True
        else:
            rent_exempt_reserve = None
            is_native = False

        if decoded_data.close_authority_option == 0:
            close_authority = None
        else:
            close_authority = PublicKey(decoded_data.owner)

        return AccountInfo(
            mint,
            owner,
            amount,
            delegate,
            delegated_amount,
            is_initialized,
            is_frozen,
            is_native,
            rent_exempt_reserve,
            close_authority,
        )

    @staticmethod
    def deserialize_mint(data: bytes) -> MintInfo:
        decoded_data = MINT_LAYOUT.parse(data)
        decimals = decoded_data.decimals

        if decoded_data.mint_authority_option == 0:
            mint_authority = None
        else:
            mint_authority = PublicKey(decoded_data.mint_authority)

        supply = decoded_data.supply
        is_initialized = decoded_data.is_initialized != 0

        if decoded_data.freeze_authority_option == 0:
            freeze_authority = None
        else:
            freeze_authority = PublicKey(decoded_data.freeze_authority)

        return MintInfo(mint_authority, supply, decimals, is_initialized, freeze_authority)


class PriceMath:
    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#sqrtPriceX64ToPrice
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/price-math.ts#L22
    @staticmethod
    def sqrt_price_x64_to_price(sqrt_price_x64: int, decimals_a: int, decimals_b: int) -> Decimal:
        decimal_adjust = Decimal(10)**(decimals_a - decimals_b)
        price = MathUtil.from_x64(sqrt_price_x64)**2 * decimal_adjust
        return price

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#sqrtPriceX64ToTickIndex
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/price-math.ts#L49
    @staticmethod
    def sqrt_price_x64_to_tick_index(sqrt_price_x64: int) -> int:
        # rough calculation
        shift_64 = 2**64
        sqrt_price = sqrt_price_x64 / shift_64
        price = sqrt_price**2
        tick_index = math.floor(math.log(price) / math.log(1.0001))

        # adjust to exact result
        while PriceMath.tick_index_to_sqrt_price_x64(tick_index)   >  sqrt_price_x64: tick_index = tick_index - 1
        while PriceMath.tick_index_to_sqrt_price_x64(tick_index+1) <= sqrt_price_x64: tick_index = tick_index + 1
        return tick_index

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#tickIndexToSqrtPriceX64
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/price-math.ts#L36
    @staticmethod
    def tick_index_to_sqrt_price_x64(tick_index: int) -> int:
        if tick_index > 0:
            return tick_index_to_sqrt_price_positive(tick_index)
        else:
            return tick_index_to_sqrt_price_negative(tick_index)

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#tickIndexToPrice
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/price-math.ts#L101
    @staticmethod
    def tick_index_to_price(tick_index: int, decimals_a: int, decimals_b: int) -> Decimal:
        return PriceMath.sqrt_price_x64_to_price(
            PriceMath.tick_index_to_sqrt_price_x64(tick_index),
            decimals_a,
            decimals_b
        )

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#priceToSqrtPriceX64
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/price-math.ts#L18
    @staticmethod
    def price_to_sqrt_price_x64(price: Decimal, decimals_a: int, decimals_b: int) -> int:
        decimal_adjust = Decimal(10)**(decimals_a - decimals_b)
        return MathUtil.to_x64((price / decimal_adjust).sqrt())

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#priceToTickIndex
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/price-math.ts#L109
    @staticmethod
    def price_to_tick_index(price: Decimal, decimals_a: int, decimals_b: int) -> int:
        return PriceMath.sqrt_price_x64_to_tick_index(
            PriceMath.price_to_sqrt_price_x64(price, decimals_a, decimals_b)
        )

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#priceToInitializableTickIndex
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/price-math.ts#L115
    @staticmethod
    def price_to_initializable_tick_index(price: Decimal, decimals_a: int, decimals_b: int, tick_spacing: int) -> int:
        return TickUtil.get_initializable_tick_index(
            PriceMath.price_to_tick_index(price, decimals_a, decimals_b),
            tick_spacing
        )


class TickUtil:
    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#getStartTickIndex
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/tick-utils.ts#L33
    @staticmethod
    def get_start_tick_index(tick_index: int, tick_spacing: int, offset: int = 0) -> int:
        ticks_in_array = TICK_ARRAY_SIZE * tick_spacing
        real_index = div_floor(tick_index, ticks_in_array)
        start_tick_index = (real_index + offset) * ticks_in_array

        assert(MIN_TICK_INDEX < start_tick_index + ticks_in_array)
        assert(start_tick_index <= MAX_TICK_INDEX)
        return start_tick_index

    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#getInitializableTickIndex
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/tick-utils.ts#L49
    @staticmethod
    def get_initializable_tick_index(tick_index: int, tick_spacing: int) -> int:
        # Note: javascript: -5 % 3 = -2, python: -5 % 3 = 1
        initializable_tick_index_abs = abs(tick_index) - abs(tick_index) % tick_spacing
        if tick_index >= 0:
            return initializable_tick_index_abs
        else:
            return -1 * initializable_tick_index_abs

    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#isTickInitializable
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/tick-utils.ts#L142
    @staticmethod
    def is_initializable(tick_index: int, tick_spacing: int) -> bool:
        return tick_index % tick_spacing == 0

    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#checkTickInBounds
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/tick-utils.ts#L138
    @staticmethod
    def check_tick_in_bounds(tick_index: int) -> bool:
        return MIN_TICK_INDEX <= tick_index <= MAX_TICK_INDEX


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
    def get_feetier(program_id: PublicKey, whirlpools_config_pubkey: PublicKey, tick_spacing: int) -> PDA:
        seeds = [
            PDA_FEE_TIER_SEED,
            bytes(whirlpools_config_pubkey),
            tick_spacing.to_bytes(2, "little")
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return PDA(pubkey, nonce)


class SwapUtil:
    # https://orca-so.github.io/whirlpools/classes/SwapUtils.html#getTickArrayPublicKeys
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/swap-utils.ts#L75
    @staticmethod
    def get_tick_array_pubkeys(
        tick_current_index: int,
        tick_spacing: int,
        a_to_b: bool,
        program_id: PublicKey,
        whirlpool_pubkey: PublicKey,
    ) -> List[PublicKey]:
        offset = 0
        pubkeys = []
        for i in range(3):
            start_tick_index = TickUtil.get_start_tick_index(tick_current_index, tick_spacing, offset)
            tick_array_pubkey = PDAUtil.get_tick_array(program_id, whirlpool_pubkey, start_tick_index)
            pubkeys.append(tick_array_pubkey)
            offset = (offset - 1) if a_to_b else (offset + 1)
        return pubkeys

    # https://orca-so.github.io/whirlpools/classes/SwapUtils.html#getDefaultSqrtPriceLimit
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/swap-utils.ts#L28
    @staticmethod
    def get_default_sqrt_price_limit(a_to_b: bool) -> int:
        return MIN_SQRT_PRICE if a_to_b else MAX_SQRT_PRICE

    # https://orca-so.github.io/whirlpools/classes/SwapUtils.html#getDefaultOtherAmountThreshold
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/swap-utils.ts#L37
    @staticmethod
    def get_default_other_amount_threshold(amount_specified_is_input: bool) -> int:
        return 0 if amount_specified_is_input else U64_MAX


class PoolUtil:
    # https://orca-so.github.io/whirlpools/classes/PoolUtil.html#getTokenAmountsFromLiquidity
    # https://github.com/orca-so/whirlpools/blob/7b9ec35/sdk/src/utils/public/pool-utils.ts#L84
    @staticmethod
    def get_token_amounts_from_liquidity(
        liquidity: int,
        current_sqrt_price_x64: int,
        lower_sqrt_price_x64: int,
        upper_sqrt_price_x64: int,
        round_up: bool
    ) -> TokenAmounts:
        L = Decimal(liquidity)
        lower = Decimal(lower_sqrt_price_x64)
        upper = Decimal(upper_sqrt_price_x64)
        current = min(max(Decimal(current_sqrt_price_x64), lower), upper)  # bounded

        shift_64 = Decimal(2)**64
        token_a = L * shift_64 * (upper - current) / (current * upper)
        token_b = L * (current - lower) / shift_64

        if round_up:
            return TokenAmounts(int(math.ceil(token_a)), int(math.ceil(token_b)))
        else:
            return TokenAmounts(int(math.floor(token_a)), int(math.floor(token_b)))


class DecimalUtil:
    # https://github.com/orca-so/orca-sdks/blob/main/packages/common-sdk/src/math/decimal-util.ts
    @staticmethod
    def to_u64(num: Decimal, shift=0) -> int:
        return int(num * 10**shift)


def derive_ata(wallet: PublicKey, mint: PublicKey):
    return get_associated_token_address(wallet, mint)
