const BASE_URL: string =
  process.env.REACT_APP_BASE_URL || "http://192.168.178.167:5298";

const AI_BASE_URL: string =
  process.env.REACT_APP_AI_URL || "http://192.168.178.167:5000";

export { AI_BASE_URL };
export default BASE_URL;