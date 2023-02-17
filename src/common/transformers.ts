import { InferenceSession, Tensor } from "onnxruntime-web";
import { imageUtilsFactory } from "./imageUtils";
import {
  Backend,
  imageToData,
  dataToImage,
  preprocessData,
  postprocessData,
} from "./onnx";
import { wrapWorker } from "../workers/worker";

export const transformsFactory = () => {
  const imageUtils = imageUtilsFactory();

  return {
    fpsTransform: (inputFps: number, targetFps: number) => {
      return new TransformStream<VideoFrame, VideoFrame>({
        transform: (frame, controller) => {
          const timestamp = frame.timestamp ?? 0;

          if (timestamp % (inputFps / targetFps) === 0) {
            controller.enqueue(frame);
          } else {
            frame.close();
          }
        },
      });
    },

    resizeTransform: (imageSize: number) => {
      return new TransformStream<
        VideoFrame,
        { image: HTMLCanvasElement; timestamp: number }
      >({
        transform: (frame, controller) => {
          const image = imageUtils.getImageFromVideoFrame(frame);
          const resizedImage = imageUtils.resizeImageWithCropping(
            image,
            imageSize
          );
          const timestamp = frame.timestamp ?? 0;

          frame.close();

          controller.enqueue({
            image: resizedImage,
            timestamp,
          });
        },
      });
    },

    imageToVideoFrameTransform: () => {
      return new TransformStream<
        { image: HTMLCanvasElement; timestamp: number },
        VideoFrame
      >({
        transform: (data, controller) => {
          const { image, timestamp } = data;

          controller.enqueue(
            new VideoFrame(image, { timestamp, alpha: "discard" })
          );
        },
      });
    },

    inferenceTransform: (
      session: InferenceSession,
      indicator: HTMLDivElement
    ) => {
      return new TransformStream<
        { image: HTMLCanvasElement; timestamp: number },
        { image: HTMLCanvasElement; timestamp: number }
      >({
        transform: async (data, controller) => {
          const { image, timestamp } = data;

          const imageSize = image.width;

          // Get image Uint8ClampedArray data
          const imageData = imageToData(image);

          const startProcessing = Date.now();

          // Preprocess data
          const processedImageData = preprocessData(imageData, imageSize);

          // Create tensor
          const colorsChannelsCount = 3;
          const inputTensor = new Tensor("float32", processedImageData, [
            1,
            colorsChannelsCount,
            imageSize,
            imageSize,
          ]);

          // Run inference
          const outputMap = await session.run({
            [session.inputNames[0]]: inputTensor,
          });

          // Get output tensor
          const { [session.outputNames[0]]: outputTensor } = outputMap;

          // Postprocess data
          const processedData = postprocessData(
            outputTensor.data as Float32Array,
            imageSize
          );

          indicator.innerHTML = `${Date.now() - startProcessing}ms`;

          // Convert data to image
          const outputImage = dataToImage(processedData, imageSize);

          return controller.enqueue({
            image: outputImage,
            timestamp,
          });
        },
      });
    },

    workerInferenceTransform: async (
      modelName: string,
      backed: Backend,
      indicator: HTMLDivElement
    ) => {
      // Create worker
      const inferenceWorker = wrapWorker(
        new Worker(new URL("../workers/inference.worker.ts", import.meta.url), {
          type: "module",
          name: "inference.worker",
        })
      );

      // Initialize worker
      await inferenceWorker.init(modelName, backed);

      return new TransformStream<
        { image: HTMLCanvasElement; timestamp: number },
        { image: HTMLCanvasElement; timestamp: number }
      >({
        transform: async (data, controller) => {
          const { image, timestamp } = data;

          const imageSize = image.width;

          // Get image Uint8ClampedArray data
          const imageData = imageToData(image);

          const startProcessing = Date.now();

          // Run inference
          const outputData = await inferenceWorker.run({
            imageData,
            imageSize,
          });

          indicator.innerHTML = `${Date.now() - startProcessing}ms`;

          // Convert data to image
          const outputImage = dataToImage(outputData, imageSize);

          return controller.enqueue({
            image: outputImage,
            timestamp,
          });
        },
      });
    },
  };
};
