export const getResourceUrl = (path: string) => {
  return new URL(path, location.origin).href;
};

export const createMediaStream = (track: MediaStreamTrack) => {
  const stream = new MediaStream();
  stream.addTrack(track);
  return stream;
};
