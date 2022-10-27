# ATTENTION!
#
# to use this script, you need to create wallet.json
# and it holds some USDC (>= 0.1) and SAMO (>= 0.1) to create ATA
#
# solana related library:
#   pip install solana
#   pip install anchorpy

import asyncio
import json
from decimal import Decimal
from pathlib import Path
from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
from solana.keypair import Keypair
from spl.token.constants import TOKEN_PROGRAM_ID
from anchorpy import Idl, Program, Provider, Wallet, Context

# ported functions from whirlpools-sdk and common-sdk
from whirlpool_porting import ORCA_WHIRLPOOL_PROGRAM_ID, derive_ata, to_fixed, DecimalUtil, PriceMath, SwapUtil, PDAUtil

RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com/"

SAMO_USDC_WHIRLPOOL_PUBKEY = PublicKey("9vqYJjDUFecLL2xPUC4Rc7hyCtZ6iJ4mDiVZX7aFXoAe")
SAMO_DECIMAL = 9
USDC_DECIMAL = 6


async def main():
    # read wallet
    # - how to create: solana-keygen new -o wallet.json
    # - need some USDC and SAMO
    with Path("wallet.json").open() as f:
        keypair = Keypair.from_secret_key(bytes(json.load(f)))
    print("wallet pubkey", keypair.public_key.to_base58())

    # create Anchor client
    with Path("whirlpool.json").open() as f:
        raw_idl = json.load(f)
    idl = Idl.from_json(raw_idl)
    connection = AsyncClient(RPC_ENDPOINT_URL)
    provider = Provider(connection, Wallet(keypair))
    program = Program(idl, ORCA_WHIRLPOOL_PROGRAM_ID, provider)

    # get whirlpool
    whirlpool_pubkey = SAMO_USDC_WHIRLPOOL_PUBKEY
    token_a_decimal = SAMO_DECIMAL
    token_b_decimal = USDC_DECIMAL
    whirlpool = await program.account["Whirlpool"].fetch(whirlpool_pubkey)
    print("whirlpool token_mint_a", whirlpool.token_mint_a)
    print("whirlpool token_mint_b", whirlpool.token_mint_b)
    print("whirlpool tick_spacing", whirlpool.tick_spacing)
    print("whirlpool tick_current_index", whirlpool.tick_current_index)
    print("whirlpool sqrt_price", whirlpool.sqrt_price)
    price = PriceMath.sqrt_price_x64_to_price(whirlpool.sqrt_price, token_a_decimal, token_b_decimal)
    print("whirlpool price", to_fixed(price, token_b_decimal))

    # input
    # no threshold because it is difficult to port swap quote function ^^;
    a_to_b = False  # USDC to SAMO
    amount = DecimalUtil.to_u64(Decimal("0.01"), token_b_decimal)  # USDC
    amount_specified_is_input = True
    other_amount_threshold = 0
    sqrt_price_limit = SwapUtil.get_default_sqrt_price_limit(a_to_b)

    # get ATA (not considering WSOL and creation of ATA)
    token_account_a = derive_ata(keypair.public_key, whirlpool.token_mint_a)
    token_account_b = derive_ata(keypair.public_key, whirlpool.token_mint_b)
    print("token_account_a", token_account_a)
    print("token_account_b", token_account_b)

    # get TickArray
    pubkeys = SwapUtil.get_tick_array_pubkeys(
        whirlpool.tick_current_index,
        whirlpool.tick_spacing,
        a_to_b,
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpool_pubkey
    )
    print("tickarrays", pubkeys)

    # get Oracle
    oracle = PDAUtil.get_oracle(ORCA_WHIRLPOOL_PROGRAM_ID, whirlpool_pubkey)
    print("oracle", oracle)

    # execute transaction
    accounts = {
        "token_program": TOKEN_PROGRAM_ID,
        "token_authority": keypair.public_key,
        "whirlpool": whirlpool_pubkey,
        "token_owner_account_a": token_account_a,
        "token_vault_a": whirlpool.token_vault_a,
        "token_owner_account_b": token_account_b,
        "token_vault_b": whirlpool.token_vault_b,
        "tick_array0": pubkeys[0],
        "tick_array1": pubkeys[1],
        "tick_array2": pubkeys[2],
        "oracle": oracle
    }

    signature = await program.rpc["swap"](
        amount,
        other_amount_threshold,
        sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
        ctx=Context(accounts=accounts, signers=[])
    )
    print("TX signature", signature)

asyncio.run(main())

"""
SAMPLE OUTPUT:

$ python swap.py
wallet pubkey b'r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6'
whirlpool token_mint_a 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool tick_spacing 64
whirlpool tick_current_index -112630
whirlpool sqrt_price 66118916874130807
whirlpool price 0.012847
token_account_a 6dM4iMgSei6zF9y3sqdgSJ2xwNXML5wk5QKhV4DqJPhu
token_account_b FbQdXCQgGQYj3xcGeryVVFjKCTsAuu53vmCRtmjQEqM5
tickarrays [CHVTbSXJ3W1XEjQXx7BhV2ZSfzmQcbZzKTGZa6ph6BoH, EE9AbRXbCKRGMeN6qAxxMUTEEPd1tQo67oYBQKkUNrfJ, HpuNjdx9vTLYTAsxH3N6HCkguEkG9mCEpkrRugqyCPwF]
oracle 5HyJnjQ4XTSVXUS2Q8Ef6VCVwnXGnHE2WTwq7iSaZJez
TX signature 5iXhrBtZ7LmwuKXQNE6XXHRmcngwmu2W5azjkGWw1wEwdD32JW5KLvoqWwPjJKxR9aUzDFbta9P6gT3iCmQYsjiq
"""