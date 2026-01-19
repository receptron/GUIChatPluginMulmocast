import "../style.css";

import type { ToolPlugin } from "gui-chat-protocol/vue";
import type { MulmocastToolData, MulmocastArgs } from "../core/types";
import { pluginCore } from "../core/plugin";
import { samples } from "../core/samples";
import View from "./View.vue";
import Preview from "./Preview.vue";

export const TOOL_NAME = "showPresentation";

export const SYSTEM_PROMPT = `Call the ${TOOL_NAME} API to display presentations when the user is asking for a presentation.`;

export const plugin: ToolPlugin<MulmocastToolData, unknown, MulmocastArgs> = {
  ...pluginCore,
  viewComponent: View,
  previewComponent: Preview,
  samples,
  systemPrompt: SYSTEM_PROMPT,
};

export type {
  MulmocastToolData,
  MulmocastBeat,
  MulmocastArgs,
  MulmocastResult,
} from "../core/types";

export {
  TOOL_DEFINITION,
  executeMulmocast,
  pluginCore,
} from "../core/plugin";

export { samples } from "../core/samples";

export { View, Preview };

export default { plugin };
