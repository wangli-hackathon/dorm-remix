/**
 * Official examples copied from the Lux3D OpenAPI document.
 * Source: https://labs.aholo.ai/api-docs/specifications/services/lux3d/openapi.en.json
 * Retrieved: 2026-11-17
 *
 * These bodies are documentation fixtures. They are not results from this project,
 * and they must never be shown as a dorm model the app just generated.
 */
export const FIXTURE_SOURCE = "https://labs.aholo.ai/api-docs/specifications/services/lux3d/openapi.en.json";
export const FIXTURE_RETRIEVED = "2026-11-17";

export const textOnlyG1 = {
  prompt: "Generate a high-quality 3D wooden chair model",
  style: "photorealistic",
  version: "G1",
  faceCount: 300000,
  outputFormat: ["zip", "glb"],
} as const;

export const textWithImage = {
  prompt: "Generate a high-quality 3D wooden chair model",
  style: "photorealistic",
  img: "https://qhstaticssl.kujiale.com/image/jpeg/1784775590613/image_to_3d_model.jpg",
  version: "G1",
} as const;

export const imgTo3dG1 = {
  img: "https://qhstaticssl.kujiale.com/image/jpeg/1784775590613/image_to_3d_model.jpg",
  version: "G1",
  faceCount: 300000,
  outputFormat: ["zip", "glb"],
} as const;

export const createSuccess = { f: null, c: "0", m: "", d: 1256173 } as const;

export const concurrencyLimit = {
  f: null,
  c: "GENERATION_CONCURRENCY_LIMIT_EXCEEDED",
  m: "There is already a generation task in progress. Please wait for it to finish and try again.",
  d: null,
} as const;

export const queryRunning = { f: null, c: "0", m: "", d: { taskId: 1389513, status: 1 } } as const;

export const queryFailed = { f: null, c: "0", m: "", d: { taskId: 1389513, status: 4 } } as const;

export const successG1Base = {
  f: null,
  c: "0",
  m: "",
  d: {
    taskId: 1389515,
    outputs: [{ content: "https://cdn.example.com/output/results.zip" }, { content: "https://cdn.example.com/output/result.glb" }],
    status: 3,
  },
} as const;

export const successG1WithPly = {
  f: null,
  c: "0",
  m: "",
  d: {
    taskId: 1389516,
    outputs: [
      { content: "https://cdn.example.com/output/results.zip" },
      { content: "https://cdn.example.com/output/result.glb" },
      { content: "https://cdn.example.com/output/result.ply" },
    ],
    status: 3,
  },
} as const;

export const successNotRequested = {
  f: null,
  c: "0",
  m: "",
  d: {
    taskId: 1389514,
    outputs: [
      { content: "https://cdn.example.com/output/result.zip" },
      { content: "https://cdn.example.com/output/textured.glb" },
      { content: "NOT_REQUESTED" },
    ],
    status: 3,
  },
} as const;

export const OFFICIAL_EXAMPLES = {
  source: FIXTURE_SOURCE,
  retrieved: FIXTURE_RETRIEVED,
  textOnlyG1,
  textWithImage,
  imgTo3dG1,
  createSuccess,
  concurrencyLimit,
  queryRunning,
  queryFailed,
  successG1Base,
  successG1WithPly,
  successNotRequested,
};
