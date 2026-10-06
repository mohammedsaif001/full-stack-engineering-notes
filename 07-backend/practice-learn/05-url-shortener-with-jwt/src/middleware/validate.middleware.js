/**
 * Middleware factory that validates request body, query, and params against a Zod schema
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    return next();
  } catch (error) {
    if (error.name === "ZodError" || error.issues) {
      const formattedErrors = (error.issues || error.errors || []).map((err) => ({
        field: err.path.filter((p) => p !== "body" && p !== "query" && p !== "params").join("."),
        message: err.message,
      }));

      return res.status(400).json({
        message: "Validation error.",
        errors: formattedErrors,
      });
    }

    return res.status(400).json({
      message: error.message || "Invalid request data.",
    });
  }
};
