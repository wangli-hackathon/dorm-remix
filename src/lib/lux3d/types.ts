export type LuxVersion = "G1" | "G1-Turbo";
export type LuxStyle = "photorealistic" | "cartoon" | "anime" | "hand_painted" | "cyberpunk" | "fantasy" | "glass";
export type OutputFormat = "zip" | "glb" | "ply";
export type TaskStatus = 0 | 1 | 3 | 4 | 6;

export type TextTo3dRequest = {
  prompt: string;
  style?: LuxStyle;
  img?: string;
  version?: LuxVersion;
  faceCount?: number;
  outputFormat?: readonly OutputFormat[];
  enablePbr?: boolean;
  aiPredictSize?: boolean;
};

export type ImgTo3dRequest = {
  img?: string;
  imgs?: string[];
  version?: LuxVersion;
  faceCount?: number;
  outputFormat?: readonly OutputFormat[];
  enablePbr?: boolean;
  aiPredictSize?: boolean;
};

export type TaskOutput = { content?: string | null };

export type Downloads = { glb?: string; zip?: string; ply?: string };

export type CreateResult = { ok: true; taskId: number } | { ok: false; error: string; code?: string; message: string };

export type QueryResult =
  | { ok: true; taskId: number; status: TaskStatus; outputs: TaskOutput[]; downloads: Downloads }
  | { ok: false; error: string; message: string; code?: string };

export type ServerEnv = {
  AHOLO_API_KEY?: string;
  AHOLO_REGION?: string;
  AHOLO_API_BASE?: string;
  LUX3D_VERSION?: string;
  LUX3D_FACE_COUNT?: string;
  VITE_AHOLO_API_KEY?: string;
};

export type LuxRuntimeConfig = {
  apiKey: string;
  region: "com" | "cn";
  gateway: string;
  version: LuxVersion;
  faceCount: number;
  mode: "live" | "demo";
  keyExposed: false;
  warning?: string;
};
