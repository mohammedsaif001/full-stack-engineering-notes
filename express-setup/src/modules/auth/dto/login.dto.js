import Joi from "joi";
import BaseDto from "../../../dto/base.dto.js";

class LoginDto extends BaseDto {
    static schema = Joi.object({
        email: Joi.string().email().lowercase().required(),
        password: Joi.string().min(8).required(),
    })
} 


export default LoginDto;