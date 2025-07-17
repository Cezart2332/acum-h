const BASE_URL: string =
  process.env.REACT_APP_BASE_URL || "http://172.20.10.2:5298";

const AI_BASE_URL: string =
  process.env.REACT_APP_AI_URL || "http://172.20.10.2:5001";

export { AI_BASE_URL };
export default BASE_URL;
