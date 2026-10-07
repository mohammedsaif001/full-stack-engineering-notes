import { validationResult } from "express-validator"
import { ApiError } from "../utils/api-error";

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) next();

    const extractedErrors = errors.array().map((err) => {
        return { [err.path]: err.msg }
    });

    throw new ApiError(422, "Received invalid arguments", extractedErrors)
}