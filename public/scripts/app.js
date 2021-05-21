(() => {
  // src/client/scripts/handleWsMessage.ts
  var handleWsMessage = (messageString) => {
    const message = JSON.parse(messageString);
    if (message.type === "echo")
      return { type: "info", payload: message.payload };
    if (message.type === "info") {
      console.log(`[ws]: ${message.payload}`);
      return;
    }
    if (message.type === "abc") {
      return { type: "abc", payload: message.payload };
    }
    if (message.type === "gene") {
      return { type: "gene", payload: message.payload };
    }
    throw new Error(`Unknown message type: ${messageString}`);
  };

  // dependencies/statsFunc.ts
  var esperance = (...values) => {
    return values.reduce((prev, curr) => prev + curr) / values.length;
  };
  var variance = (...values) => {
    return esperance(...values.map((value) => value ** 2)) - esperance(...values) ** 2;
  };
  var covariance = (x, y) => {
    return esperance(...x.map((xi, index) => xi * y[index])) - esperance(...x) * esperance(...y);
  };
  var coeffMoindre2 = (x, y) => {
    const a = covariance(x, y) / variance(...x);
    const b = esperance(...y) - a * esperance(...x);
    return { a, b };
  };
  var incertitudesMoindre2 = (x, y) => {
    const N = x.length;
    const Sx2 = x.reduce((prev, cur) => prev + cur ** 2);
    const { a, b } = coeffMoindre2(x, y);
    const sy = Math.sqrt(1 / (N - 2) * x.reduce((prev, _cur, index) => prev + (y[index] - b - a * x[index]) ** 2));
    const delta = x.length * x.reduce((prev, cur) => prev + cur ** 2);
    const ua = 2 * Math.sqrt(sy * Math.sqrt(N / delta));
    const ub = 2 * Math.sqrt(sy * Math.sqrt(Sx2 / delta));
    return { ua, ub };
  };
  var r2 = (x, y) => {
    const fX = coeffMoindre2(x, y);
    const fY = coeffMoindre2(y, x);
    return fX.a * fY.a;
  };
  var moindre2 = (x, y) => {
    const { a, b } = coeffMoindre2(x, y);
    const { ua, ub } = incertitudesMoindre2(x, y);
    return { a, b, ua, ub, r2: r2(x, y) };
  };

  // src/client/scripts/app.ts
  var ws = new WebSocket("ws://localhost:3000");
  var data;
  var geneData;
  ws.onerror = (e) => {
    console.error(`[ws]: ${e}`);
  };
  ws.onopen = (_) => {
    console.log(`[ws]: Connected to ws://localhost:3000`);
    const message = { type: "echo", payload: "ready" };
    ws.send(JSON.stringify(message));
  };
  ws.onmessage = (e) => {
    const response = handleWsMessage(e.data);
    if (response?.type === "abc")
      data = response?.payload;
    if (response?.type === "gene")
      geneData = response?.payload;
    if (response !== void 0)
      ws.send(JSON.stringify({ type: "info", payload: "client recived" }));
  };
  var $ = (selector) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 1)
      return elements[0];
    return Array.from(elements);
  };
  var menuButtons = $("#abc-tabs>button");
  menuButtons.forEach((button) => {
    button.addEventListener("click", () => {
      menuButtons.forEach((e) => {
        e.classList.remove("active");
        if (e.value !== "")
          $(`#${e.value}`).style.display = "none";
      });
      button.classList.add("active");
      if (button.value !== "")
        $(`#${button.value}`).style.display = "block";
    });
  });
  var jsonAutoDownload = (data2, fileName) => {
    const json = JSON.stringify(data2);
    const uri = encodeURI(json);
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  var loadButton = $("#load-button");
  var folderPath = $("#folder-path");
  var forcedFocus = $("#forced-focus");
  var exportData = $("#export-data");
  loadButton.addEventListener("click", () => {
    if (loadButton.value === "abc") {
      const forcedFocusValues = forcedFocus.value?.split(",")?.map((e) => parseInt(e) ?? []);
      ws.send(JSON.stringify({
        type: "abc",
        payload: {
          path: folderPath.value,
          forcedFocus: forcedFocusValues
        }
      }));
    }
    if (loadButton.value === "gene") {
      ws.send(JSON.stringify({
        type: "gene",
        payload: {
          path: folderPath.value,
          config: { width: 10, rise: 5, fall: 5 }
        }
      }));
    }
  });
  exportData.addEventListener("click", () => {
    if (exportData.value === "abc")
      jsonAutoDownload(data, "abc.json");
    if (exportData.value === "gene")
      jsonAutoDownload(geneData, "gene.json");
  });
  if (window.location.pathname === "/gene") {
    $("#trace-graph").addEventListener("click", () => {
      const sortedGene = geneData.sort((prev, cur) => prev.voltage - cur.voltage);
      const trace = {
        x: sortedGene.map((e) => e.voltage),
        y: sortedGene.map((e) => e.mean),
        error_y: {
          type: "data",
          array: sortedGene.map((e) => e.sigma),
          visible: true
        },
        type: "scatter"
      };
      const data2 = [trace];
      const layout = {
        title: "\xC9talonnage g\xE9n\xE9rateur",
        showlegend: false,
        xaxis: {
          title: "Tension (mV)"
        },
        yaxis: {
          title: "Charge (pC)"
        }
      };
      Graph("gene-graph", data2, layout, { scrollZoom: true, editable: true });
      const stats = moindre2(sortedGene.map((e) => e.voltage), sortedGene.map((e) => e.mean));
      $("#gene-stats").innerText = JSON.stringify(stats).replaceAll("{", "{\n").replaceAll("}", "\n}").replaceAll(',"', ',\n"');
    });
  }
})();
//# sourceMappingURL=app.js.map
