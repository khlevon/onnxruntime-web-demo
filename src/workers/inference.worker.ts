import { InferenceSession, Tensor } from "onnxruntime-web";
import { createSession, postprocessData, preprocessData } from "../common/onnx";

export const setupWorker = async () => {
  let session: InferenceSession;

  self.addEventListener("message", async (event) => {
    const { type, payload } = event.data;

    if (type === "init") {
      if (!session) {
        const { modelName, backend } = payload;

        session = await createSession(modelName, backend);
      }

      self.postMessage({
        type: "init:result",
        payload: null,
      });
    } else if (type === "run") {
      if (!session) {
        throw new Error("Session is not initialized");
      }

      const { data, id } = payload;

      const { imageData, imageSize } = data;

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

      const outputMap = await session.run({
        [session.inputNames[0]]: inputTensor,
      });

      const { [session.outputNames[0]]: outputTensor } = outputMap;

      // Postprocess data
      const processedData = postprocessData(
        outputTensor.data as Float32Array,
        imageSize
      );

      self.postMessage({
        type: "run:result",
        payload: {
          data: processedData,
          id,
        },
      });
    }
  });
};

setupWorker();
