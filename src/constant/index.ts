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
  SUCCESS_REQUEST: "successfully request send",
  NOT_FOUND: "data not found",
  FETCH_SUCCESS: "data fetched successfully",
  ACTIVE: "active",
  INACTIVE: "inactive",
  YES: "yes",
  NO: "no",
  VETO: "veto",
  ABSTAIN: "abstain",
  DEACTIVATING: "deactivating",
  BOND_STATUS_BONDED: "BOND_STATUS_BONDED",
  BOND_STATUS_UNBONDED: "BOND_STATUS_UNBONDED",
  BOND_STATUS_UNBONDING: "BOND_STATUS_UNBONDING",
  ERROR_FETCH_LATEST_BLOCK: "error while fetching latest block",
  ERROR: "Oops! Something went wrong. Please try again.",
  SERVER_ERROR: "internal server error",
  TRANSACTION_FETCH_SUCCESS: "transaction fetched successfully",
  PROPOSAL_FETCH_SUCCESS: "proposal fetched successfully",
  TRANSACTION_NOT_FOUND: "transaction not found",
  PROPOSAL_NOT_FOUND: "proposal not found",
  NOT_VALID_QUERY: "invalid block number",
  BLOCK_TRANSACTION_FETCH: "block transactions fetched successfully",
  ACCOUNT_HISTORY_SUCCESS: "account history fetched successfully",
  TRANSACTION_HISTORY_SUCCESS: "transaction history fetched successfully",
  TRANSACTION_FAILED: "transaction failed",
  TRANSACTION_CREATE_SUCCESS: "transaction created successfully",
  SUCCESS: "success",
  CONTRACT_NOT_FOUND: "contract not found",
  CONTRACT: "contract fetched successfully",
  CONTRACT_TX: "conract transaction fetched successfully",
  CONTRACT_TX_NOT_FOUND: "data not found",
  INVALID_ADDRESS: "invalid address",
  INVALID_MESSAGE: "this message type data not found ",
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

export const REDIS_KEY = {
  TOKEN_PRICE: "TOKEN_PRICE",
  PENDING_TX: "PENDING_TRANSACTION",
  TPS_GRAPH: "TPS_GRAPH_PAYLOAD",
  TOKEN_GRAPH: "TOKEN_GRAPH_PAYLOAD",
  ACCOUNT_GRAPH: "ACCOUNT_GRAPH_PAYLOAD",
  COIN_TRANSFER_GRAPH: "COIN_TRANSFER_GRAPH_PAYLOAD",
  CONTRACT_DEPLOY_GRAPH: "CONTRACT_DEPLOY_GRAPH_PAYLOAD",
  CIRCULATING_SUPPLY: "CIRCULATING_SUPPLY",
  MARKET_CAP: "MARKET_CAP",
  TOTAL_BLOCKS: "TOTAL_BLOCKS",
  TOTAL_TX: "TOTAL_TX",
  TOTAL_TOKENS: "TOTAL_TOKENS",
  TOTAL_ACCOUNTS: "TOTAL_ACCOUNTS",
  TOTAL_TOKEN_PRICE: "TOTAL_TOKEN_PRICE",
  TOTAL_COIN_TRANSFER_TX: "TOTAL_COIN_TRANSFER_TX",
  TOTAL_CONTRACT_DEPLOYED_TX: "TOTAL_CONTRACT_DEPLOYED_TX",
  TOTAL_CONTRACT_LOGS: "TOTAL_CONTRACT_LOGS",
  VALIDATOR_DATA: "VALIDATOR_DATA",
  TOTAL_REWARDS: "TOTAL_REWARDS",
  USER_BALANCE: "USER_BALANCE",
  INFLATION_APY: "INFALTION_AND_APY",
  NATIVE_BLOCKS_COUNT: "NATIVE_BLOCKS_COUNT",
  NATIVE_SESSIONS_COUNT: "SESSION_COUNT",
  NATIVE_TRANSACTIONS_COUNT: "NATIVE_TRANSACTIONS_COUNT",
  DASHBOARD_DATA: "DASHBOARD_DATA",
  COIN_PRICE: "COIN_PRICE",
  LATEST_BLOCK: "LATEST_BLOCK",
};

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
export const WALLET_PREFIX="qubetics";

export const Message = {
  nodesave: 'Nodes saved with geo info',
  invalidurl: 'Invalid URL format',
  receiveplan: 'Received plans is not an array',
  plansave: 'Plans saved successfully',
  NodatFetch: 'Failed to fetch',
};