<template>
  <div class="mulmocast-container">
    <div class="mulmocast-content-wrapper">
      <div class="p-4">
        <div
          v-if="selectedResult?.data?.mulmoScript?.title"
          class="header-row"
        >
          <h1 class="document-title">
            {{ selectedResult.data.mulmoScript.title }}
          </h1>
          <div class="button-group">
            <button @click="downloadMulmoScript" class="download-btn download-btn-green">
              <span class="material-icons">download</span>
              Script
            </button>
            <button
              v-if="!moviePath && !isGeneratingMovie && autoGenerateMovies === false"
              @click="triggerMovieGeneration"
              class="download-btn download-btn-orange"
            >
              <span class="material-icons">movie</span>
              Generate Movie
            </button>
            <button
              v-else
              @click="downloadMovie"
              :disabled="!moviePath"
              :class="['download-btn', moviePath ? 'download-btn-blue' : 'download-btn-disabled']"
            >
              <span
                class="material-icons"
                :class="{ 'animate-spin': isGeneratingMovie }"
              >
                {{ isGeneratingMovie ? "hourglass_empty" : "download" }}
              </span>
              Movie
            </button>
          </div>
        </div>
        <template v-if="selectedResult?.data?.mulmoScript?.beats">
          <div
            v-for="(beat, index) in selectedResult.data.mulmoScript.beats"
            :key="(beat as any).id || index"
            class="beat-container"
          >
            <div v-if="index === 0 && movieError" class="error-message">
              Movie generation failed: {{ movieError }}
            </div>
            <div v-else-if="index === 0 && viewerData" class="viewer-container">
              <button
                v-if="currentPage > 0"
                @click="previousPage"
                class="nav-button nav-button-prev"
                aria-label="Previous page"
              >
                ‹
              </button>
              <MulmoView
                ref="viewerRef"
                :key="`viewer-${currentPage}`"
                v-model:audio-lang="audioLang"
                v-model:text-lang="textLang"
                :data-set="viewerData"
                :base-path="basePath"
                :init-page="currentPage"
                :playback-speed="playbackSpeed"
                @updated-page="(page: number) => (currentPage = page)"
              />
              <button
                v-if="viewerData && currentPage < viewerData.beats.length - 1"
                @click="nextPage"
                class="nav-button nav-button-next"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
            <video
              v-else-if="index === 0 && moviePath && movieUrl && !viewerData"
              ref="videoEl"
              :src="movieUrl"
              controls
              class="video-player"
              @play="handlePlay"
              @pause="handlePause"
              @ended="handleEnded"
            />
            <img
              v-else-if="(beat as any).id && selectedResult.data?.images?.[(beat as any).id]"
              :src="`data:image/png;base64,${selectedResult.data.images[(beat as any).id]}`"
              :alt="beat.text"
              class="beat-image"
            />
            <p class="beat-text">{{ beat.text }}</p>
          </div>
        </template>
      </div>
    </div>

    <details class="script-source" v-if="selectedResult?.data?.mulmoScript">
      <summary>Edit MulmoScript Source</summary>
      <div v-if="parseError" class="error">
        <strong>Parse Error:</strong> {{ parseError }}
      </div>
      <textarea
        v-model="editableScript"
        class="script-editor"
        spellcheck="false"
      ></textarea>
      <button @click="applyScript" class="apply-btn" :disabled="!hasChanges">
        Apply Changes
      </button>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import type { ToolResult } from "gui-chat-protocol";
import type { MulmocastToolData } from "../core/types";
import { MulmoView } from "mulmocast-viewer";

// Define ViewerData interface locally since it's not exported
interface ViewerBeat {
  text?: string;
  audio?: string;
  image?: string;
}

interface ViewerData {
  beats: ViewerBeat[];
}

const props = defineProps<{
  selectedResult: ToolResult<MulmocastToolData> | null;
  setMute?: (muted: boolean) => void;
  pluginConfigs?: Record<string, unknown>;
}>();

// Extract mulmocast-specific config
const autoGenerateMovies = computed(
  () => props.pluginConfigs?.mulmocast ?? true,
);

const emit = defineEmits<{
  updateResult: [result: ToolResult<MulmocastToolData>];
}>();

const movieUrl = ref<string | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const isGeneratingMovie = ref(false);
const movieError = ref<string | null>(null);
const parseError = ref<string | null>(null);
const editableScript = ref(
  JSON.stringify(props.selectedResult?.data?.mulmoScript, null, 2) || "",
);

// MulmoViewer state
const viewerData = ref<ViewerData | null>(null);
const viewerRef = ref<InstanceType<typeof MulmoView> | null>(null);
const audioLang = ref("en");
const textLang = ref("en");
const playbackSpeed = ref(1);
const currentPage = ref(0);

// moviePath comes from selectedResult now
const moviePath = computed(() => props.selectedResult?.data?.moviePath || null);
const viewerJsonPath = computed(
  () => props.selectedResult?.data?.viewerJsonPath || null,
);
const basePath = computed(() => {
  if (!viewerJsonPath.value) return "";
  const outputIndex = viewerJsonPath.value.indexOf("/output/");
  if (outputIndex !== -1) {
    const relativePath = viewerJsonPath.value.substring(outputIndex);
    const lastSlash = relativePath.lastIndexOf("/");
    return relativePath.substring(0, lastSlash);
  }
  return "";
});

// Check if script has been modified
const hasChanges = computed(() => {
  const currentScript = JSON.stringify(
    props.selectedResult?.data?.mulmoScript,
    null,
    2,
  );
  return editableScript.value !== currentScript;
});

onUnmounted(() => {
  if (movieUrl.value) {
    URL.revokeObjectURL(movieUrl.value);
  }
});

// Movie generation function
async function triggerMovieGeneration() {
  const mulmoScript = props.selectedResult?.data?.mulmoScript;
  if (!mulmoScript || isGeneratingMovie.value || !props.selectedResult) return;

  isGeneratingMovie.value = true;
  movieError.value = null;

  try {
    const uuid = uuidv4();
    const movieResponse = await fetch("/api/generate-movie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mulmoScript,
        uuid,
        images: props.selectedResult?.data?.images || {},
      }),
    });

    if (movieResponse.ok) {
      const movieResult = await movieResponse.json();

      const updatedResult: ToolResult<MulmocastToolData> = {
        ...props.selectedResult,
        data: {
          ...props.selectedResult.data!,
          moviePath: movieResult.outputPath,
          viewerJsonPath: movieResult.viewerJsonPath,
        },
      };
      emit("updateResult", updatedResult);
    } else {
      const error = await movieResponse.json();
      movieError.value =
        error.details || error.error || "Failed to generate movie";
    }
  } catch (error) {
    movieError.value = error instanceof Error ? error.message : "Unknown error";
  } finally {
    isGeneratingMovie.value = false;
  }
}

// Auto-generate movie when component mounts with mulmoScript (if enabled)
watch(
  () => props.selectedResult?.data?.mulmoScript,
  async (mulmoScript) => {
    if (
      !mulmoScript ||
      props.selectedResult?.data?.moviePath ||
      isGeneratingMovie.value ||
      !props.selectedResult ||
      autoGenerateMovies.value === false
    )
      return;

    await triggerMovieGeneration();
  },
  { immediate: true },
);

// Load viewer JSON when viewerJsonPath exists
watch(
  viewerJsonPath,
  async (path) => {
    if (!path) {
      viewerData.value = null;
      return;
    }

    try {
      const response = await fetch("/api/viewer-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          viewerJsonPath: path,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load viewer JSON");
      }

      viewerData.value = (await response.json()) as ViewerData;
    } catch (error) {
      console.error("Viewer JSON loading failed:", error);
      viewerData.value = null;
    }
  },
  { immediate: true },
);

// Load movie automatically when moviePath exists
watch(
  moviePath,
  async (path) => {
    if (!path) return;

    try {
      const response = await fetch("/api/download-movie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moviePath: path,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load movie");
      }

      const blob = await response.blob();
      if (movieUrl.value) {
        URL.revokeObjectURL(movieUrl.value);
      }
      movieUrl.value = URL.createObjectURL(blob);
    } catch (error) {
      console.error("Movie loading failed:", error);
    }
  },
  { immediate: true },
);

const downloadMulmoScript = () => {
  if (!props.selectedResult?.data?.mulmoScript) return;

  const jsonString = JSON.stringify(
    props.selectedResult.data.mulmoScript,
    null,
    2,
  );
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const title = props.selectedResult.data.mulmoScript.title || "mulmoscript";
  const sanitizedTitle = title
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  link.download = `${sanitizedTitle}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadMovie = async () => {
  if (!moviePath.value) return;

  try {
    const response = await fetch("/api/download-movie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moviePath: moviePath.value,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to download movie");
    }

    const contentDisposition = response.headers.get("Content-Disposition");
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : "movie.mp4";

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Movie download failed:", error);
    alert(
      `Failed to download movie: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

const handlePlay = () => {
  props.setMute?.(true);
};

const handlePause = () => {
  props.setMute?.(false);
};

const handleEnded = () => {
  props.setMute?.(false);
};

function applyScript() {
  try {
    const parsedScript = JSON.parse(editableScript.value);
    parseError.value = null;

    const updatedResult: ToolResult<MulmocastToolData> = {
      ...props.selectedResult!,
      data: {
        ...props.selectedResult!.data!,
        mulmoScript: parsedScript,
        moviePath: undefined,
        viewerJsonPath: undefined,
      },
    };

    emit("updateResult", updatedResult);
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : "Invalid JSON";
  }
}

// Watch for external changes to selectedResult
watch(
  () => props.selectedResult?.data?.mulmoScript,
  (newScript) => {
    editableScript.value = JSON.stringify(newScript, null, 2) || "";
    parseError.value = null;
  },
);

// Navigation functions
function nextPage() {
  if (viewerData.value && currentPage.value < viewerData.value.beats.length - 1) {
    const mediaElement = document.querySelector("video, audio") as HTMLMediaElement;
    const wasPlaying = mediaElement && !mediaElement.paused;

    currentPage.value++;

    if (wasPlaying) {
      setTimeout(() => {
        const newMediaElement = document.querySelector("video, audio") as HTMLMediaElement;
        if (newMediaElement) {
          newMediaElement.play().catch(() => {});
        }
      }, 100);
    }
  }
}

function previousPage() {
  if (currentPage.value > 0) {
    const mediaElement = document.querySelector("video, audio") as HTMLMediaElement;
    const wasPlaying = mediaElement && !mediaElement.paused;

    currentPage.value--;

    if (wasPlaying) {
      setTimeout(() => {
        const newMediaElement = document.querySelector("video, audio") as HTMLMediaElement;
        if (newMediaElement) {
          newMediaElement.play().catch(() => {});
        }
      }, 100);
    }
  }
}
</script>

<style scoped>
.mulmocast-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.mulmocast-content-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1em;
}

.document-title {
  font-size: 2em;
  margin: 0;
}

.button-group {
  display: flex;
  gap: 0.5em;
}

.download-btn {
  padding: 0.5em 1em;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.download-btn-green {
  background-color: #4caf50;
}

.download-btn-orange {
  background-color: #ff9800;
}

.download-btn-blue {
  background-color: #2196f3;
}

.download-btn-disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.download-btn .material-icons {
  font-size: 1.2em;
}

.beat-container {
  margin-bottom: 1em;
}

.error-message {
  margin: 1em 0;
  padding: 1em;
  background: #ffebee;
  border-radius: 4px;
  color: #c62828;
}

.viewer-container {
  margin: 1em 0;
  position: relative;
}

.video-player {
  max-width: 100%;
  margin: 1em 0;
}

.beat-image {
  max-width: 100%;
  margin: 1em 0;
}

.beat-text {
  margin-bottom: 1em;
}

.script-source {
  padding: 0.5rem;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  font-family: monospace;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.script-source summary {
  cursor: pointer;
  user-select: none;
  padding: 0.5rem;
  background: #e8e8e8;
  border-radius: 4px;
  font-weight: 500;
  color: #333;
}

.script-source[open] summary {
  margin-bottom: 0.5rem;
}

.script-source summary:hover {
  background: #d8d8d8;
}

.error {
  padding: 0.5rem;
  background: #ff000020;
  color: #ff6666;
  font-family: monospace;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.script-editor {
  width: 100%;
  height: 40vh;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #ccc;
  border-radius: 4px;
  color: #333;
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  resize: vertical;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.script-editor:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.apply-btn {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
  font-weight: 500;
}

.apply-btn:hover {
  background: #45a049;
}

.apply-btn:active {
  background: #3d8b40;
}

.apply-btn:disabled {
  background: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.6;
}

.apply-btn:disabled:hover {
  background: #cccccc;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  user-select: none;
}

.nav-button:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: translateY(-50%) scale(1.1);
}

.nav-button:active {
  transform: translateY(-50%) scale(0.95);
}

.nav-button-prev {
  left: 0;
}

.nav-button-next {
  right: 0;
}
</style>
