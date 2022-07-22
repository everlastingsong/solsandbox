#!/bin/bash

mkdir -p test
pushd test

solana-test-validator \
  --account     2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25 orcasol_2uVjAuRXavpM6h1scGQaxqb6HVaNRn6T2X7HHXTabz25.json \
  --account     4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras orcasol_4Zc4kQZhRQeGztihvcGSWezJE1k44kKEgPCAkdeBfras.json \
  --account     73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4 orcasol_73zdy95DynZP4exdpuXTDsexcrWbDJX9TFi2E6CDzXh4.json \
  --account     AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z orcasol_AioST8HKQJRqjE1mknk4Rydc8wVADhdQwRJmAAYX1T6Z.json \
  --account     2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm orcasol_2PH1quJj9MHQXATCmNZ6qQ2gZqM8R236DpKaz99ggVpm.json \
  --account     2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr orcasol_2ZnVuidTHpi5WWKUwFXauYGhvdT9jRKYv5MDahtbwtYr.json \
  --account     orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE orca_orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE.json \
  --bpf-program 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP orca_swap_v2_9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP.so \
  --reset
