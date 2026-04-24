/**
 * ReadableStream を async iterable に変換する。
 * Safari 17.3 以下は ReadableStream の async iteration に未対応のためのフォールバック。
 */
export function asAsyncIterable<T>(
  stream: ReadableStream<T>,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      const reader = stream.getReader();
      return {
        async next() {
          const { done, value } = await reader.read();
          return done
            ? { done: true, value: undefined }
            : { done: false, value };
        },
        async return() {
          await reader.cancel();
          reader.releaseLock();
          return { done: true, value: undefined };
        },
      };
    },
  };
}
