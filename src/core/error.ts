/** 解析错误（RPC / 日志等路径共用） */
export type ParseError =
  | { kind: "InsufficientData"; expected: number; actual: number; context: string }
  | { kind: "InvalidDiscriminator"; expected?: Uint8Array; found: Uint8Array; context: string }
  | { kind: "Base64DecodeError"; context: string }
  | { kind: "InsufficientAccounts"; expected: number; actual: number; context: string }
  | { kind: "InvalidLogFormat"; reason: string }
  | { kind: "InvalidInstructionFormat"; reason: string }
  | { kind: "UnknownEventType"; discriminator: Uint8Array; program: string }
  | { kind: "UnsupportedProgram"; program_id: string }
  | { kind: "RpcError"; message: string }
  | { kind: "ConversionError"; message: string }
  | { kind: "MissingField"; field: string };

export function formatParseError(e: ParseError): string {
  switch (e.kind) {
    case "RpcError":
    case "ConversionError":
      return e.message;
    case "MissingField":
      return `缺少字段: ${e.field}`;
    case "InsufficientData":
      return `数据长度不足: 需要 ${e.expected} 字节，实际 ${e.actual} (${e.context})`;
    default:
      return JSON.stringify(e);
  }
}
