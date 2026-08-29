import { describe, it, expect } from "vitest";
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "../src/core/errors/app-error.js";

describe("AppError Classes", () => {
  it("should initialize NotFoundError with 404", () => {
    const error = new NotFoundError("User not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("User not found");
  });

  it("should initialize BadRequestError with 400", () => {
    const error = new BadRequestError("Invalid parameter");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
  });

  it("should initialize UnauthorizedError with 401", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("should initialize ForbiddenError with 403", () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("should initialize ConflictError with 409", () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("CONFLICT");
  });
});
