import { Backend } from "../common/onnx";

export interface Engine {
  init: (
    root: HTMLDivElement,
    modelName: string,
    backend: Backend
  ) => Promise<void>;
  destroy: () => Promise<void>;
}
