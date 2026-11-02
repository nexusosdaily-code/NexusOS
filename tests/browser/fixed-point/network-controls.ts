// Disposable native I/O probes. Imported only by this isolated test fixture.
export function attemptNetwork(kind: "fetch" | "websocket", url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Run in a normal page task, not the automation debugger's evaluation task.
    setTimeout(() => {
      const timeout = setTimeout(() => reject(Error("Native I/O probe did not settle")), 5000);
      const finish = (result: string) => { clearTimeout(timeout); resolve(result); };
      if (kind === "fetch") {
        fetch(url, { credentials: "omit" }).then(
          response => finish(`http-${response.status}`),
          () => finish("fetch-rejected"),
        );
      } else {
        try {
          const socket = new WebSocket(url);
          socket.onopen = () => { socket.close(); finish("socket-opened"); };
          socket.onerror = () => finish("socket-error");
          socket.onclose = () => finish("socket-closed");
        } catch (error) {
          if (error instanceof DOMException && error.name === "SecurityError") finish("socket-security-error");
          // Gecko's native CSP refusal can use this non-DOMException name.
          // The harness must independently require the target's CSP event.
          else if (String(error).includes("NS_ERROR_CONTENT_BLOCKED")) finish("socket-native-rejection");
          else { clearTimeout(timeout); reject(Error(String(error))); }
        }
      }
    }, 0);
  });
}
