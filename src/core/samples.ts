import type { ToolSample } from "gui-chat-protocol";

export const samples: ToolSample[] = [
  {
    name: "Simple Presentation",
    args: {
      title: "Introduction to AI",
      lang: "en",
      beats: [
        {
          text: "Artificial Intelligence is transforming the way we live and work. From voice assistants to self-driving cars, AI is becoming an integral part of our daily lives.",
          imagePrompt: "A futuristic city with AI-powered robots and flying vehicles",
        },
        {
          text: "Machine learning, a subset of AI, enables computers to learn from data without being explicitly programmed. This technology powers recommendation systems and fraud detection.",
        },
      ],
    },
  },
];
