import { Tensor } from "onnxruntime-web";
import { imageUtilsFactory } from "../common/imageUtils";
import {
  createSession,
  imageToData,
  dataToImage,
  preprocessData,
  postprocessData,
} from "../common/onnx";
import { createMediaStream } from "../common/utils";
import { Engine } from "./engine.interface";

// Setup UI elements and return references to them
const setupUI = (root: HTMLDivElement) => {
  const sourceVideo = document.createElement("video");
  const resultCanvas = document.createElement("canvas");
  const snapshotButton = document.createElement("button");
  snapshotButton.innerText = "Snapshot";
  snapshotButton.classList.add("snapshot-button");

  const mainContainer = document.createElement("div");
  mainContainer.classList.add("main-container");
  mainContainer.append(sourceVideo, resultCanvas);

  root.append(mainContainer, snapshotButton);

  const indicator = document.createElement("div");
  indicator.classList.add("indicator");
  indicator.innerText = "-";
  root.append(indicator);

  return {
    sourceVideo,
    resultCanvas,
    snapshotButton,
    indicator,
  };
};

const snapshotEngineFactory = (): Engine => {
  // Create abort controller to abort camera stream
  let abortController: AbortController | null = null;
  let rootElem: HTMLDivElement | null = null;

  const engine: Engine = {
    init: async (root, modelName, backend) => {
      if (rootElem) {
        await engine.destroy();
      }

      rootElem = root;
      abortController = new AbortController();

      // Setup UI elements
      const { sourceVideo, resultCanvas, snapshotButton, indicator } =
        setupUI(rootElem);
      // Create imageUtils instance
      const imageUtils = imageUtilsFactory();
      // Create ONNX inference session based on the selected model
      const inferenceSession = await createSession(modelName, backend);

      // Add click event listener
      snapshotButton.addEventListener("click", async () => {
        // Resize image to 224x224, as model requires that size of input
        const imageSize = 224;
        // Get current frame from the video element
        const inputImage = imageUtils.getImageFromVideoTag(sourceVideo);
        // Resize image to target size
        const resizedImage = imageUtils.resizeImageWithCropping(
          inputImage,
          imageSize
        );
        // Convert image to tensor
        // Get image Uint8ClampedArray data
        const imageData = imageToData(resizedImage);
        // [r,g,b,a, r,g,b,a] -> shape = [224 * 224 * 3]

        const startProcessing = Date.now();

        // Preprocess data
        const processedImageData = preprocessData(imageData, imageSize);
        // [r,r g,g, b,b] -> shape = [224 * 224 * 3]

        // Create tensor
        const colorsChannelsCount = 3;
        const inputTensor = new Tensor("float32", processedImageData, [
          1,
          colorsChannelsCount,
          imageSize,
          imageSize,
        ]);
        // shape = [1, 3, 224, 224]

        // Run inference
        const outputMap = await inferenceSession.run({
          [inferenceSession.inputNames[0]]: inputTensor,
        });
        // Get output tensor
        const { [inferenceSession.outputNames[0]]: outputTensor } = outputMap;
        // shape = [1, 3, 224, 224]

        // Convert output tensor to image
        // Postprocess data
        const processedData = postprocessData(
          outputTensor.data as Float32Array,
          imageSize
        );
        // shape = [224 * 224 * 3]

        indicator.innerHTML = `${Date.now() - startProcessing}ms`;

        // Convert data to image
        const outputImage = dataToImage(processedData, imageSize);

        // Draw output image to canvas
        imageUtils.drawImageOnCanvas(outputImage, resultCanvas);
      });

      // Get access to the camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });

      // Get the first video track from the stream
      const inputTrack = mediaStream.getVideoTracks()[0];
      // Set the video element source to the track
      sourceVideo.srcObject = createMediaStream(inputTrack);
      sourceVideo.play();
    },
    destroy: async () => {
      // Abort camera stream
      abortController?.abort("Destroying engine");
      // Remove all elements from the root element
      rootElem?.querySelectorAll("*").forEach((n) => n.remove());
    },
  };

  return engine;
};

export default snapshotEngineFactory;
