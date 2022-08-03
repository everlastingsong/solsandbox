#!/bin/bash

TARGET_PUBKEY=$1
SOLSCAN_GET_DELAY=1

echo "TARGET: $TARGET_PUBKEY"
mkdir -p $TARGET_PUBKEY

# get All transactions
solana transaction-history -u m $TARGET_PUBKEY | grep -v 'transactions found' > $TARGET_PUBKEY/transactions.txt
count=$(wc -l $TARGET_PUBKEY/transactions.txt)
echo "$count transactions"

# get transaction log using Solscan API
counter=0
for signature in $(cat $TARGET_PUBKEY/transactions.txt)
do
    counter=$((counter+1))
    filename=$(printf "%05d_%s.txt" $counter $signature)

    echo "$filename..."
    curl --silent https://public-api.solscan.io/transaction/$signature | jq > $TARGET_PUBKEY/$filename
    sleep $SOLSCAN_GET_DELAY
done
