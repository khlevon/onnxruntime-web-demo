import { env, InferenceSession, Tensor } from "onnxruntime-web";
import { getResourceUrl } from "./utils";

const artifactsPath = getResourceUrl("assets/artifacts/");

const runAsync = false;

// Setup ONNX runtime environment
// WASM backend
env.wasm.wasmPaths = artifactsPath; // Path to the ONNX runtime WASM files
env.wasm.proxy = runAsync; // Use WebWorker to run inference
env.wasm.simd = true; // Use WASM SIMD instructions

// WebGL backend
env.webgl.async = runAsync; // Use WebGL2 async texture upload
env.webgl.pack = true; // Use WebGL2 packed texture

export type Backend = "wasm" | "webgl";

export const createSession = async (
  modelName: string,
  executionProvider: Backend = "wasm"
): Promise<InferenceSession> => {
  env.wasm.simd;

  const session = await InferenceSession.create(
    `${artifactsPath}${modelName}.onnx`,
    {
      executionProviders: [executionProvider],
    }
  );

  return session;
};

export const preprocessData = (
  imageData: Uint8ClampedArray,
  imageSize: number
): Float32Array => {
  const colorsChannelsCount = 3;
  const image2Float32 = new Float32Array(
    imageSize * imageSize * colorsChannelsCount
  );

  let j = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    image2Float32[j] = imageData[i]; // Red

    image2Float32[j + imageSize * imageSize] = imageData[i + 1]; // Green

    image2Float32[j + 2 * (imageSize * imageSize)] = imageData[i + 2]; // Blue

    j += 1;
  }

  return image2Float32;
};

export const postprocessData = (
  float32ArrayData: Float32Array,
  imageSize: number
): Uint8ClampedArray => {
  const colorsChannelsCount = 4;
  const imageData = new Uint8ClampedArray(
    imageSize * imageSize * colorsChannelsCount
  );

  let j = 0;
  for (let i = 0; i < imageSize * imageSize; i += 1) {
    imageData[j] = float32ArrayData[i]; // Red

    imageData[j + 1] = float32ArrayData[i + imageSize * imageSize];

    imageData[j + 2] = float32ArrayData[i + 2 * (imageSize * imageSize)]; // Blue

    imageData[j + 3] = 255; // Alpha
    j += 4;
  }

  return imageData;
};

export const imageToData = (image: HTMLCanvasElement): Uint8ClampedArray => {
  const imageSize = image.width;
  const imageData = image
    .getContext("2d")!
    .getImageData(0, 0, imageSize, imageSize, {
      colorSpace: "srgb",
    }).data;

  return imageData;
};

export const dataToImage = (
  data: Uint8ClampedArray,
  imageSize: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // const imageSize = Math.sqrt(data.length / 4);

  const width = imageSize;
  const height = imageSize;

  canvas.width = width;
  canvas.height = height;

  const imageData = ctx.createImageData(width, height, {
    colorSpace: "srgb",
  });

  imageData.data.set(data);

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};
