#!/bin/bash

mkdir -p test
pushd test

solana account -u m --output json-compact --output-file orcasol_2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25.json 2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25
solana account -u m --output json-compact --output-file orcasol_4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras.json 4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras
solana account -u m --output json-compact --output-file orcasol_73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4.json 73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4
solana account -u m --output json-compact --output-file orcasol_AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z.json AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z
solana account -u m --output json-compact --output-file orcasol_2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm.json 2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm
solana account -u m --output json-compact --output-file orcasol_2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr.json 2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr
solana account -u m --output json-compact --output-file orca_orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE.json orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE

solana program dump -u m 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP orca_swap_v2_9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP.so

ls -l
