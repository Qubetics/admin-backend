const requestCounts = new Map();

jest.mock("express-rate-limit", () => ({
  rateLimit: jest.fn((options) => {
    return (req: any, res: any, next: any) => {
      const key = req.ip || "default";
      const count = (requestCounts.get(key) || 0) + 1;
      requestCounts.set(key, count);

      if (count > options.max) {
        res.status(429);
        res.json(options.message);
      } else {
        next();
      }
    };
  }),
}));

import limiter from "../../src/helper/limiter.helper";
import { RATE_LIMITER_MESSAGE } from "../../src/constant";

const EXPECTED = {
  error: true,
  message: RATE_LIMITER_MESSAGE.TOO_MANY_REQUEST,
};

describe("Rate Limiter Middleware", () => {
  beforeEach(() => {
    requestCounts.clear();
  });

  it("calls next() when under limit", () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    limiter(req as any, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 429 and error message when limit exceeded", () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    for (let i = 0; i < RATE_LIMITER_MESSAGE.MAX + 1; i++) {
      limiter(req as any, res as any, next);
    }

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(EXPECTED);
  });
});
