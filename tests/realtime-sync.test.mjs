import assert from "node:assert/strict";

const store = new Map();
global.window = {
  addEventListener() {},
  removeEventListener() {},
  Capacitor: null,
  localStorage: {
    getItem(key) {
      return store.get(key) || null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  },
};
global.localStorage = global.window.localStorage;

let channelName = "";
let subscriptionConfig = null;
let realtimeHandler = null;
let removeChannelCalled = false;

global.window.supabase = {
  createClient() {
    return {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-1" } } } };
        },
      },
      channel(name) {
        channelName = name;
        return {
          on(event, config, handler) {
            subscriptionConfig = { event, config };
            realtimeHandler = handler;
            return this;
          },
          subscribe(callback) {
            callback?.("SUBSCRIBED");
            return this;
          },
        };
      },
      async removeChannel() {
        removeChannelCalled = true;
        return "ok";
      },
      from() {
        return {
          select() {
            return {
              order() {
                return {
                  async limit() {
                    return { data: [], error: null };
                  },
                };
              },
            };
          },
        };
      },
    };
  },
};

const { luuDuLieu } = await import("../www/js/db.js");
const { batDauRealtime, dungRealtime } = await import("../www/js/sync.js");

await luuDuLieu({
  sync: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnon: "anon-key",
    deviceId: "phone-a",
  },
  ds: [],
});

let callbackCount = 0;
const result = await batDauRealtime(async () => {
  callbackCount += 1;
});

assert.equal(result.ok, true);
assert.match(channelName, /giao-dich/);
assert.equal(subscriptionConfig.event, "postgres_changes");
assert.deepEqual(subscriptionConfig.config, { event: "*", schema: "public", table: "giao_dich" });

await realtimeHandler({ new: { device_id: "phone-b" } });
await realtimeHandler({ new: { device_id: "phone-a" } });
assert.equal(callbackCount, 1);

await dungRealtime();
assert.equal(removeChannelCalled, true);

console.log("PASS realtime sync: subscribes and ignores own device events");
