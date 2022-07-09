import { Connection } from "@solana/web3.js";
import { ORCA_TOKEN_SWAP_ID } from "@orca-so/sdk";

const RPC_ENDPOINT_URL = "https://ssc-dao.genesysgo.net";

const commitment = 'confirmed';
const connection = new Connection(RPC_ENDPOINT_URL, commitment);

async function main() {
  const limit = 10;

  const signature_jsons = await connection.getSignaturesForAddress(ORCA_TOKEN_SWAP_ID, {limit: limit});
  const signatures = signature_jsons.map((s) => s.signature);

  const txlogs = await connection.getParsedTransactions(signatures)
  const msgs = txlogs.map((tx) => tx.transaction.message);
  const logs = txlogs.map((tx) => tx.meta.logMessages);

  for (let i=0; i<msgs.length; i++) {
    const ixs = msgs[i].instructions;
    let orca_token_swap_executed = false;
    for (let j=0; j<ixs.length; j++) {
      if ( ixs[j].programId.toBase58() === ORCA_TOKEN_SWAP_ID.toBase58() )
        orca_token_swap_executed = true;
    }

    console.log(signatures[i], ":", orca_token_swap_executed);
    if ( orca_token_swap_executed )
      console.log(logs[i]);
  }
}

main();

/*
OUTPUT SAMPLE:

38hBNsxQ2bMNwtutAw8nedn9FCWeahHZu2cs6zjYY4Di1LNYjRX2fYKZ7eX8Xd22FuP38FKGmmAYB6XggXnrvi4T : false
5YeQJCwC8b2UFvYUxsaZuLPqUjzy19ELCfWvDZaJ8RaZdaJMrRndqAb2N2L4qzLdoCbG2RvAVQxxjbSUHgqVYwPW : false
5Q6PCGGPpUiGhBkdaFvq6XYj7d3RzhJQuXDWf46aetXMrxqiRZvFoGD3wLa8JCYjSe9gn1YgEPH5kUQFN1TwaPH6 : false
4BXS7oZgjNHVjyj5r78coo4C87CdQrf95gDUThHxohqm6416p99vcDgNoYYsYxzd3S4osfk8cq3bT8G9y58U5wSF : false
5FGbAFmUk98NissTeyZBUpQQA19g1nh6bhcmk6VzwfsaVTkXUSTzj2zNbPHzFCjBQkUjLJozKZwH8BHJgVWQ4MHG : true
[
  'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [1]',
  'Program log: Transfer 2039280 lamports to the associated token account',
  'Program 11111111111111111111111111111111 invoke [2]',
  'Program 11111111111111111111111111111111 success',
  'Program log: Allocate space for the associated token account',
  'Program 11111111111111111111111111111111 invoke [2]',
  'Program 11111111111111111111111111111111 success',
  'Program log: Assign the associated token account to the SPL Token program',
  'Program 11111111111111111111111111111111 invoke [2]',
  'Program 11111111111111111111111111111111 success',
  'Program log: Initialize the associated token account',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: InitializeAccount',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3297 of 179574 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL consumed 24372 of 200000 compute units',
  'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: Approve',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2024 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP invoke [1]',
  'Program log: Instruction: Swap',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: Transfer',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2781 of 181220 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: MintTo',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2517 of 147008 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: Transfer',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2643 of 141533 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP consumed 61741 of 200000 compute units',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: Revoke',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1640 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success'
]
3fZdsJa9wFZimB8ZQ9ZUbRTdjZKjkQdnSPd7SWu5jtrn7FHvq2FymDJQRFCwzc5RAYw3zuZKAtHZaEZtnAoacTL7 : false
bawwvRSPGf1P4P234EAb12xDxiB3gPwVjZBby6FLa9G2wNmRGVhU2yN6pCwyLRDxumxZtoJbxHZjUaYXJdoLmYx : true
[
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: Approve',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2024 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP invoke [1]',
  'Program log: Instruction: Swap',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: Transfer',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2781 of 181208 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: MintTo',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2517 of 147005 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: Transfer',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2643 of 141530 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP consumed 61744 of 200000 compute units',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: Revoke',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1640 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 11111111111111111111111111111111 invoke [1]',
  'Program 11111111111111111111111111111111 success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: InitializeAccount',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3392 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: Approve',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2024 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP invoke [1]',
  'Program log: Instruction: Swap',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: Transfer',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2712 of 181280 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: MintTo',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2517 of 147135 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
  'Program log: Instruction: Transfer',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2755 of 141660 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP consumed 61726 of 200000 compute units',
  'Program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: Revoke',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1616 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  'Program log: Instruction: CloseAccount',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1713 of 200000 compute units',
  'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success'
]
4XPbcfu5Q4BX83EiMWcjTXuLJZX4BQpQQY18Y4rPxzofkP6UTUywr9CsMm3hvjMzbvncxScDtKztVNZq8FqfMY63 : false
4HgRN4619TCNheqr2GnPjoXa821d7KeeehgNmevL3DALUwLHLm5CyCuQ1cHBKSybkqSUcmbBYtrfVcCdwn2BVJDG : false
3ofJnJCBNmv1w4Pe916RPMQhrxHTTTTigo1t71fWzwvX4aAA9wgBAVwXRXPsQL187Enko36KW5aQBi7YMLtxgCFZ : false

*/
