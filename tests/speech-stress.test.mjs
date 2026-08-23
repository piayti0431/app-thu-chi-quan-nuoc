import assert from "node:assert/strict";

let importId = 0;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadSpeech(overrides = {}) {
  const calls = {
    start: 0,
    stop: 0,
    remove: 0,
    requestPermissions: 0,
    handlers: {},
  };

  const plugin = {
    available: overrides.available || (async () => ({ available: true })),
    checkPermissions: overrides.checkPermissions || (async () => ({ speechRecognition: "granted" })),
    requestPermissions:
      overrides.requestPermissions ||
      (async () => {
        calls.requestPermissions += 1;
        return { speechRecognition: "granted" };
      }),
    addListener:
      overrides.addListener ||
      (async (event, handler) => {
        calls.handlers[event] = handler;
        return {
          remove: async () => {
            calls.remove += 1;
          },
        };
      }),
    start:
      overrides.start ||
      (() => {
        calls.start += 1;
        return new Promise(() => {});
      }),
    stop:
      overrides.stop ||
      (async () => {
        calls.stop += 1;
      }),
  };

  global.window = {
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: { SpeechRecognition: plugin },
    },
  };

  const module = await import(`../www/js/speech.js?stress=${Date.now()}-${importId++}`);
  return { ...module, calls, plugin };
}

async function assertFast(promise, label, ms = 140) {
  await Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} bị kẹt quá ${ms}ms`)), ms)),
  ]);
}

{
  const { batDauNghe, dungNghe, calls } = await loadSpeech();
  await batDauNghe(() => {}, () => {});
  await Promise.all([
    batDauNghe(() => {}, () => {}),
    batDauNghe(() => {}, () => {}),
    batDauNghe(() => {}, () => {}),
  ]);
  assert.equal(calls.start, 1, "bấm bật mic nhiều lần chỉ được start native một lần");
  await dungNghe();
  console.log("PASS mic double-start guard");
}

{
  let releasePermission;
  const permissionGate = new Promise((resolve) => {
    releasePermission = resolve;
  });
  const { batDauNghe, dungNghe, calls } = await loadSpeech({
    checkPermissions: async () => {
      await permissionGate;
      return { speechRecognition: "granted" };
    },
  });

  const started = batDauNghe(() => {}, () => {});
  await delay(20);
  await assertFast(dungNghe(), "stop trong lúc đang xin quyền", 2200);
  releasePermission();
  await started;
  await delay(20);

  assert.equal(calls.start, 0, "stop trong lúc start chưa xong không được gọi native start muộn");
  assert.equal(calls.stop, 1);
  console.log("PASS mic stop while permission pending");
}

{
  const { batDauNghe, dungNghe, calls } = await loadSpeech({
    start: () => {
      calls.start += 1;
      return Promise.resolve({ matches: ["2 ly nuoc mia 10k"] });
    },
    stop: async () => {
      calls.stop += 1;
      throw new Error("native stop failed");
    },
  });
  const received = [];
  await batDauNghe((result) => received.push(result), () => {});
  await assertFast(dungNghe(), "stop native lỗi", 2200);
  assert.equal(calls.stop, 1);
  assert.equal(received.filter((item) => item.isFinal).length, 1);
  console.log("PASS mic stop error is contained");
}

{
  const { batDauNghe, dungNghe, calls } = await loadSpeech({
    start: () => {
      calls.start += 1;
      return Promise.reject(new Error("native start failed"));
    },
  });
  let errors = 0;
  await batDauNghe(() => {}, () => {
    errors += 1;
  });
  await delay(20);
  assert.equal(errors, 1, "start lỗi phải gọi callback lỗi");

  calls.start = 0;
  await batDauNghe(() => {}, () => {});
  assert.equal(calls.start, 1, "sau start lỗi vẫn bật mic lại được");
  await dungNghe();
  console.log("PASS mic restart after native start failure");
}

{
  const { batDauNghe, dungNghe, calls } = await loadSpeech({
    start: () => {
      calls.start += 1;
      return new Promise((resolve) => setTimeout(() => resolve({ matches: ["ket qua muon"] }), 2500));
    },
  });
  const received = [];
  await batDauNghe((result) => received.push(result), () => {});
  await dungNghe();
  await delay(2600);
  assert.equal(received.filter((item) => item.isFinal).length, 0, "kết quả quá muộn sau stop phải bị bỏ qua");
  console.log("PASS mic ignores very late final result");
}

{
  const { batDauNghe, dungNghe, calls } = await loadSpeech({
    start: () => {
      calls.start += 1;
      return Promise.resolve({ matches: ["2 ly nuoc mia"] });
    },
  });
  const received = [];
  await batDauNghe((result) => received.push(result), () => {});
  calls.handlers.partialResults?.({ matches: ["2 ly nuoc mia"] });
  calls.handlers.listeningState?.({ status: "stopped" });
  await dungNghe();
  assert.equal(received.filter((item) => item.isFinal).length, 1, "partial + state + stop không được duplicate final");
  console.log("PASS mic deduplicates final events");
}
