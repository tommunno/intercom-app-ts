export type MatrixPortType = "USER" | "SOUNDCARD";

export function dataIsMatrixPortType(data: unknown): data is MatrixPortType {
  return data === "USER" || data === "SOUNDCARD";
}
