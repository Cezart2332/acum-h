import Constants from "expo-constants";

// Get configuration from app.json extra config or environment variables
const getConfig = () => {
  const extra = Constants.expoConfig?.extra || {};

  return {
    backendBaseUrl:
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
      extra.backendBaseUrl ||
      "https://api.acoomh.ro",
    pythonAiUrl:
      process.env.EXPO_PUBLIC_PYTHON_AI_URL ||
      extra.pythonAiUrl ||
      "http://172.20.10.2:8000",
    openrouterApiKey:
      process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
      extra.openrouterApiKey ||
      "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",
  };
};

const config = getConfig();

const BASE_URL: string = config.backendBaseUrl;
const PYTHON_AI_URL: string = config.pythonAiUrl;
const OPENROUTER_API_KEY: string = config.openrouterApiKey;

export { BASE_URL, OPENROUTER_API_KEY, PYTHON_AI_URL };
export default BASE_URL;
