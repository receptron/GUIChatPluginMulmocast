# @gui-chat-plugin/mulmocast

Mulmocast presentation plugin for GUI Chat applications. Create presentations with AI-generated images and optional video output.

## Features

- Create presentations from MulmoScript
- AI-powered image generation for each beat
- Video generation support (requires server-side implementation)
- MulmoViewer integration for playback
- Download MulmoScript and generated videos
- Inline script editing

## Installation

```bash
yarn add @gui-chat-plugin/mulmocast
```

## Usage

### Vue Integration

```typescript
// In src/tools/index.ts
import MulmocastPlugin from "@gui-chat-plugin/mulmocast/vue";

const pluginList = [
  // ... other plugins
  MulmocastPlugin,
];

// In src/main.ts
import "@gui-chat-plugin/mulmocast/style.css";
```

### Core-only Usage

```typescript
import { executeMulmocast, TOOL_DEFINITION } from "@gui-chat-plugin/mulmocast";

// Create a presentation
const result = await executeMulmocast(context, {
  title: "Introduction to AI",
  lang: "en",
  beats: [
    {
      text: "Welcome to this presentation about artificial intelligence.",
      imagePrompt: "A futuristic AI robot in a modern office",
    },
    {
      text: "Let's explore how AI is transforming our world.",
    },
  ],
});
```

## API

### MulmocastArgs

```typescript
interface MulmocastArgs {
  title: string;
  lang: string;
  beats: MulmocastBeat[];
}

interface MulmocastBeat {
  text: string;         // Text spoken by presenter
  imagePrompt?: string; // Optional image generation prompt
}
```

### MulmocastToolData

```typescript
interface MulmocastToolData {
  mulmoScript: MulmoScript;
  images?: Record<string, string>;
  moviePath?: string;
  viewerJsonPath?: string;
}
```

## Requirements

This plugin requires:

- `mulmocast` npm package for MulmoScript types
- `mulmocast-viewer` npm package for playback
- Host application to provide `generateImageWithBackend` function
- Optional: Server endpoints for video generation (`/api/generate-movie`, `/api/viewer-json`, `/api/download-movie`)

## Development

```bash
# Install dependencies
yarn install

# Run demo
yarn dev

# Build
yarn build

# Lint
yarn lint
```

## License

MIT
