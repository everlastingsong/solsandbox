import { Keypair, Connection } from '@solana/web3.js';
import { getOrca, OrcaPoolConfig, OrcaFarmConfig, Network } from '@orca-so/sdk';
import { OrcaFarmImpl } from '@orca-so/sdk/dist/model/orca/farm/orca-farm'
import { ethSolDoubleDip } from '@orca-so/sdk/dist/constants/devnet/farms'
import Decimal from 'decimal.js';

// MY WALLET SETTING
const id_json_path = require('os').homedir() + "/.config/solana/id2.json";
const secret = Uint8Array.from(JSON.parse(require("fs").readFileSync(id_json_path)));
const wallet = Keypair.fromSecretKey(secret as Uint8Array);

async function main() {
    console.log("wallet", wallet.publicKey.toBase58());
    const owner = wallet;

    // 2. Initialzie Orca object with mainnet connection
    const connection = new Connection("https://api.devnet.solana.com", "singleGossip");
    const orca = getOrca(connection, Network.DEVNET);

    /*** Swap ***/
    // 3. We will be swapping 0.1 SOL for some ETH
    const ethSolPool = orca.getPool(OrcaPoolConfig.ETH_SOL);
    const solToken = ethSolPool.getTokenB();
    const solAmount = new Decimal(0.1);
    const quote = await ethSolPool.getQuote(solToken, solAmount);
    const ethAmount = quote.getMinOutputAmount();

    console.log(`Swap ${solAmount.toString()} SOL for at least ${ethAmount.toNumber()} ETH`);
    const swapPayload = await ethSolPool.swap(owner, solToken, solAmount, ethAmount);
    const swapTxId = await swapPayload.execute();
    console.log("Swapped:", swapTxId, "\n");

    /*** Pool Deposit ***/
    // 4. Deposit SOL and ETH for LP token
    const { maxTokenAIn, maxTokenBIn, minPoolTokenAmountOut } = await ethSolPool.getDepositQuote(
      ethAmount,
      solAmount
    );

    console.log(
      `Deposit at most ${maxTokenBIn.toNumber()} SOL and ${maxTokenAIn.toNumber()} ETH, for at least ${minPoolTokenAmountOut.toNumber()} LP tokens`
    );
    const poolDepositPayload = await ethSolPool.deposit(
      owner,
      maxTokenAIn,
      maxTokenBIn,
      minPoolTokenAmountOut
    );
    const poolDepositTxId = await poolDepositPayload.execute();
    console.log("Pool deposited:", poolDepositTxId, "\n");

    /*** Farm Deposit ***/
    // 5. Deposit some ORCA_ETH LP token for farm token
    const lpBalance = await ethSolPool.getLPBalance(owner.publicKey);
    const ethSolFarm = orca.getFarm(OrcaFarmConfig.ETH_SOL_AQ);
    const farmDepositPayload = await ethSolFarm.deposit(owner, lpBalance);
    const farmDepositTxId = await farmDepositPayload.execute();
    console.log("Farm deposited:", farmDepositTxId, "\n");
    // Note 1: for double dip, repeat step 5 but with the double dip farm
    // Note 2: to harvest reward, orcaSolFarm.harvest(owner)
    // Note 3: to get harvestable reward amount, orcaSolFarm.getHarvestableAmount(owner.publicKey)

    const farmBalance = await ethSolFarm.getFarmBalance(owner.publicKey);
    const ethSolDDFarm = new OrcaFarmImpl(connection, ethSolDoubleDip); // should be orca.getFarm(OrcaFarmConfig.ETH_SOL_DD) but ETH_SOL is not defined at OrcaFarmConfig...
    const farmDDDepositPayload = await ethSolDDFarm.deposit(owner, farmBalance);
    const farmDDDepositTxId = await farmDDDepositPayload.execute();
    console.log("Farm(DD) deposited:", farmDDDepositTxId, "\n");
	
}

main();
