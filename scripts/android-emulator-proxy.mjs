import http from "node:http";
import net from "node:net";
import { URL } from "node:url";

const port = Number(process.env.NUOCMIA_ANDROID_PROXY_PORT || 8888);

const server = http.createServer((req, res) => {
  const target = new URL(req.url);
  const upstream = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers: req.headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", () => {
    res.writeHead(502);
    res.end("Proxy upstream error");
  });

  req.pipe(upstream);
});

server.on("connect", (req, clientSocket, head) => {
  const [host, rawPort] = req.url.split(":");
  const upstream = net.connect(Number(rawPort || 443), host, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head?.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  upstream.on("error", () => {
    clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Android emulator proxy dang chay o cong ${port}`);
});
