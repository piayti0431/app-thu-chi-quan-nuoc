const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const email = process.env.NUOCMIA_TEST_EMAIL;
const password = process.env.NUOCMIA_TEST_PASSWORD;
if (!email || !password) {
  throw new Error("Can set NUOCMIA_TEST_EMAIL va NUOCMIA_TEST_PASSWORD truoc khi test login Android.");
}

const page = targets.find((target) => target.type === "page") || targets[0];
if (!page?.webSocketDebuggerUrl) {
  throw new Error("Khong tim thay WebView CDP target o cong 9222.");
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  const messageId = ++id;
  ws.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(messageId);
      reject(new Error(`CDP timeout: ${method}`));
    }, 20000);
    pending.set(messageId, { resolve, reject, timer });
  });
}

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (!data.id || !pending.has(data.id)) return;
  const item = pending.get(data.id);
  pending.delete(data.id);
  clearTimeout(item.timer);
  if (data.error) item.reject(new Error(JSON.stringify(data.error)));
  else item.resolve(data.result);
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

await send("Runtime.enable");
const script = `
  (async () => {
      const emailInput = document.querySelector("#authEmail");
      const passwordInput = document.querySelector("#authPassword");
      emailInput.value = ${JSON.stringify(email)};
      passwordInput.value = ${JSON.stringify(password)};
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#authLoginBtn").click();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return {
      authHidden: document.querySelector("#authScreen")?.hidden,
      appLocked: document.querySelector("#appShell")?.classList.contains("is-locked"),
      toast: document.querySelector("#toast")?.textContent,
      sync: document.querySelector("#syncStatus")?.textContent,
    };
  })()
`;

const result = await send("Runtime.evaluate", {
  expression: script,
  awaitPromise: true,
  returnByValue: true,
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
