import { Buffer } from "buffer";
import { sha256 } from "js-sha256";
import { snakeCase } from "snake-case";

const SIGHASH_GLOBAL_NAMESPACE = "global";

// https://github.com/coral-xyz/anchor/blob/master/ts/src/coder/borsh/instruction.ts#L388
function sighash(nameSpace: string, ixName: string): Buffer {
  let name = snakeCase(ixName);
  let preimage = `${nameSpace}:${name}`;
  return Buffer.from(sha256.digest(preimage)).slice(0, 8);
}

function main() {
  // sample: openPositionWithMetadata
  const instruction = "openPositionWithMetadata";
  const sig = sighash(SIGHASH_GLOBAL_NAMESPACE, instruction);
  console.log("instruction code:", sig.toString('hex')); // f21d86303a6e0e3c
}

main();

// ts-node src/get_anchor_instruction_code.ts

// https://solscan.io/tx/3deYeJtH3dWAtcWYE6AszuGCJXA1hrb2VWi2amdUWQzZk3BHZ7da5RpqLE2hhNE36DhvEkpLuxr5RwtGnFzQ2YZt
// #1 - OpenPositionWithMetadata
// Instruction Data: f21d86303a6e0e3cfefdb9fdffff6efeffff
//                   ^^^^^^^^^^^^^^^^
