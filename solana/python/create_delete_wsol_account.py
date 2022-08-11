from solana.keypair import Keypair
from solana.publickey import PublicKey
from solana.rpc.commitment import Confirmed
from solana.rpc.api import Client
from solana.transaction import TransactionInstruction, Transaction
from solana import system_program
from spl.token.constants import TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT, ACCOUNT_LEN
from spl.token import instructions as token_program
import json
import math

RPC_ENDPOINT_URL = "https://api.devnet.solana.com"
WALLET_JSON = "dev_wallet.json"

def load_keypair_from_jsonfile(path: str) -> Keypair:
    raw_json = json.load(open(path, 'r'))
    return Keypair.from_secret_key(bytes(raw_json))

def ui_amount_to_u64(amount: float, decimals: int) -> int:
    return math.floor(amount * 10**decimals)

def prepare_wsol_token_account_instructions(
    connection: Client,
    funder: Keypair,
    owner: PublicKey,
    lamports: int,
) -> (Keypair, list[TransactionInstruction], list[TransactionInstruction]):
    wsol_token_account = Keypair.generate()
    rent_lamports = int(connection.get_minimum_balance_for_rent_exemption(ACCOUNT_LEN)["result"])

    create_account_ix = system_program.create_account(system_program.CreateAccountParams(
        from_pubkey=funder.public_key,
        new_account_pubkey=wsol_token_account.public_key,
        lamports=rent_lamports + lamports,
        space=ACCOUNT_LEN,
        program_id=TOKEN_PROGRAM_ID))

    initialize_account_ix = token_program.initialize_account(token_program.InitializeAccountParams(
        program_id=TOKEN_PROGRAM_ID,
        account=wsol_token_account.public_key,
        mint=WRAPPED_SOL_MINT,
        owner=owner))

    close_account_ix = token_program.close_account(token_program.CloseAccountParams(
        program_id=TOKEN_PROGRAM_ID,
        account=wsol_token_account.public_key,
        dest=owner,
        owner=owner,
        signers=[]))

    return (
        wsol_token_account,
        [create_account_ix, initialize_account_ix],  # create instructions
        [close_account_ix],  # delete instructions
    )

def main():
    wallet = load_keypair_from_jsonfile(WALLET_JSON)
    connection = Client(RPC_ENDPOINT_URL)
    print("wallet pubkey", wallet.public_key.to_base58())
    print("endpoint", RPC_ENDPOINT_URL)

    wrapping_lamports = ui_amount_to_u64(0.01, 9)
    print("wrapping lamports", wrapping_lamports)

    # get temporary WSOL token account and instructions for creation & deletion
    #
    # [memo] 11 Aug, 2022
    # solana-py's spl.token.client.Token.create_wrapped_native_account doesn't work!!
    # it doesn't set fee_payer of transaction explicitly, and so temporary account is treated as fee payer.
    # as a result, "Attempt to debit an account but found no record of a prior credit" error occurred.
    wsol_token_account_keypair, create_ixs, delete_ixs = prepare_wsol_token_account_instructions(
        connection=connection,
        funder=wallet,
        owner=wallet.public_key,
        lamports=wrapping_lamports)
    print("wsol token account address", wsol_token_account_keypair.public_key.to_base58())

    # build tx
    tx = Transaction(fee_payer=wallet.public_key)
    tx.add(*create_ixs)
    # add some instructions using wsol_token_account
    tx.add(*delete_ixs)
    signers = [wallet, wsol_token_account_keypair]

    # execute tx
    signature = connection.send_transaction(tx, *signers)["result"]
    print("signature", signature)
    connection.confirm_transaction(signature, Confirmed)
    print("confirmed")

if __name__ == '__main__':
    main()

"""
SAMPLE OUTPUT:

create_delete_wsol_account.py
wallet pubkey b'CzrJVwWQSb2dnzAEPYjKYXnPtCHxp8rajWyxrCkzCXWK'
endpoint https://api.devnet.solana.com
wrapping lamports 10000000
wsol token account address b'3st3QZcHJueWS7YXdc74frZSmxEPneDDpkfJeBpyT8Kd'
signature 5iXMkLyEFKrqQogSAsHnC6WQya6aWbfHTTtRSynBZfCGAgiSD8pzxSBxw1toiWWJiVimaYPuePxua9iehuPhEm3M
confirmed

SOLSCAN:

https://solscan.io/tx/5iXMkLyEFKrqQogSAsHnC6WQya6aWbfHTTtRSynBZfCGAgiSD8pzxSBxw1toiWWJiVimaYPuePxua9iehuPhEm3M?cluster=devnet

"""