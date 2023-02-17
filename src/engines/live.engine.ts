import { createSession } from "../common/onnx";
import { transformsFactory } from "../common/transformers";
import { createMediaStream } from "../common/utils";
import { Engine } from "./engine.interface";

// Setup UI elements and return references to them
const setupUI = (root: HTMLDivElement) => {
  const sourceVideo = document.createElement("video");
  const resultVideo = document.createElement("video");

  const mainContainer = document.createElement("div");
  mainContainer.classList.add("main-container");
  mainContainer.append(sourceVideo, resultVideo);

  root.append(mainContainer);

  const indicator = document.createElement("div");
  indicator.classList.add("indicator");
  indicator.innerText = "-";
  root.append(indicator);

  return {
    sourceVideo,
    resultVideo,
    indicator,
  };
};

const liveEngineFactory = (): Engine => {
  // Create abort controller to abort camera stream
  let abortController: AbortController | null = null;
  let rootElem: HTMLDivElement | null = null;

  const engine: Engine = {
    init: async (root, modelName, backend) => {
      if (rootElem) {
        await engine.destroy();
      }

      // MediaStreamTrackProcessor and MediaStreamTrackGenerator are not supported in all browsers yet
      if (!window.MediaStreamTrackProcessor) {
        alert(
          "Your browser doesn't support this API yet, please use Chrome 94 or later"
        );
        return;
      }

      rootElem = root;
      abortController = new AbortController();

      // Setup UI elements
      const { sourceVideo, resultVideo, indicator } = setupUI(rootElem);
      // Create transforms instance
      const transforms = transformsFactory();
      // Create ONNX inference session based on the selected model
      const inferenceSession = await createSession(modelName, backend);

      // Get camera stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });

      // Get input track and its frame rate
      const inputTrack = mediaStream.getVideoTracks()[0];
      // Get input video frame rate
      const inputFps = inputTrack.getSettings().frameRate!;

      // Create MediaStreamTrackProcessor and MediaStreamTrackGenerator instances to process the input stream and create output stream
      const inputProcessor = new MediaStreamTrackProcessor({
        track: inputTrack,
      });
      const inputReader = inputProcessor.readable;

      const sourceGenerator = new MediaStreamTrackGenerator({ kind: "video" });
      const resultGenerator = new MediaStreamTrackGenerator({ kind: "video" });
      const sourceWriter = sourceGenerator.writable;
      const resultWriter = resultGenerator.writable;

      const imageSize = 224;
      const inputStream = inputReader
        // Drop input stream frame rate as inference is slow
        .pipeThrough(transforms.fpsTransform(inputFps, 2), {
          signal: abortController.signal,
        })
        // Resize input stream to the model input size
        .pipeThrough(transforms.resizeTransform(imageSize), {
          signal: abortController.signal,
        });

      // Duplicate input stream to create source and result streams
      const [sourceStream, resultStream] = inputStream.tee();

      // Pipe source stream to left video element to display the original video
      sourceStream
        // Convert image to video frame
        .pipeThrough(transforms.imageToVideoFrameTransform(), {
          signal: abortController.signal,
        })
        .pipeTo(sourceWriter, {
          signal: abortController.signal,
        });

      // Pipe result stream to right video element to display the processed video
      resultStream
        // Run inference on the input stream for each frame
        .pipeThrough(
          transforms.inferenceTransform(inferenceSession, indicator),
          {
            signal: abortController.signal,
          }
        )
        // Convert processed frames to video frames
        .pipeThrough(transforms.imageToVideoFrameTransform(), {
          signal: abortController.signal,
        })
        .pipeTo(resultWriter, {
          signal: abortController.signal,
        });

      // Display the videos
      sourceVideo.srcObject = createMediaStream(sourceGenerator);
      sourceVideo.play();

      resultVideo.srcObject = createMediaStream(resultGenerator);
      resultVideo.play();
    },
    destroy: async () => {
      // Abort camera stream and pending operations
      abortController?.abort("Destroying engine");
      // Remove UI elements
      rootElem?.querySelectorAll("*").forEach((n) => n.remove());
    },
  };

  return engine;
};

export default liveEngineFactory;
