import type { ToolContext, ToolPluginCore } from "gui-chat-protocol";
import type { MulmoScript } from "mulmocast";
import { v4 as uuidv4 } from "uuid";
import type { MulmocastArgs, MulmocastToolData, MulmocastResult } from "./types";
import { TOOL_NAME, TOOL_DEFINITION } from "./definition";

export const showPresentation = async (
  context: ToolContext,
  args: MulmocastArgs,
): Promise<MulmocastResult> => {
  const { title, beats } = args;

  // Reference images for aspect ratio
  const blankImageBase64 = context.app?.loadBlankImageBase64
    ? await context.app.loadBlankImageBase64()
    : "";
  const imageRefs: string[] = blankImageBase64 ? [blankImageBase64] : [];

  // Generate beat objects with UUIDs first
  const beatsWithIds = beats.map((beat) => ({
    id: uuidv4(),
    speaker: "Presenter",
    text: beat.text,
    imagePrompt: beat.imagePrompt,
  }));

  // Generate images for each beat concurrently
  const imagesMap: Record<string, string> = {};

  if (context.app?.generateImageWithBackend) {
    const imagePromises = beatsWithIds.map(async (beat) => {
      const prompt =
        beat.imagePrompt ||
        `generate image appropriate for the text. <text>${beat.text}</text>. Let the art convey the story and emotions without text. Use the last image for the aspect ratio.`;

      try {
        const result = await context.app!.generateImageWithBackend!(
          prompt,
          imageRefs,
          context,
        );

        if (result.success && result.imageData) {
          return { id: beat.id, imageData: result.imageData };
        }
      } catch (error) {
        console.error("Failed to generate image for beat:", error);
      }
      return { id: beat.id, imageData: null };
    });

    const imageResults = await Promise.all(imagePromises);

    imageResults.forEach((result) => {
      if (result.imageData) {
        imagesMap[result.id] = result.imageData;
      }
    });
  }

  // Construct MulmoScript object
  const mulmoScript = {
    $mulmocast: { version: "1.1" },
    canvasSize: {
      width: 1536,
      height: 1080,
    },
    imageParams: {
      provider: "google",
      model: "gemini-2.5-flash-image-preview",
    },
    audioParams: {
      padding: 0.2,
      introPadding: 0.5,
      closingPadding: 0.5,
      outroPadding: 0.5,
      bgmVolume: 0.1,
      audioVolume: 1.5,
      suppressSpeech: false,
    },
    soundEffectParams: {},
    speechParams: {
      speakers: {
        Presenter: {
          voiceId: "shimmer",
        },
      },
    },
    title,
    lang: args.lang,
    beats: beatsWithIds,
  } as unknown as MulmoScript;

  const message = `Mulmocast has processed the MulmoScript for "${title}" with ${beats.length} beats. Movie generation will begin automatically.`;

  return {
    message,
    title,
    instructions:
      "Acknowledge that all the images were successfully generated and that the movie is being generated.",
    data: {
      mulmoScript,
      images: imagesMap,
    },
  };
};

export const pluginCore: ToolPluginCore<MulmocastToolData, unknown, MulmocastArgs> = {
  toolDefinition: TOOL_DEFINITION,
  execute: showPresentation,
  generatingMessage: "Processing with Mulmocast...",
  waitingMessage:
    "Tell the user that the script was written and we are generating images and video with Mulmocast.",
  isEnabled: () => true,
  backends: ["imageGen", "mulmocast"],
};

export { TOOL_NAME, TOOL_DEFINITION };
export const executeMulmocast = showPresentation;
