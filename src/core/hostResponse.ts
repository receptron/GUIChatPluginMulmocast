export interface GeneratedImageResponse {
  success: boolean;
  imageData?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

export const isGeneratedImageResponse = (
  value: unknown,
): value is GeneratedImageResponse =>
  isRecord(value) &&
  typeof value.success === "boolean" &&
  isOptionalString(value.imageData);

/** `loadBlankImageBase64` returns the reference image; anything else is "no reference". */
export const readBlankImageBase64 = (value: unknown): string =>
  typeof value === "string" ? value : "";
