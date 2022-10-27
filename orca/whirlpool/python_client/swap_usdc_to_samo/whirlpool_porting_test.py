import unittest
from decimal import Decimal
from solana.publickey import PublicKey

from whirlpool_porting import ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, PoolUtil, derive_ata, to_fixed, DecimalUtil, PriceMath, SwapUtil, PDAUtil, TickUtil, MIN_TICK_INDEX, MAX_TICK_INDEX, MIN_SQRT_PRICE, MAX_SQRT_PRICE, U64_MAX, TICK_ARRAY_SIZE


class PDAUtilTestCase(unittest.TestCase):
    def test_get_whirlpool_01(self):
        sol = PublicKey("So11111111111111111111111111111111111111112")
        usdc = PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
        sol_usdc_64 = PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ")
        result = PDAUtil.get_whirlpool(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, sol, usdc, 64).pubkey
        self.assertEqual(result.to_base58(), sol_usdc_64.to_base58())

    def test_get_whirlpool_02(self):
        sol = PublicKey("So11111111111111111111111111111111111111112")
        stsol = PublicKey("7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj")
        sol_stsol_1 = PublicKey("2AEWSvUds1wsufnsDPCXjFsJCMJH5SNNm7fSF4kxys9a")
        result = PDAUtil.get_whirlpool(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, sol, stsol, 1).pubkey
        self.assertEqual(result.to_base58(), sol_stsol_1.to_base58())

    def test_get_position_01(self):
        # https://solscan.io/tx/32boMycNhPh8JSAtiBT53pWgKprmpHMWyGaCdAjqNvg2ppB9GV3M7Ye2MVhmGLbEBqFxN1acNjMRvSvcriYNcD2v
        mint = PublicKey("BsNH5iSWjthsDuJrh5QeVGUjbkUcxkjaGzByjVjt83qC")
        position = PublicKey("88hXrRdXuHFCWm41S6yyeW7QWSeVbgmHL4ja2iHUumip")
        result = PDAUtil.get_position(ORCA_WHIRLPOOL_PROGRAM_ID, mint).pubkey
        self.assertEqual(result.to_base58(), position.to_base58())

    def test_get_position_02(self):
        # https://solscan.io/tx/4L2jje9mTXygt9x7oyf7sCoiuSgG5axpMBFNVT1Hg6tESW4rJnrPACzBE1gcz82J1ckrN2PubhvN2tEsJmbcDyL7
        mint = PublicKey("Fcjdf8RQBRwZqDUJ4Kqe7K4T3jG1rtchKywWN1BKD1k7")
        position = PublicKey("B66pRzGcKMmxRJ16KMkJMJoQWWhmyk4na4DPcv6X5ZRD")
        result = PDAUtil.get_position(ORCA_WHIRLPOOL_PROGRAM_ID, mint).pubkey
        self.assertEqual(result.to_base58(), position.to_base58())

    def test_get_position_metadata_01(self):
        # https://solscan.io/tx/32boMycNhPh8JSAtiBT53pWgKprmpHMWyGaCdAjqNvg2ppB9GV3M7Ye2MVhmGLbEBqFxN1acNjMRvSvcriYNcD2v
        mint = PublicKey("BsNH5iSWjthsDuJrh5QeVGUjbkUcxkjaGzByjVjt83qC")
        metadata = PublicKey("38SUhTtHdSDCyb69pLJ5ranDoyKPkdNB47fNiGDMCZgc")
        result = PDAUtil.get_position_metadata(mint).pubkey
        self.assertEqual(result.to_base58(), metadata.to_base58())

    def test_get_position_metadata_02(self):
        # https://solscan.io/tx/4L2jje9mTXygt9x7oyf7sCoiuSgG5axpMBFNVT1Hg6tESW4rJnrPACzBE1gcz82J1ckrN2PubhvN2tEsJmbcDyL7
        mint = PublicKey("Fcjdf8RQBRwZqDUJ4Kqe7K4T3jG1rtchKywWN1BKD1k7")
        metadata = PublicKey("BynyGEfNoPGJTkKz7ctEeB6CMr6xbYD8QJgU4k7KqBpK")
        result = PDAUtil.get_position_metadata(mint).pubkey
        self.assertEqual(result.to_base58(), metadata.to_base58())

    def test_get_tick_array_01(self):
        sol_usdc_64 = PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ")
        tickarray_n39424 = PublicKey("EVqGhR2ukNuqZNfvFFAitrX6UqrRm2r8ayKX9LH9xHzK")
        result = PDAUtil.get_tick_array(ORCA_WHIRLPOOL_PROGRAM_ID, sol_usdc_64, -39424).pubkey
        self.assertEqual(result.to_base58(), tickarray_n39424.to_base58())

    def test_get_tick_array_02(self):
        usdc_usdt_1 = PublicKey("4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4")
        tickarray_p1144 = PublicKey("9GyHXzDr7XXYYgP4hSf1UXSdCk78kjFQGgZ4zga8VLAg")
        result = PDAUtil.get_tick_array(ORCA_WHIRLPOOL_PROGRAM_ID, usdc_usdt_1, +1144).pubkey
        self.assertEqual(result.to_base58(), tickarray_p1144.to_base58())

    def test_get_oracle_01(self):
        sol_usdc_64 = PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ")
        oracle = PublicKey("4GkRbcYg1VKsZropgai4dMf2Nj2PkXNLf43knFpavrSi")
        result = PDAUtil.get_oracle(ORCA_WHIRLPOOL_PROGRAM_ID, sol_usdc_64).pubkey
        self.assertEqual(result.to_base58(), oracle.to_base58())

    def test_get_oracle_02(self):
        usdc_usdt_1 = PublicKey("4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4")
        oracle = PublicKey("3NxDBWt55DZnEwwQ2bhQ3xWG8Jd18TdUXAG4Zdr7jDai")
        result = PDAUtil.get_oracle(ORCA_WHIRLPOOL_PROGRAM_ID, usdc_usdt_1).pubkey
        self.assertEqual(result.to_base58(), oracle.to_base58())


class PriceMathTestCase(unittest.TestCase):
    def test_tick_index_to_sqrt_price_x64_01(self):
        result = PriceMath.tick_index_to_sqrt_price_x64(0)
        expected = 1 << 64
        self.assertEqual(result, expected)

    def test_tick_index_to_sqrt_price_x64_02(self):
        result = PriceMath.tick_index_to_sqrt_price_x64(MIN_TICK_INDEX)
        expected = MIN_SQRT_PRICE
        self.assertEqual(result, expected)

    def test_tick_index_to_sqrt_price_x64_03(self):
        result = PriceMath.tick_index_to_sqrt_price_x64(MAX_TICK_INDEX)
        expected = MAX_SQRT_PRICE
        self.assertEqual(result, expected)

    def test_tick_index_to_sqrt_price_x64_04(self):
        result = PriceMath.tick_index_to_sqrt_price_x64(-39424)
        expected = 2569692997056777477
        self.assertEqual(result, expected)

    def test_tick_index_to_sqrt_price_x64_05(self):
        result = PriceMath.tick_index_to_sqrt_price_x64(1584)
        expected = 19967060128772183316
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_tick_index_01(self):
        result = PriceMath.sqrt_price_x64_to_tick_index(1 << 64)
        expected = 0
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_tick_index_02(self):
        result = PriceMath.sqrt_price_x64_to_tick_index(MIN_SQRT_PRICE)
        expected = MIN_TICK_INDEX
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_tick_index_03(self):
        result = PriceMath.sqrt_price_x64_to_tick_index(MAX_SQRT_PRICE)
        expected = MAX_TICK_INDEX
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_tick_index_04(self):
        result = PriceMath.sqrt_price_x64_to_tick_index(2569692997056777477)
        expected = -39424
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_tick_index_05(self):
        result = PriceMath.sqrt_price_x64_to_tick_index(19967060128772183316)
        expected = 1584
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_price_01(self):
        result = PriceMath.sqrt_price_x64_to_price(1 << 64, 9, 6)
        expected = 1000
        self.assertEqual(result, expected)

    def test_sqrt_price_x64_to_price_02(self):
        result = PriceMath.sqrt_price_x64_to_price(3262859719519939898, 9, 6)
        expected = Decimal("31.28652726145901582501523855769873785412")
        self.assertTrue(abs(result - expected) < 0.000000001)

    def test_sqrt_price_x64_to_price_03(self):
        result = PriceMath.sqrt_price_x64_to_price(17883737353544829048, 9, 9)
        expected = Decimal("0.9398901994968307280837320329027312154207")
        self.assertTrue(abs(result - expected) < 0.000000001)

    def test_tick_index_to_price_01(self):
        result = PriceMath.tick_index_to_price(0, 9, 6)
        expected = Decimal("1000")
        self.assertTrue(abs(result - expected) < 0.000000001)

    def test_tick_index_to_price_02(self):
        result = PriceMath.tick_index_to_price(-34648, 9, 6)
        expected = Decimal("31.28467958014976245254594473693319568663")
        self.assertTrue(abs(result - expected) < 0.000000001)

    def test_price_to_sqrt_price_x64_01(self):
        expected = 3262859719519939898
        price = PriceMath.sqrt_price_x64_to_price(expected, 9, 6)
        result = PriceMath.price_to_sqrt_price_x64(price, 9, 6)
        self.assertEqual(result, expected)

    def test_price_to_sqrt_price_x64_02(self):
        expected = 17883737353544829048
        price = PriceMath.sqrt_price_x64_to_price(expected, 9, 9)
        result = PriceMath.price_to_sqrt_price_x64(price, 9, 9)
        self.assertEqual(result, expected)

    def test_price_to_tick_index_01(self):
        price = Decimal("31.28652726145901582501523855769873785412")
        result = PriceMath.price_to_tick_index(price, 9, 6)
        expected = -34648
        self.assertEqual(result, expected)

    def test_price_to_tick_index_02(self):
        price = Decimal("0.9398901994968307280837320329027312154207")
        result = PriceMath.price_to_tick_index(price, 9, 9)
        expected = -620
        self.assertEqual(result, expected)

    def test_price_to_tick_index_03(self):
        price = Decimal("1000")
        result = PriceMath.price_to_tick_index(price, 9, 6)
        expected = 0
        self.assertEqual(result, expected)

    def test_price_to_initializable_tick_index_01(self):
        price = Decimal("31.28652726145901582501523855769873785412")
        result = PriceMath.price_to_initializable_tick_index(price, 9, 6, 64)
        expected = -34624
        self.assertEqual(result, expected)

    def test_price_to_initializable_tick_index_02(self):
        price = Decimal("0.9398901994968307280837320329027312154207")
        result = PriceMath.price_to_initializable_tick_index(price, 9, 9, 1)
        expected = -620
        self.assertEqual(result, expected)


class TickUtilTestCase(unittest.TestCase):
    def test_get_initializable_tick_index_01(self):
        result = TickUtil.get_initializable_tick_index(63, 1)
        expected = 63
        self.assertEqual(result, expected)

    def test_get_initializable_tick_index_02(self):
        result = TickUtil.get_initializable_tick_index(-63, 1)
        expected = -63
        self.assertEqual(result, expected)

    def test_get_initializable_tick_index_03(self):
        result = TickUtil.get_initializable_tick_index(63, 64)
        expected = 0
        self.assertEqual(result, expected)

    def test_get_initializable_tick_index_04(self):
        result = TickUtil.get_initializable_tick_index(-63, 64)
        expected = 0
        self.assertEqual(result, expected)

    def test_get_initializable_tick_index_05(self):
        result = TickUtil.get_initializable_tick_index(65, 64)
        expected = 64
        self.assertEqual(result, expected)

    def test_get_initializable_tick_index_06(self):
        result = TickUtil.get_initializable_tick_index(-65, 64)
        expected = -64
        self.assertEqual(result, expected)

    def test_get_start_tick_index_01(self):
        tick_spacing = 1
        result = TickUtil.get_start_tick_index(0, tick_spacing)
        expected = 0
        self.assertEqual(result, expected)

    def test_get_start_tick_index_02(self):
        tick_spacing = 1
        result = TickUtil.get_start_tick_index(tick_spacing*TICK_ARRAY_SIZE - 1, tick_spacing)
        expected = 0
        self.assertEqual(result, expected)

    def test_get_start_tick_index_03(self):
        tick_spacing = 1
        result = TickUtil.get_start_tick_index(tick_spacing*TICK_ARRAY_SIZE, tick_spacing)
        expected = tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_04(self):
        tick_spacing = 1
        result = TickUtil.get_start_tick_index(-1, tick_spacing)
        expected = -1 * tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_05(self):
        tick_spacing = 1
        result = TickUtil.get_start_tick_index(-1 * tick_spacing*TICK_ARRAY_SIZE, tick_spacing)
        expected = -1 * tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_06(self):
        tick_spacing = 64
        result = TickUtil.get_start_tick_index(tick_spacing*TICK_ARRAY_SIZE+64, tick_spacing)
        expected = tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_07(self):
        tick_spacing = 64
        result = TickUtil.get_start_tick_index(-1, tick_spacing)
        expected = -1 * tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_08(self):
        tick_spacing = 64
        result = TickUtil.get_start_tick_index(tick_spacing, tick_spacing, 2)
        expected = 2 * tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_09(self):
        tick_spacing = 64
        result = TickUtil.get_start_tick_index(tick_spacing, tick_spacing, -2)
        expected = -2 * tick_spacing*TICK_ARRAY_SIZE
        self.assertEqual(result, expected)

    def test_get_start_tick_index_10(self):
        tick_spacing = 64
        result = TickUtil.get_start_tick_index(MAX_TICK_INDEX, tick_spacing)
        expected = 439296
        self.assertEqual(result, expected)

    def test_get_start_tick_index_11(self):
        tick_spacing = 64
        result = TickUtil.get_start_tick_index(MIN_TICK_INDEX, tick_spacing)
        expected = -444928
        self.assertEqual(result, expected)

    def test_is_initializable_01(self):
        tick_spacing = 1
        result = TickUtil.is_initializable(63, tick_spacing)
        expected = True
        self.assertEqual(result, expected)

    def test_is_initializable_02(self):
        tick_spacing = 1
        result = TickUtil.is_initializable(-63, tick_spacing)
        expected = True
        self.assertEqual(result, expected)

    def test_is_initializable_03(self):
        tick_spacing = 64
        result = TickUtil.is_initializable(63, tick_spacing)
        expected = False
        self.assertEqual(result, expected)

    def test_is_initializable_04(self):
        tick_spacing = 64
        result = TickUtil.is_initializable(-63, tick_spacing)
        expected = False
        self.assertEqual(result, expected)

    def test_is_initializable_05(self):
        tick_spacing = 64
        result = TickUtil.is_initializable(128, tick_spacing)
        expected = True
        self.assertEqual(result, expected)

    def test_is_initializable_06(self):
        tick_spacing = 64
        result = TickUtil.is_initializable(-1024, tick_spacing)
        expected = True
        self.assertEqual(result, expected)

    def test_check_tick_in_bounds_01(self):
        self.assertTrue(TickUtil.check_tick_in_bounds(0))

    def test_check_tick_in_bounds_02(self):
        self.assertTrue(TickUtil.check_tick_in_bounds(64))

    def test_check_tick_in_bounds_03(self):
        self.assertTrue(TickUtil.check_tick_in_bounds(MIN_TICK_INDEX))

    def test_check_tick_in_bounds_04(self):
        self.assertTrue(TickUtil.check_tick_in_bounds(MAX_TICK_INDEX))

    def test_check_tick_in_bounds_05(self):
        self.assertFalse(TickUtil.check_tick_in_bounds(MIN_TICK_INDEX-1))

    def test_check_tick_in_bounds_06(self):
        self.assertFalse(TickUtil.check_tick_in_bounds(MAX_TICK_INDEX+1))


class SwapUtilTestCase(unittest.TestCase):
    def test_get_default_sqrt_price_limit_01(self):
        a_to_b = True
        result = SwapUtil.get_default_sqrt_price_limit(a_to_b)
        expected = MIN_SQRT_PRICE
        self.assertEqual(result, expected)

    def test_get_default_sqrt_price_limit_02(self):
        a_to_b = False
        result = SwapUtil.get_default_sqrt_price_limit(a_to_b)
        expected = MAX_SQRT_PRICE
        self.assertEqual(result, expected)

    def test_get_default_other_amount_threshold_01(self):
        amount_specified_is_input = True
        result = SwapUtil.get_default_other_amount_threshold(amount_specified_is_input)
        expected = 0
        self.assertEqual(result, expected)

    def test_get_default_other_amount_threshold_02(self):
        amount_specified_is_input = False
        result = SwapUtil.get_default_other_amount_threshold(amount_specified_is_input)
        expected = U64_MAX
        self.assertEqual(result, expected)


class PoolUtilTestCase(unittest.TestCase):
    def test_get_token_amounts_from_liquidity_01(self):
        # in case
        result = PoolUtil.get_token_amounts_from_liquidity(
            6638825,
            3263190564384012888,
            PriceMath.tick_index_to_sqrt_price_x64(-36864),
            PriceMath.tick_index_to_sqrt_price_x64(-22976),
            True
        )
        self.assertEqual(result.token_a, 16588789)
        self.assertEqual(result.token_b, 123305)

    def test_get_token_amounts_from_liquidity_02(self):
        # in case
        result = PoolUtil.get_token_amounts_from_liquidity(
            6638825,
            3263190564384012888,
            PriceMath.tick_index_to_sqrt_price_x64(-36864),
            PriceMath.tick_index_to_sqrt_price_x64(-22976),
            False
        )
        self.assertEqual(result.token_a, 16588789 - 1)
        self.assertEqual(result.token_b, 123305 - 1)

    def test_get_token_amounts_from_liquidity_03(self):
        # out case (above)
        result = PoolUtil.get_token_amounts_from_liquidity(
            3402372134,
            18437930740620451432,
            PriceMath.tick_index_to_sqrt_price_x64(-21),
            PriceMath.tick_index_to_sqrt_price_x64(-19),
            True
        )
        self.assertEqual(result.token_a, 0)
        self.assertEqual(result.token_b, 339881)

    def test_get_token_amounts_from_liquidity_04(self):
        # out case (below)
        result = PoolUtil.get_token_amounts_from_liquidity(
            41191049234,
            17883939350511009793,
            PriceMath.tick_index_to_sqrt_price_x64(-592),
            PriceMath.tick_index_to_sqrt_price_x64(-589),
            True
        )
        self.assertEqual(result.token_a, 6363475)
        self.assertEqual(result.token_b, 0)


if __name__ == "__main__":
    unittest.main()