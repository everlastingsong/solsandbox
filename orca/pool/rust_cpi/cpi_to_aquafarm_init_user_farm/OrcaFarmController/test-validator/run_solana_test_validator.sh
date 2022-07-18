#!/bin/bash

solana-test-validator \
  --account     ABmFqgfvQjjU8uBkZL2KdH5AvYEMsuddtdvpm4s62Pzq SHDW_USDC_AQ_GLOBAL_FARM_STATE_ABmFqgfvQjjU8uBkZL2KdH5AvYEMsuddtdvpm4s62Pzq.json \
  --bpf-program 82yxjeMsvaURa4MbZZ7WZZHfobirZYkH1zF8fmeGtyaQ ORCA_AQFARM_82yxjeMsvaURa4MbZZ7WZZHfobirZYkH1zF8fmeGtyaQ.so \
  --bpf-program 8AFYzgM2eostiQwAgUM6BZwqED53UDDZTYikDhL8sZh4 ../target/deploy/orca_farm_controller.so \
  --reset
