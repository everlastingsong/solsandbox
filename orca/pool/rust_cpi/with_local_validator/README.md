
# cloning ORCA/SOL pool related accounts

## reference transaction
We will picked up required accounts from this transaction.

This transaction is swapping 0.001 SOL for some ORCA in mainnet-beta.

https://explorer.solana.com/tx/4ccWcK7JU77kyankbsDLXsE3kbtAvcrjGKZJMub1d2pQG8a3MZW39urdHNfBdL3sJRDL7zKjDbqFYcfbhsypRsDR

## account list
We can found the following accounts in Account Input(s) section.

- r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
- 5cy988WxSDjjGyY27H4AnTMuLkZHtLwR2hxw25aYEEVg
- 32VpB8H6bEm9nB62csJB6o2SqgA6QGcBvfrKS7iXXheV
- 2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25
- 4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras
- 73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4
- 7B8yNHX62NLvRswD86ttbGcV5TYxUsDNxEg2ZRMZLPRt
- AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z
- 11111111111111111111111111111111 (System Program)
- 2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm
- 2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr
- 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP (Orca Swap Program v2)
- ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (Associated Token Program)
- orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE (ORCA)
- So11111111111111111111111111111111111111112 (wSOL)
- SysvarRent111111111111111111111111111111111 (Sysvar: Rent)
- TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA (Token Program)

We don't need to clone the following accounts.
Of course it is no effect if these accounts are cloned.

### r21Gamwd9DtyjHeGywsneoQYR39C1VDwrw7tWxHAwh6
This is my wallet account. you need to use your wallet!

### 5cy988WxSDjjGyY27H4AnTMuLkZHtLwR2hxw25aYEEVg
This is temporary WSOL token account. (temporary)

### 32VpB8H6bEm9nB62csJB6o2SqgA6QGcBvfrKS7iXXheV
This is temporary delegated account. (temporary)

### 7B8yNHX62NLvRswD86ttbGcV5TYxUsDNxEg2ZRMZLPRt
This is my token account for Orca. you need to use your account!

### Essential accounts
solana-test-validator create these accounts at startup.

so We don't need to import these accounts.
- 11111111111111111111111111111111 (System Program)
- ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (Associated Token Program)
- So11111111111111111111111111111111111111112 (wSOL)
- SysvarRent111111111111111111111111111111111 (Sysvar)
- TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA (Token Program)

As a result, we need to import the following accounts.

- 2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25
- 4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras
- 73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4
- AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z
- 2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm
- 2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr
- orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE (ORCA)
- 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP (Orca Swap Program v2)

In fact, these accounts can be found at the definition of ORCA/SOL pool in typescript-SDK.

### Orca Swap Program v2
https://github.com/orca-so/typescript-sdk/blob/main/src/public/utils/constants.ts#L4

### ORCA/SOL pool specific accounts
https://github.com/orca-so/typescript-sdk/blob/main/src/constants/pools.ts#L411

### Orca token
https://github.com/orca-so/typescript-sdk/blob/main/src/constants/tokens.ts#L368

## Get accounts and program from mainnet
### reference
https://solanacookbook.com/references/local-development.html#using-mainnet-accounts-and-programs
- How to load programs from mainnet
- How to load accounts from mainnet

### Get accounts and program
The following commands are saved as get_accounts_and_program.sh

#### Get accounts
solana account -u m --output json-compact --output-file orcasol_2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25.json 2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25

solana account -u m --output json-compact --output-file orcasol_4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras.json 4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras

solana account -u m --output json-compact --output-file orcasol_73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4.json 73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4

solana account -u m --output json-compact --output-file orcasol_AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z.json AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z

solana account -u m --output json-compact --output-file orcasol_2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm.json 2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm

solana account -u m --output json-compact --output-file orcasol_2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr.json 2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr

solana account -u m --output json-compact --output-file orca_orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE.json orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE

#### Get program
solana program dump -u m 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP orca_swap_v2_9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP.so

## Start solana-test-validator with accounts and program

--reset is optional

The following command is saved as start_solana_test_validator_with_accounts_and_program.sh

solana-test-validator \\<br>
  --account     2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25 orcasol_2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25.json \\<br>
  --account     4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras orcasol_4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras.json \\<br>
  --account     73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4 orcasol_73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4.json \\<br>
  --account     AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z orcasol_AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z.json \\<br>
  --account     2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm orcasol_2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm.json \\<br>
  --account     2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr orcasol_2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr.json \\<br>
  --account     orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE orca_orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE.json \\<br>
  --bpf-program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP orca_swap_v2_9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP.so \\<br>
  --reset

## Swap SOL for Orca at solana-test-validator
ts-node swap_sol2orca.ts

#### check
you can see the transaction log at solana explorer.
(Select Custom RPC URL)

https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899
