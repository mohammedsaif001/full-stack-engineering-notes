import ApiError from "../utils/api-error.js";

const validate = (DtoClass) => {
  return (req, res, next) => {
    const { errors, value } = DtoClass.validate(req.body);
    if (errors) {
      throw ApiError.badRequest(errors.join("; ")); //Explain wh directly throw and not with new keyword;
    }

    req.body = value;
    next();
  };
};

export default validate;
