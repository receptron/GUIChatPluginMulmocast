export const TOOL_NAME = "showPresentation";

export const TOOL_DEFINITION = {
  type: "function" as const,
  name: TOOL_NAME,
  description:
    "Let MulmoCast to process a given MulmoScript to generate a presentation of a given topic or story.",
  parameters: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "The title of the presentation" },
      lang: {
        type: "string",
        description: "The language of the presentation, such as en, ja, etc.",
      },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description:
                "The text to be spoken by the presenter, which is also used to generate an image if there is no imagePrompt. Typically 50 to 70 words.",
            },
            imagePrompt: {
              type: "string",
              description:
                "Optional prompt to be used to generate an image. Typically 50 to 70 words. Do not specify the image style.",
            },
          },
          required: ["text"],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ["title", "lang", "beats"],
    additionalProperties: false,
  },
};
