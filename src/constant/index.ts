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
  TOO_MANY_REQUEST: "You are doing too many request. Please try again after some time.",
  WINDOW_MS: 60 * 1000, // 1 minute in milliseconds
  MAX: 5, // 5 request in 1 minutes
};

export const RES_MSG = {
  WALLET_ADDRESS: "Address is not present",
  WALLET_ADDRESS_IS_NOT_PRESENT: "Wallet address is not present",
  NOT_VERIFY: "Unable to verify the wallet address.",
  NOT_PRESENT_ON_CHAIN: "Node address is not present on the chain",
  NOT_LINKED: "Node is not linked to this wallet address",
  UNABLE_TO_SAVE_THE_USER: "Unable to save user details.",
  UNABLE_TO_SEND_EMAIL: "Not able to send the email",
  NODE_IS_NOT_LINK: "Node is not linked",
  NODE_IS_LINK: "This node is already linked and cannot be linked again",
  UNABLE_TO_FIND_LOC: "Unable to find the location",
  PROVIDER_ADDRESS_IS_PRESENT: "Provider address is not present",
  NODE_ADRES_IS_NOT_PRESENT: "Node address is not present",
  LINK_REQUEST_IS_STILL: "Link request is still pending",
  UNLINK_REQUEST_IS_STILL: " Unlink request is still pending",
  NODE_REQUEST_ACTION_DONE_NO_EMAIL: "successfully action done but no email Address to send the email",
  NODE_REQUESTLIST: "successfully fetched the node request list",
  SUCCESS_REQUEST: "successfully request send",
  NOT_FOUND: "data not found",
  FETCH_SUCCESS: "data fetched successfully",
  USER_REGISTER_SUCCESS: "User registered successfully",
  LOGIN_FAILED: "Failed to login",
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
  UNAUTHORIZED: "invalid user",
  INVALID_HASH: "Invalid Transaction hash",
  INVALID_REQUEST: "invalid request type",
  NOT_ADMIN: "Access denied: user is not an admin",
  DISPOSBLE_EMAIL: "Sorry, but we do not accept your mail provider.",
  USER_NOT_FOUND: "User not found",
  NO_RECORDS: "No records found for the given address",
  ADDRESS_REQUIRED: "address parameter is required",
  INVALID_STATUS: "Invalid status value. Allowed: PENDING, APPROVED, REJECTED",
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
export const REQUEST_STATUS: any = {
  UNSPECIFIED: "UNSPECIFIED",
  REJECTED: "REJECTED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
};

export const provWalletPrefix = "qubeticsprov";
export const UNDEFINED = "undefined";
export const LINK = "Link";
export const UNLINK = "Unlink";
export const PENDING = "PENDING";
export const APPROVED = "APPROVED";
export const REJECTED = "REJECTED";
export const ACTIVE = "active";
export const INACTIVE = "inactive";
export const WALLET_PREFIX = "qubetics";
export const API_BASE_URL = "API_BASE_URL is not defined in environment variables";
export const CRON_WORKER = {
  NODE: "Running Node Worker cron job",
  PROVIDER: "Running Provider Worker cron job",
  NODE_REQUEST: "Running Node Request Worker cron job",
};

export const Message = {
  nodesave: "Nodes saved with geo info",
  invalidurl: "Invalid URL format",
  receiveplan: "Received plans is not an array",
  plansave: "Plans saved successfully",
  nodeFail: "Failed to fetch",
};

export const COOKIE_NAMES = {
  SESSION_ID: "session_id", // Cookie for Redis-backed sessions
};

export const CHAIN_METHOD = {
  PROVIDER_STATUS: "/qubetics.provider.v3.MsgUpdateProviderStatusRequest",
};

// emailTemplate.js
export const approveTemplate = () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap"
      rel="stylesheet"
    />
  </head>

  <body
    style="
      background-color: #0e0e0e;
      font-family: 'Montserrat', sans-serif;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
    "
  >
    <div
      style="
        background-color: #000;
        max-width: 642px;
        text-align: center;
        margin: 10px auto;
      "
    >
      <div style="padding: 50px 54px 0px 54px">
        <div style="text-align: center">
        <div style="font-size: 16px; margin-top: 40px; color: #a0a0a0">
          <p
            style="
              font-weight: 400;
              font-size: 20px;
              color: #ffffff;
              margin-top: 40px;
            "
          >
            Hello,
          </p>
          <div style="font-weight: 400; font-size: 16px">
            We’re excited to let you know that your
            <span style="font-weight: 700; color: #ffffff">Qubetics Node</span>
            as a Service has been registered successfully!
            <p>
              Your node is now part of the Qubetics dVPN ecosystem, contributing
              bandwidth and strengthening the decentralized network. With your
              node live, you are helping power a faster, more secure, and
              censorship-free internet for users worldwide.
            </p>
            <span style="font-weight: 700; color: #ffffff"
              >What happens next?</span
            >
            <ul style="text-align: left">
              <li>Your node will soon be visible in the Qubetics network.</li>
              <li>
                You can track its performance, bandwidth usage, and rewards
                directly from your dashboard.
              </li>
              <li>
                Our team may reach out if any additional information or
                verification is required.
              </li>
            </ul>
            <span style="font-weight: 700; color: #ffffff">Need Support?</span>
            <p>
              For node management guidance, visit our ${environment.gitbook_url} or
              contact us at ${environment.service_email}. Thank you for helping Qubetics
              build a secure, private, and user-powered decentralized internet.
            </p>
            <p>Best regards,</p>
            <span style="font-weight: 700; color: #ffffff"
              >The Qubetics Team</span
            >
          </div>
        </div>
        <div
          style="
            padding: 20px;
            background: #121212;
            font-size: 14px;
            font-weight: 500;
            color: #ffffff;
            margin-top: 40px;
          "
        >
          © 2025 All Rights Reserved QUBETICS.
        </div>
      </div>
    </div>

  </body>
</html>`;

export const rejectedTemplate = () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap"
      rel="stylesheet"
    />
  </head>

  <body
    style="
      background-color: #0e0e0e;
      font-family: 'Montserrat', sans-serif;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
    "
  >


    <div
    style="
      background-color: #000;
      max-width: 642px;
      text-align: center;
      margin: 10px auto;
    "
  >
    <div style="padding: 50px 54px 0px 54px">
      <div style="font-size: 16px; margin-top: 40px; color: #a0a0a0">
        <p
          style="
            font-weight: 400;
            font-size: 20px;
            color: #ffffff;
            margin-top: 40px;
          "
        >
          Hello
        </p>
        <div style="font-weight: 400; font-size: 16px">
          Thank you for applying to register your
          <span style="font-weight: 700; color: #ffffff">Qubetics Node</span>
          as a Service. After reviewing your submission, we regret to inform
          you that your registration request has been rejected.
          <span style="font-weight: 700; color: #ffffff"
            >This may have happened due to one of the following reasons:</span
          >
          <ul style="text-align: left">
            <li>
              Incomplete or incorrect information provided during
              registration.
            </li>
            <li>
              Node address or wallet details did not match the deployment
              script.
            </li>
            <li>Selected plan or bandwidth allocation was invalid.</li>
            <li>Additional verification is required to proceed.</li>
          </ul>

          <span style="font-weight: 700; color: #ffffff"
            >What you can do next:
          </span>
          <ul style="text-align: left">
            <li>
              Review your submitted details and ensure all fields are correct.
            </li>
            <li>
              Re-run the deployment script if necessary to generate a valid
              node address.
            </li>
            <li>
              Resubmit your registration form with accurate information.
            </li>
            <li>
              If you believe this rejection was an error, please reach out to
              our team for support.
            </li>
          </ul>
          <span style="font-weight: 700; color: #ffffff"
            >Need Assistance?</span
          >
          <p>
            For guidance, see our docs: ${environment.gitbook_url}. For help, contact: ${environment.service_email}. Thank you for supporting Qubetics dVPN — together, we’re building a secure and decentralized internet.
          </p>
          <p>Best regards,</p>
          <span style="font-weight: 700; color: #ffffff"
            >The Qubetics Team</span
          >
        </div>
      </div>
      <div
        style="
          padding: 20px;
          background: #121212;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          margin-top: 40px;
        "
      >
        © 2025 All Rights Reserved QUBETICS.
      </div>
    </div>
  </div>

  </body>
</html>
`;
