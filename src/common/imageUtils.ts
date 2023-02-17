export const imageUtilsFactory = () => {
  return {
    getImageFromBlob: async (blob: Blob): Promise<HTMLCanvasElement> => {
      const image = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const url = URL.createObjectURL(blob);
      image.src = url;
      await image.decode();
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      return canvas;
    },
    getImageFromVideoTag: (videoTag: HTMLVideoElement) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const width = videoTag.videoWidth;
      const height = videoTag.videoHeight;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(videoTag, 0, 0);

      return canvas;
    },
    getImageFromVideoFrame: (frame: VideoFrame) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const width = frame.displayWidth;
      const height = frame.displayHeight;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(frame, 0, 0);

      return canvas;
    },
    resizeImageWithCropping: (image: HTMLCanvasElement, imageSize: number) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const width = imageSize;
      const height = imageSize;

      canvas.width = width;
      canvas.height = height;

      const imageRatio = image.width / image.height;
      const canvasRatio = width / height;

      const newImageWidth =
        imageRatio > canvasRatio ? image.height * canvasRatio : image.width;
      const newImageHeight =
        imageRatio > canvasRatio ? image.height : image.width / canvasRatio;
      const newImageX =
        imageRatio > canvasRatio ? (image.width - newImageWidth) / 2 : 0;
      const newImageY =
        imageRatio > canvasRatio ? 0 : (image.height - newImageHeight) / 2;

      ctx.drawImage(
        image,
        newImageX,
        newImageY,
        newImageWidth,
        newImageHeight,
        0,
        0,
        width,
        height
      );

      return canvas;
    },
    drawImageOnCanvas: (
      image: HTMLCanvasElement,
      canvas: HTMLCanvasElement
    ) => {
      const ctx = canvas.getContext("2d")!;
      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);
    },
  };
};
