import Joi from "joi";

class BaseDto {
    static schema = Joi.object({})  //overriding intital joi object with empty object to avoid errors when extending this class
    

    static validate(data) {
        const { error, value } = this.schema.validate(data, {
            abortEarly: false, // Validate all fields and return all errors
            stripUnknown: true, // Remove unknown fields from the validated data
        })        

        if (error) {
            const errors = - error.details.map((d) => d.message);
            return {errors,value:null}
        }

        return {error:null, value}
    }
}


export default BaseDto;