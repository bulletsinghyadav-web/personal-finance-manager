/**
 * Returns an Express middleware that validates req[source] against a zod
 * schema, replacing it with the parsed (and coerced/defaulted) value on
 * success, or responding 422 with field-level errors on failure.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(422).json({
        error: {
          message: 'Validation failed',
          details: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
