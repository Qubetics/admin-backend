export const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export const RESPONSES = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NOCONTENT: 204,
  BADREQUEST: 400,
  UN_AUTHORIZED: 401,
  FORBIDDEN: 403,
  NOTFOUND: 404,
  TIMEOUT: 408,
  TOO_MANY_REQ: 429,
  INTERNAL_SERVER: 500,
  BADGATEWAYS: 502,
  SERVICEUNAVILABLE: 503,
  GATEWAYTIMEOUT: 504,
};

export const RATE_LIMITER_MESSAGE = {
  TOO_MANY_REQUEST:
    "You are doing too many request. Please try again in 5 minutes.",
  WINDOW_MS: 5 * 60 * 1000, // 5 minutes  600000, // 10 minutes in milliseconds
  MAX: 20, // 20 request in 10 minutes
};

export const RES_MSG = {
  NODE_REQUESTLIST: "successfully fetched the node request list",
  SUCCESS_REQUEST: "successfully request send",
  NOT_FOUND: "data not found",
  FETCH_SUCCESS: "data fetched successfully",
  USER_REGISTER_SUCCESS :"User registered successfully",
  LOGIN_FAILED : "Failed to login",
  LOGOUT_SUCCESS: "Logged out successfully",
  EMAIL_SENT_SUCCESS: "Email sent successfully",
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "Oops! Something went wrong. Please try again.",
  SERVER_ERROR: "internal server error",
  SUCCESS: "success",
  CONTRACT_TX_NOT_FOUND: "data not found",
  INVALID_ADDRESS: "invalid address",
  INVALID_MESSAGE: "this message type data not found ",
  UNAUTHORIZED:"invalid user"
};


export const CONST_NAME = {
  TOTAL_NODE: "total_node_res",
  LATEST_BLOCK: "latestBlock",
  FEES: 5,
  THOUSAND: 1000,
  HUNDRED: 100,
  ZERO: 0,
  ONE: 1,
  SLICED_VALUE: 200,
  MAX_FEES: 8,
  MAX_PRIORIY_FEES: 8,
  GAS: 21000,
  EXPIRE_TIME: 24 * 60 * 60,
  SUCCESS_STATUS: "success",
  FAILED_STATUS: "Failed",
  PENDING_STATUS: "Pending",
  NA: "N/A",
  YEAR_MILI_SEC: 31536000000,
  BLOCK_PER_YEAR: 365 * 24 * 60 * 60,
  ETH_EXP: 10 ** 18,
  NOT_FOUND: "not found",
  MARKET_CAP_PRICE: "MARKET_CAP_PRICE",
  BOND_STATUS: "BOND_STATUS_BONDED",
};

export const ASC = "asc";
export const DESC = "desc";

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export const FETCH_METHODS = {
  POST: "POST",
  GET: "GET",
  PATCH: "PATCH",
  PUT: "PUT",
};

export const HEADERS = {
  DEFAULT: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export const UNDEFINED = "undefined";
export const LINK= "Link";
export const PENDING = "PENDING";
export const ACTIVE = "ACTIVE";
export const INACTIVE = "INACTIVE";
export const WALLET_PREFIX="qubetics";
export const API_BASE_URL = 'API_BASE_URL is not defined in environment variables'
export const CRON_WORKER = 'Running Node Worker cron job'

export const Message = {
  nodesave: 'Nodes saved with geo info',
  invalidurl: 'Invalid URL format',
  receiveplan: 'Received plans is not an array',
  plansave: 'Plans saved successfully',
  nodeFail: 'Failed to fetch',
};

export const COOKIE_NAMES = {
  SESSION_ID: "session_id", // Cookie for Redis-backed sessions
};