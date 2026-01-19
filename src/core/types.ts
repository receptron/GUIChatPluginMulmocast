import type { ToolResult } from "gui-chat-protocol";
import type { MulmoScript } from "mulmocast";

export interface MulmocastToolData {
  mulmoScript: MulmoScript;
  images?: Record<string, string>;
  moviePath?: string;
  viewerJsonPath?: string;
}

export interface MulmocastBeat {
  text: string;
  imagePrompt?: string;
}

export interface MulmocastArgs {
  title: string;
  lang: string;
  beats: MulmocastBeat[];
}

export type MulmocastResult = ToolResult<MulmocastToolData>;
