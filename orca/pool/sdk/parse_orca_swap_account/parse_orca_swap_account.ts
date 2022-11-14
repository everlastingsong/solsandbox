import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Network, OrcaToken, Percentage } from '@orca-so/sdk';
import { btcToken, ethToken, usdcToken, solToken, usdtToken } from '@orca-so/sdk/dist/constants/tokens'
import { CurveType, OrcaPoolParams } from '@orca-so/sdk/dist/model/orca/pool/pool-types'
import { OrcaPoolImpl } from '@orca-so/sdk/dist/model/orca/pool/orca-pool';
import assert from "assert";

const RPC_ENDPOINT_URL = "https://api.mainnet-beta.solana.com";

const ORCA_TOKEN_SWAP_V1_ID = new PublicKey("DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1");
const ORCA_TOKEN_SWAP_V2_ID = new PublicKey("9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP");

const V1_BTC_ETH_POOL = new PublicKey("Fz6yRGsNiXK7hVu4D2zvbwNXW8FQvyJ5edacs3piR1P7");
const V2_SOL_USDC_POOL = new PublicKey("EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U");
const V2_USDC_USDT_POOL = new PublicKey("F13xvvx45jVGd84ynK3c8T89UejQVxjCLtmHfPmAXAHP");

async function parse_orca_swap_account(
  connection: Connection,
  address: PublicKey,
  token_a: OrcaToken,
  token_b: OrcaToken,
  swap_program: PublicKey,
  stable: boolean,
): Promise<OrcaPoolParams> {
  const data = (await connection.getAccountInfo(address)).data;
  assert(data.length === 324, "data length must be 324");

  const data_view = new DataView(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));

  // skip first 2 byte
  let offset = 2;
  const nonce = data_view.getUint8(offset);
  offset += 1;
  const token_program = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const token_a_vault = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const token_b_vault = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const pool_token_mint = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const token_a_mint = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const token_b_mint = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const fee_account = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const trader_fee_num = Number(data_view.getBigUint64(offset, true /* little endian */));
  offset += 8;
  const trader_fee_denom = Number(data_view.getBigUint64(offset, true /* little endian */));
  offset += 8;
  const owner_fee_num = Number(data_view.getBigUint64(offset, true /* little endian */));
  offset += 8;
  const owner_fee_denom = Number(data_view.getBigUint64(offset, true /* little endian */));
  offset += 8;
  // skip owner_withdraw_fee and host_fee (Orca doesn't use these fees)
  offset += 8*4
  const curve_type = data_view.getUint8(offset);
  offset += 1;
  const stable_amp = Number(data_view.getBigUint64(offset, true /* little endian */));
  offset += 8;

  assert(token_program.toBase58() === TOKEN_PROGRAM_ID.toBase58(), "token_program not found");
  assert(token_a_mint.toBase58() === token_a.mint.toBase58(), "token_a not found");
  assert(token_b_mint.toBase58() === token_b.mint.toBase58(), "token_b not found");
  assert(curve_type === (stable ? 2 : 0), "curve_type unmatch")

  const authority_pda = PublicKey.findProgramAddressSync([address.toBuffer()], swap_program);
  assert(authority_pda[1] === nonce, "nonce unmatch");

  let params: OrcaPoolParams = Object.freeze({
    address: address,
    nonce: nonce,
    authority: authority_pda[0],
    poolTokenMint: pool_token_mint,
    poolTokenDecimals: 6,
    feeAccount: fee_account,
    tokenIds: [token_a.mint.toString(), token_b.mint.toString()],
    tokens: {
      [token_a.mint.toString()]: { ...token_a, addr: token_a_vault },
      [token_b.mint.toString()]: { ...token_b, addr: token_b_vault },
    },
    curveType: CurveType.ConstantProduct,
    feeStructure: {
      // V1 account's owner_fee_denom seems to be 0, adjust to avoid 0 div error.
      traderFee: Percentage.fromFraction(trader_fee_num, trader_fee_denom === 0 ? 10000 : trader_fee_denom),
      ownerFee: Percentage.fromFraction(owner_fee_num, owner_fee_denom === 0 ? 10000 : owner_fee_denom),
    },
  });

  // overwrite if stable
  if (stable) {
    params = Object.freeze({
      ...params,
      curveType: CurveType.Stable,
      amp: stable_amp,
    })
  }

  return params;
}

function create_pool_from_orca_pool_params(connection: Connection, network: Network, params: OrcaPoolParams): OrcaPoolImpl {
  return new OrcaPoolImpl(connection, network, params);
}

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
  
  const v1_btc_eth_pool_params = await parse_orca_swap_account(connection, V1_BTC_ETH_POOL, btcToken, ethToken, ORCA_TOKEN_SWAP_V1_ID, false);
  const v1_btc_eth_pool = create_pool_from_orca_pool_params(connection, Network.MAINNET, v1_btc_eth_pool_params);
  console.log(v1_btc_eth_pool_params);

  const v2_sol_usdc_pool_params = await parse_orca_swap_account(connection, V2_SOL_USDC_POOL, solToken, usdcToken, ORCA_TOKEN_SWAP_V2_ID, false);
  const v2_sol_usdc_pool = create_pool_from_orca_pool_params(connection, Network.MAINNET, v2_sol_usdc_pool_params);
  console.log(v2_sol_usdc_pool_params);

  const v2_usdc_usdt_pool_params = await parse_orca_swap_account(connection, V2_USDC_USDT_POOL, usdcToken, usdtToken, ORCA_TOKEN_SWAP_V2_ID, true);
  const v2_usdc_usdt_pool = create_pool_from_orca_pool_params(connection, Network.MAINNET, v2_usdc_usdt_pool_params);
  console.log(v2_usdc_usdt_pool_params);
}

main();

/*

SAMPLE OUTPUT:

$ ts-node app/src/parse_orca_swap_account.ts 
{
  address: PublicKey {
    _bn: <BN: dea479fa636244d54cff06d54a43584b331843229cfa5f45c7870ce43a809732>
  },
  nonce: 255,
  authority: PublicKey {
    _bn: <BN: dae1b5c89db321eef4158a1c7b9875b07736da9032834407c34b582e33f8c5a2>
  },
  poolTokenMint: PublicKey {
    _bn: <BN: 741d005b5918ad8b00cd72e0d6730439cf7c9d3a3f89805fd3dc4e74d073cb9f>
  },
  poolTokenDecimals: 6,
  feeAccount: PublicKey {
    _bn: <BN: 3cc6c91d40024bfbd4cb98864dbf7d7cee9452fce0bb4b19492547fb93b8ecb0>
  },
  tokenIds: [
    '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk'
  ],
  tokens: {
    '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': {
      tag: 'BTC',
      name: 'Bitcoin',
      mint: [PublicKey],
      scale: 6,
      addr: [PublicKey]
    },
    '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk': {
      tag: 'ETH',
      name: 'Ethereum',
      mint: [PublicKey],
      scale: 6,
      addr: [PublicKey]
    }
  },
  curveType: 0,
  feeStructure: {
    traderFee: Percentage {
      toString: [Function (anonymous)],
      numerator: <BN: 1e>,
      denominator: <BN: 2710>
    },
    ownerFee: Percentage {
      toString: [Function (anonymous)],
      numerator: <BN: 0>,
      denominator: <BN: 2710>
    }
  }
}

{
  address: PublicKey {
    _bn: <BN: c523f583f96ed4fdbd8ade165f8dfe5533c10fa021a22a3f31e54adc02031661>
  },
  nonce: 252,
  authority: PublicKey {
    _bn: <BN: 4798dce15306e485502448ae418831ba6a76b92956377a6eb7e058e5e011e54>
  },
  poolTokenMint: PublicKey {
    _bn: <BN: 8b69cf47f17b6ab36eb9dcac947bbaf6666e8c2b597b8a25861babfd6216ce2a>
  },
  poolTokenDecimals: 6,
  feeAccount: PublicKey {
    _bn: <BN: 6c9010bb7b7cc2bfc144a74aa59f3b28a1368c87c352012c8d37eb4045d20e0a>
  },
  tokenIds: [
    'So11111111111111111111111111111111111111112',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ],
  tokens: {
    So11111111111111111111111111111111111111112: {
      tag: 'SOL',
      name: 'Solana',
      mint: [PublicKey],
      scale: 9,
      addr: [PublicKey]
    },
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
      tag: 'USDC',
      name: 'USD Coin',
      mint: [PublicKey],
      scale: 6,
      addr: [PublicKey]
    }
  },
  curveType: 0,
  feeStructure: {
    traderFee: Percentage {
      toString: [Function (anonymous)],
      numerator: <BN: 19>,
      denominator: <BN: 2710>
    },
    ownerFee: Percentage {
      toString: [Function (anonymous)],
      numerator: <BN: 5>,
      denominator: <BN: 2710>
    }
  }
}

{
  address: PublicKey {
    _bn: <BN: d006f7fe2a896dbc7567af2df67481f5f488606a48ae92a9dcceb86fefa50c3a>
  },
  nonce: 255,
  authority: PublicKey {
    _bn: <BN: 26bffa940fa09160969601143c1e2611f5969aa5631f3567a7d8dc410d2af4b7>
  },
  poolTokenMint: PublicKey {
    _bn: <BN: ee387e29c2868bc7a0a1c2c79e42f965d366ccbd47a0323b503d099984f46bae>
  },
  poolTokenDecimals: 6,
  feeAccount: PublicKey {
    _bn: <BN: 95752d33f5f652232ccdf76ffe8449df3155609c879bbec763c8baf3a6d66cc4>
  },
  tokenIds: [
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  ],
  tokens: {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
      tag: 'USDC',
      name: 'USD Coin',
      mint: [PublicKey],
      scale: 6,
      addr: [PublicKey]
    },
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
      tag: 'USDT',
      name: 'Tether USD',
      mint: [PublicKey],
      scale: 6,
      addr: [PublicKey]
    }
  },
  curveType: 2,
  feeStructure: {
    traderFee: Percentage {
      toString: [Function (anonymous)],
      numerator: <BN: 6>,
      denominator: <BN: 2710>
    },
    ownerFee: Percentage {
      toString: [Function (anonymous)],
      numerator: <BN: 1>,
      denominator: <BN: 2710>
    }
  },
  amp: 100
}

*/
