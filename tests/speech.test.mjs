import assert from "node:assert/strict";

let partialHandler = null;
let stopCalled = false;
let removeCount = 0;
let startOptions = null;
let startImpl = () => new Promise(() => {});

global.window = {
  Capacitor: {
    isNativePlatform: () => true,
    Plugins: {
      SpeechRecognition: {
        available: async () => ({ available: true }),
        checkPermissions: async () => ({ speechRecognition: "granted" }),
        addListener: async (event, handler) => {
          if (event === "partialResults") partialHandler = handler;
          return {
            remove: async () => {
              removeCount += 1;
            },
          };
        },
        start: (options) => {
          startOptions = options;
          return startImpl(options);
        },
        stop: async () => {
          stopCalled = true;
        },
      },
    },
  },
};

const { batDauNghe, dungNghe } = await import(`../www/js/speech.js?test=${Date.now()}`);

const received = [];
let error = null;

await Promise.race([
  batDauNghe((result) => received.push(result), (err) => {
    error = err;
  }),
  new Promise((_, reject) => setTimeout(() => reject(new Error("batDauNghe bi ket khi native start chua tra ve")), 100)),
]);

assert.equal(error, null);
assert.equal(typeof partialHandler, "function");
assert.deepEqual(startOptions, {
  language: "vi-VN",
  maxResults: 5,
  partialResults: true,
  popup: false,
});

partialHandler({ matches: ["1 ly nuoc mia", "1 ly nuoc mia 1 lit"] });
await dungNghe();

assert.equal(stopCalled, true);
assert.equal(removeCount, 2);
assert.deepEqual(received, [
  { text: "1 ly nuoc mia 1 lit", isFinal: false },
  { text: "1 ly nuoc mia 1 lit", isFinal: true },
]);

partialHandler = null;
stopCalled = false;
startImpl = () => new Promise((resolve) => setTimeout(() => resolve({ matches: ["1 ly nuoc mia", "1 ly nuoc mia 1 lit"] }), 20));
const receivedAfterStop = [];

await batDauNghe((result) => receivedAfterStop.push(result), (err) => {
  error = err;
});
await dungNghe();

assert.equal(stopCalled, true);
assert.deepEqual(receivedAfterStop, [{ text: "1 ly nuoc mia 1 lit", isFinal: true }]);

console.log("PASS speech native stop flow");
