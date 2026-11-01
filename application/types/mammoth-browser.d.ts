declare module "mammoth/mammoth.browser" {
  export type Message = {
    type: "warning" | "error" | "info";
    message: string;
  };

  export type Result = {
    value: string;
    messages: Message[];
  };

  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<Result>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };

  export default mammoth;
}
