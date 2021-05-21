(() => {
  // src/client/scripts/handleWsMessage.ts
  var handleWsMessage = (messageString) => {
    const message = JSON.parse(messageString);
    if (message.type === "echo")
      return {type: "info", payload: message.payload};
    if (message.type === "info") {
      console.log(`[ws]: ${message.payload}`);
      return;
    }
    if (message.type === "parse") {
      return {type: "data", payload: JSON.parse(message.payload)};
    }
    throw new Error(`Unknown message type: ${messageString}`);
  };

  // src/client/scripts/app.ts
  var ws = new WebSocket("ws://localhost:3000");
  var data;
  ws.onerror = (e) => {
    console.error(`[ws]: ${e}`);
  };
  ws.onopen = (_) => {
    console.log(`[ws]: Connected to ws://localhost:3000`);
    const message = {type: "echo", payload: "ready"};
    ws.send(JSON.stringify(message));
  };
  ws.onmessage = (e) => {
    const response = handleWsMessage(e.data);
    if (response?.type === "data")
      data = response?.payload;
    if (response !== void 0)
      ws.send(JSON.stringify({type: "info", payload: "client recived"}));
  };
  var $ = (selector) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 1)
      return elements[0];
    return elements;
  };
  var loadButton = $("#load-button");
  var folderPath = $("#folder-path");
  var forcedFocus = $("#forced-focus");
  var exportData = $("#export-data");
  loadButton.addEventListener("click", () => {
    const forcedFocusValues = forcedFocus.value?.split(",")?.map((e) => parseInt(e) ?? []);
    ws.send(JSON.stringify({type: "parse", payload: {path: folderPath.value, forcedFocus: forcedFocusValues}}));
  });
  exportData.addEventListener("click", () => {
    console.log(data);
  });
})();
//# sourceMappingURL=app.js.map
