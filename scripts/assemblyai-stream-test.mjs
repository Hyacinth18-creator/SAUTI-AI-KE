import WebSocket from "ws";
import querystring from "node:querystring";

const API_KEY = process.env.ASSEMBLYAI_API_KEY;
const STREAM_URL = "https://14123.live.streamtheworld.com/WBBRAMAAC.aac";
const RUN_MS = 25_000;

if (!API_KEY) {
  console.error("Missing ASSEMBLYAI_API_KEY in the environment.");
  process.exit(1);
}

const params = { speech_model: "universal-3-5-pro", encoding: "aac" };
const endpoint = `wss://streaming.assemblyai.com/v3/ws?${querystring.stringify(params)}`;
const ws = new WebSocket(endpoint, { headers: { Authorization: API_KEY } });

ws.on("open", async () => {
  console.log("Connected. Streaming live radio for ~25 seconds.");

  try {
    const response = await fetch(STREAM_URL, { signal: AbortSignal.timeout(RUN_MS) });
    if (!response.ok || !response.body) throw new Error(`Stream returned HTTP ${response.status}`);
    const reader = response.body.getReader();
    while (ws.readyState === WebSocket.OPEN) {
      const { value, done } = await reader.read();
      if (done) break;
      ws.send(value);
    }
  } catch (error) {
    if (error.name !== "TimeoutError" && error.name !== "AbortError") console.error("\nSource error:", error.message);
  } finally {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "Terminate" }));
  }
});

ws.on("message", (message) => {
  const data = JSON.parse(message);
  if (data.type === "Turn") process.stdout.write(data.end_of_turn ? `${data.transcript}\n` : `\r${data.transcript}`);
});

ws.on("error", (error) => console.error("\nAssemblyAI error:", error.message));
ws.on("close", () => {
  console.log("\nDisconnected.");
  process.exit();
});