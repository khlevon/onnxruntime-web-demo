import { Backend } from "./common/onnx";
import { Engine } from "./engines/engine.interface";
import "./style.scss";

console.warn = () => {};

const setupApp = async (
  root: HTMLDivElement,
  params: {
    modelName: string;
    mode: string;
    backend: Backend;
  }
) => {
  const { modelName, mode, backend } = params;
  const { default: engineFactory } = await import(
    `./engines/${mode}.engine.ts`
  );
  const engine = engineFactory() as Engine;

  await engine.init(root, modelName, backend);

  return () => engine.destroy();
};

export const main = async () => {
  const root = document.querySelector("#root") as HTMLDivElement;
  const settingsForm = document.querySelector(
    "#settings-form"
  ) as HTMLFormElement;

  let destroyApp: (() => Promise<void>) | null = null;

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (destroyApp) {
      await destroyApp();
    }

    const formData = new FormData(settingsForm);
    const modelName = formData.get("model") as string;
    const mode = formData.get("mode") as string;
    const backend = formData.get("backend") as Backend;

    destroyApp = await setupApp(root, {
      modelName,
      mode,
      backend,
    }).catch((e) => {
      console.error(e);
      alert(e?.message);
      return null;
    });
  });
};

main();
