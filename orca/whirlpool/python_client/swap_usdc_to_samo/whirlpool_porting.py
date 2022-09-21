# ATTENTION! this porting is just example!

import math
from typing import List
from decimal import Decimal
from solana.publickey import PublicKey
from spl.token.instructions import get_associated_token_address

ORCA_WHIRLPOOL_PROGRAM_ID = PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc")

TICK_ARRAY_SIZE = 88
MIN_TICK_INDEX = -443636
MAX_TICK_INDEX = +443636
MIN_SQRT_PRICE = 4295048016
MAX_SQRT_PRICE = 79226673515401279992447579055
PDA_TICK_ARRAY_SEED = b"tick_array"
PDA_ORACLE_SEED = b"oracle"


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


class PriceMath:
    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#sqrtPriceX64ToPrice
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/price-math.ts#L22
    @staticmethod
    def sqrt_price_x64_to_price(sqrt_price_x64: int, decimals_a: int, decimals_b: int) -> Decimal:
        sqrt_price_x64_decimal = Decimal(sqrt_price_x64)
        decimal_adjust = Decimal(10)**(decimals_a - decimals_b)
        shift_64 = Decimal(2)**64
        price = (sqrt_price_x64_decimal / shift_64)**2 * decimal_adjust
        return price

    # https://orca-so.github.io/whirlpools/classes/PriceMath.html#sqrtPriceX64ToTickIndex
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/price-math.ts#L49
    @staticmethod
    def sqrt_price_x64_to_tick_index(sqrt_price_x64: int) -> int:
        # rough calculation
        shift_64 = 2**64
        sqrt_price = sqrt_price_x64 / shift_64
        price = sqrt_price**2
        tick_index = math.floor( math.log(price) / math.log(1.0001) )

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


class TickUtil:
    # https://orca-so.github.io/whirlpools/classes/TickUtil.html#getStartTickIndex
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/tick-utils.ts#L33
    @staticmethod
    def get_start_tick_index(tick_current_index: int, tick_spacing: int, offset: int) -> int:
        ticks_in_array = TICK_ARRAY_SIZE * tick_spacing
        real_index = div_floor(tick_current_index, ticks_in_array)
        start_tick_index = (real_index + offset) * ticks_in_array

        assert(MIN_TICK_INDEX <= start_tick_index)
        assert(start_tick_index + ticks_in_array <= MAX_TICK_INDEX)
        return start_tick_index


class PDAUtil:
    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getTickArray
    # https://github.com/orca-so/whirlpools/blob/main/sdk/src/utils/public/pda-utils.ts#L83
    # https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/initialize_tick_array.rs#L16
    @staticmethod
    def get_tick_array(program_id: PublicKey, whirlpool_pubkey: PublicKey, start_tick_index: int) -> PublicKey:
        seeds = [
            PDA_TICK_ARRAY_SEED,
            bytes(whirlpool_pubkey),
            str(start_tick_index).encode("utf-8")
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return pubkey

    # https://orca-so.github.io/whirlpools/classes/PDAUtil.html#getOracle
    # https://github.com/orca-so/whirlpools/blob/2df89bb/sdk/src/utils/public/pda-utils.ts#L165
    @staticmethod
    def get_oracle(program_id: PublicKey, whirlpool_pubkey: PublicKey) -> PublicKey:
        seeds = [
            PDA_ORACLE_SEED,
            bytes(whirlpool_pubkey),
        ]
        (pubkey, nonce) = PublicKey.find_program_address(seeds, program_id)
        return pubkey


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
        offset = 0;
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


class DecimalUtil:
    # https://github.com/orca-so/orca-sdks/blob/main/packages/common-sdk/src/math/decimal-util.ts
    @staticmethod
    def to_u64(input: Decimal, shift=0) -> int:
        return int(input * 10**shift)


def derive_ata(wallet: PublicKey, mint: PublicKey):
    return get_associated_token_address(wallet, mint)
