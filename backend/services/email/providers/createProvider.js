import { createConsoleProvider } from "./consoleProvider.js";
import { createSesProvider } from "./sesProvider.js";

export function createProvider(config = {}) {
  const name = (config.provider || "console").toLowerCase();

  if (name === "ses") {
    return createSesProvider({
      region: config.awsRegion,
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
      configurationSet: config.configurationSet,
    });
  }

  return createConsoleProvider({ logger: config.logger });
}
