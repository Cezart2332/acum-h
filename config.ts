const BASE_URL: string =
  process.env.REACT_APP_BASE_URL || "http://172.20.10.2:5298";

const PYTHON_AI_URL: string =
  process.env.REACT_APP_PYTHON_AI_URL || "http://172.20.10.2:8000";

const OPENROUTER_API_KEY: string =
  "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";

export { BASE_URL, OPENROUTER_API_KEY, PYTHON_AI_URL };
export default BASE_URL;
