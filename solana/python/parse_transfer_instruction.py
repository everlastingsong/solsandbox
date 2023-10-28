from enum import IntEnum
from typing import List
from solders.instruction import Instruction, AccountMeta
from solana.rpc.api import Client
from solana.transaction import Signature
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.token.instructions import InstructionType, decode_transfer, decode_transfer_checked
import solders
import base58

RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com"


def main():
    connection = Client(RPC_ENDPOINT_URL)

    # https://solana.fm/tx/HadZphETZ62rKTK2CYtZiqJrxHfNpfmP16bHYwJPxQaQbVdvDWxKuaA1dbRosNw88yJdNAMHkaxFkvE8NviMVC3?cluster=mainnet-solanafmbeta
    sample_tx_signature = "HadZphETZ62rKTK2CYtZiqJrxHfNpfmP16bHYwJPxQaQbVdvDWxKuaA1dbRosNw88yJdNAMHkaxFkvE8NviMVC3"

    tx = connection.get_transaction(
        tx_sig=Signature.from_string(sample_tx_signature),
        encoding="json",
        max_supported_transaction_version=0
    )
    print(tx)

    # solders.transaction_status.EncodedTransactionWithStatusMeta
    encoded_tx = tx.value.transaction

    # flatten all instructions
    all_ixs = flatten_instructions(encoded_tx)

    for ix in all_ixs:
        is_spl_token_transfer_ix = is_spl_token_transfer(ix)

        if is_spl_token_transfer_ix == IsSPLTokenTransfer.FALSE:
            pass
        elif is_spl_token_transfer_ix == IsSPLTokenTransfer.TRUE_TRANSFER:
            decoded = decode_transfer(ix)
            print("SPL Transfer", decoded.source, "=>", decoded.dest, "amount(u64)", decoded.amount)
        elif is_spl_token_transfer_ix == IsSPLTokenTransfer.TRUE_TRANSFER_CHECKED:
            decoded = decode_transfer_checked(ix)
            print("SPL Transfer (Checked)", decoded.source, "=>", decoded.dest, "amount(u64)", decoded.amount)


# see: https://kevinheavey.github.io/solders/api_reference/transaction_status.html
# see: https://kevinheavey.github.io/solders/api_reference/instruction.html
def flatten_instructions(tx: solders.transaction_status.EncodedTransactionWithStatusMeta) -> List[Instruction]:
    meta = tx.meta
    message = tx.transaction.message
    instructions = tx.transaction.message.instructions
    inner_instructions = meta.inner_instructions

    # build account list
    static_keys = message.account_keys
    writable_keys = meta.loaded_addresses.writable
    readonly_keys = meta.loaded_addresses.readonly
    keys = [*static_keys, *writable_keys, *readonly_keys]

    # flatten outer/inner instructions
    all_instructions: List[solders.transaction_status.UiCompiledInstruction] = []
    for outer_index, outer in enumerate(instructions):
        all_instructions.append(outer)
        for inner in inner_instructions:
            if inner.index == outer_index:
                all_instructions.extend(inner.instructions)

    # decode to Instruction type
    all_decoded_instructions: List[Instruction] = []
    for ix in all_instructions:
        # Pubkey to AccountMeta
        accounts = list(map(
            # we are not interested in is_signer, is_writable, so just set False...
            lambda i: AccountMeta(keys[i], is_signer=False, is_writable=False),
            ix.accounts
        ))

        all_decoded_instructions.append(Instruction(
            program_id=keys[ix.program_id_index],
            accounts=accounts,
            data=base58.b58decode(ix.data),
        ))

    return all_decoded_instructions


class IsSPLTokenTransfer(IntEnum):
    FALSE = 0
    TRUE_TRANSFER = 1
    TRUE_TRANSFER_CHECKED = 2


def is_spl_token_transfer(ix: Instruction) -> IsSPLTokenTransfer:
    if ix.program_id != TOKEN_PROGRAM_ID:
        return IsSPLTokenTransfer.FALSE

    if len(ix.data) == 0:
        return IsSPLTokenTransfer.FALSE
    # first byte of data indicate which instruction should be executed
    instruction_type = ix.data[0]

    if instruction_type == InstructionType.TRANSFER:
        return IsSPLTokenTransfer.TRUE_TRANSFER

    if instruction_type == InstructionType.TRANSFER2:
        return IsSPLTokenTransfer.TRUE_TRANSFER_CHECKED

    return IsSPLTokenTransfer.FALSE


if __name__ == '__main__':
    main()

"""
SAMPLE OUTPUT:

GetTransactionResp(Some(EncodedConfirmedTransactionWithStatusMeta { slot: 226386197, transaction: ...
SPL Transfer EJA9ZUmZBtkxJZaXCBWrc9hYEzpHEvvtEL1vRi9noPzk => ELFYDkPYWBopH5Msm2cbA2ueByCXEKpzKWanv1kZC9L2 amount(u64) 10000000
SPL Transfer 6Nij2pGdpgd6EutLAtdRwQoHaKKxhdNBi4zoLgd9Yuaq => 8LvzGcnKQba4Rd7JzUrbgMsaAxAauzzQANL2t8jCZp7D amount(u64) 317539751
SPL Transfer 8LvzGcnKQba4Rd7JzUrbgMsaAxAauzzQANL2t8jCZp7D => 9Hst4fTfQJXp1fxyVx1Lk1TubjNegFwXCedZkMRPaYAK amount(u64) 317539751
SPL Transfer E9Yi56MiTCwRdRXvjNcmq4Ba33p83vv6HvfirnbVcdq5 => E1EeZxTcCjPnHpYKFJYVKsyZecJfQvf8d2yBdCWGs5pg amount(u64) 277586384
SPL Transfer E1EeZxTcCjPnHpYKFJYVKsyZecJfQvf8d2yBdCWGs5pg => 4eXzAtWvA3XsXJxJ1GDi3zGc2ihsUCyJGDD5fxP7vABV amount(u64) 277586384
SPL Transfer BNhiDWTQj7bbfx5vJ5y6BEcQxtqnHMt3XqqvN19Hk5Ba => BSfy93XGsLj3918gyEkaNJbxfqLuVzHGpKP8TDHPr6BU amount(u64) 291666746
SPL Transfer BSfy93XGsLj3918gyEkaNJbxfqLuVzHGpKP8TDHPr6BU => 51yd5SUH4gT3nUJjfHsbtWvnyzjvuo9R8b5ijKQFdo8q amount(u64) 291666746
SPL Transfer DqQSi3tBRCRHtuZtWbpZZ5Qm4woYXSkQ3m7JrpLkodHY => 9z1BbfUSmQvRNsFwSyVtxMeaUfzkBHqsPiQ9R9WJsVoJ amount(u64) 1347
SPL Transfer 9z1BbfUSmQvRNsFwSyVtxMeaUfzkBHqsPiQ9R9WJsVoJ => Ha7m11rMs5nJfpTnB31X5kQBp2yRabfJS1KoxxReKZW1 amount(u64) 1347
SPL Transfer DXHkH9v97B9SgQ2meuRjPWDaMsGQ4QkNUauhvrS8HYha => EJA9ZUmZBtkxJZaXCBWrc9hYEzpHEvvtEL1vRi9noPzk amount(u64) 10002485

"""
