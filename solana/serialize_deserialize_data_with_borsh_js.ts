import BN from "bn.js";
import { serialize, deserialize } from "borsh";

interface IPoint2D {
  x: number;
  y: number;
}

class Point2D {
  x: number;
  y: number;
  constructor(init: IPoint2D) { Object.assign(this, init); }
}

interface IInstructionXData {
  instruction: number[];
  data_u8: number;
  data_u32: number;
  data_u64: BN;
  data_str: String;
  data_u64_fixed_array: BN[];
  data_u64_array: BN[];
  data_struct_point: Point2D;
  data_option_str_1: String;
  data_option_str_2: String;
};

class InstructionXData implements IInstructionXData {
  instruction: number[];
  data_u8: number;
  data_u32: number;
  data_u64: BN;
  data_str: String;
  data_u64_fixed_array: BN[];
  data_u64_array: BN[];
  data_struct_point: Point2D;
  data_option_str_1: String;
  data_option_str_2: String;
  constructor(init: IInstructionXData) { Object.assign(this, init); }
}

function main() {
  // borsh js: https://www.npmjs.com/package/borsh

  const schema_point2d = {
    kind: "struct",
    fields: [
      ["x", "u32"],
      ["y", "u32"],
    ]
  };

  const schema_instruction_x_data = {
    kind: "struct",
    fields: [
      // [n] = ["u8", n]
      ["instruction", [8]],
      ["data_u8", "u8"],
      ["data_u32", "u32"],
      ["data_u64", "u64"],
      ["data_str", "string"],
      // fixed length array: [type, length]
      ["data_u64_fixed_array", ["u64", 2]],
      // variable length array: [type]
      ["data_u64_array", ["u64"]],
      ["data_struct_point", Point2D],
      ["data_option_str_1", {kind: "option", type: "string"}],
      ["data_option_str_2", {kind: "option", type: "string"}],
    ]
  };

  const schema = new Map<any, any>([
    [InstructionXData, schema_instruction_x_data],
    [Point2D, schema_point2d],
  ]);

  const x_data = new InstructionXData({
    instruction: [0x8, 0x7, 0x6, 0x5, 0x4, 0x3, 0x2, 0x1],
    data_u8: 0xAA,
    data_u32: 0xBBBBBBBB,
    data_u64: new BN(2).pow(new BN(64)).sub(new BN(1)), // 2^64 -1 (0xFFFFFFFFFFFFFFFF)
    data_str: "abcd",
    data_u64_fixed_array: [new BN(1), new BN(2)],
    data_u64_array: [new BN(1), new BN(2), new BN(3), new BN(4)],
    data_struct_point: new Point2D({x: 100, y: 200}),
    data_option_str_1: null, // deserialized as undefined
    data_option_str_2: "abcd",
  });
  console.log(x_data);

  const x_data_serialized = serialize(schema, x_data);
  console.log(x_data_serialized);

  const x_data_deserialized = deserialize(schema, InstructionXData, Buffer.from(x_data_serialized));
  console.log(x_data_deserialized);
}

main();
