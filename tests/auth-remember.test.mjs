import assert from "node:assert/strict";

global.window = {
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  },
  addEventListener() {},
};
global.localStorage = global.window.localStorage;

const { AUTH_REMEMBER_DAYS } = await import("../www/js/sync.js");

assert.ok(AUTH_REMEMBER_DAYS >= 30, "Login must be remembered for at least 30 days");

console.log(`PASS auth remember: ${AUTH_REMEMBER_DAYS} days`);
