import Joi from "joi";
import BaseDto from "../../../dto/base.dto.js";

class ResetPasswordDto extends BaseDto {
    static schema = Joi.object({
        password: Joi.string()
      .min(8)
      .pattern(/(?=.*[A-Z])(?=.*\d)/)
      .message(
        "Password must contain at least one uppercase letter and one digit",
      )
      .required(),
    })
}

export default ResetPasswordDto;