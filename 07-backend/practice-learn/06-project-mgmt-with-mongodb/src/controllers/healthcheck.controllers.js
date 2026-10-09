import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

const healthCheck = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, {
        message: "Server is running"
    }, "OK"))
})

export { healthCheck };
    