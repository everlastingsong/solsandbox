# ATTENTION!
#
# solana related library:
#   pip install solana
#   pip install anchorpy

import asyncio
import json
from pathlib import Path
from solana.rpc.async_api import AsyncClient
from asyncstdlib import enumerate
from solana.rpc.websocket_api import connect
from solana.publickey import PublicKey
from solana.keypair import Keypair
from anchorpy import Idl, Program, Provider, Wallet

# ported functions from whirlpools-sdk and common-sdk
from whirlpool_porting import ORCA_WHIRLPOOL_PROGRAM_ID, to_fixed, PriceMath

RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com/"
RPC_WS_ENDPOINT_URL = "wss://api.mainnet-beta.solana.com/"

SOL_USDC_8_WHIRLPOOL_PUBKEY = PublicKey("7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm")
SOL_DECIMAL = 9
USDC_DECIMAL = 6

async def main():
    # create Anchor client with dummy wallet
    with Path("whirlpool.json").open() as f:
        raw_idl = json.load(f)
    idl = Idl.from_json(raw_idl)
    connection = AsyncClient(RPC_ENDPOINT_URL)
    provider = Provider(connection, Wallet(Keypair.generate()))
    program = Program(idl, ORCA_WHIRLPOOL_PROGRAM_ID, provider)

    # get whirlpool (one shot)
    whirlpool_pubkey = SOL_USDC_8_WHIRLPOOL_PUBKEY
    token_a_decimal = SOL_DECIMAL
    token_b_decimal = USDC_DECIMAL

    account_data = await connection.get_account_info(whirlpool_pubkey)
    print(account_data.value)

    whirlpool = program.coder.accounts.parse(account_data.value.data).data
    print("whirlpool token_mint_a", whirlpool.token_mint_a)
    print("whirlpool token_mint_b", whirlpool.token_mint_b)
    print("whirlpool tick_spacing", whirlpool.tick_spacing)
    print("whirlpool tick_current_index", whirlpool.tick_current_index)
    print("whirlpool sqrt_price", whirlpool.sqrt_price)
    price = PriceMath.sqrt_price_x64_to_price(whirlpool.sqrt_price, token_a_decimal, token_b_decimal)
    print("whirlpool price", to_fixed(price, token_b_decimal))

    # with websocket
    async with connect(RPC_WS_ENDPOINT_URL) as websocket:
        await websocket.account_subscribe(whirlpool_pubkey, encoding="base64")
        first_resp = await websocket.recv()
        subscription_id = first_resp[0].result
        async for idx, msg in enumerate(websocket):
            if idx == 10:
                break

            slot = msg[0].result.context.slot
            data = msg[0].result.value.data

            whirlpool = program.coder.accounts.parse(data).data
            price = PriceMath.sqrt_price_x64_to_price(whirlpool.sqrt_price, token_a_decimal, token_b_decimal)
            print("whirlpool price", to_fixed(price, token_b_decimal), "@slot", slot)

        await websocket.account_unsubscribe(subscription_id)

asyncio.run(main())

"""
SAMPLE OUTPUT:

$ python whirlpool_monitoring.py
Account { lamports: 5435760, data.len: 653, owner: whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc, executable: false, rent_epoch: 361, data: 3f95d10ce180630913e441f83913ca68b0634fb025fdeaa88737e84110d1255e357b3377ddee1ccdff08000800f4012c01abcc77649884000000000000000000 }
whirlpool token_mint_a So11111111111111111111111111111111111111112
whirlpool token_mint_b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
whirlpool tick_spacing 8
whirlpool tick_current_index -37847
whirlpool sqrt_price 2780551521206535680
whirlpool price 22.720739
whirlpool price 22.724055 @slot 184074714
whirlpool price 22.729784 @slot 184074714
whirlpool price 22.731593 @slot 184074714
whirlpool price 22.731593 @slot 184074716
whirlpool price 22.732799 @slot 184074724
whirlpool price 22.732799 @slot 184074728
whirlpool price 22.732802 @slot 184074732
whirlpool price 22.732761 @slot 184074734
whirlpool price 22.732757 @slot 184074736
whirlpool price 22.743610 @slot 184074736
"""
