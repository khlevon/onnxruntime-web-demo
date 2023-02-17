import { Backend } from "../common/onnx";
import { SignalPromise } from "../common/signalPromise";

export const wrapWorker = (worker: Worker) => {
  return {
    init: (modelName: string, backend: Backend) => {
      const result = new SignalPromise<any>();
      const resultHandler = (event: MessageEvent) => {
        const { type, payload } = event.data;

        if (type === "init:result") {
          worker.removeEventListener("message", resultHandler);

          result.resolveSignal(payload);
        }
      };

      worker.addEventListener("message", resultHandler);

      worker.postMessage({
        type: "init",
        payload: {
          modelName,
          backend,
        },
      });

      return result.signal;
    },

    run: async (data: { imageData: Uint8ClampedArray; imageSize: number }) => {
      const result = new SignalPromise<Uint8ClampedArray>();

      const id = Math.random().toString(36);

      const resultHandler = (event: MessageEvent) => {
        const { type, payload } = event.data;

        if (type === "run:result" && payload.id === id) {
          worker.removeEventListener("message", resultHandler);

          result.resolveSignal(payload.data);
        }
      };

      worker.addEventListener("message", resultHandler);

      worker.postMessage({
        type: "run",
        payload: {
          data,
          id,
        },
      });

      return result.signal;
    },
  };
};
