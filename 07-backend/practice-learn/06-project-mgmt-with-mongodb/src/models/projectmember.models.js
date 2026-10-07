import { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants";

const projectMemberSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    role: {
        type: String,
        enum: AvailableUserRole,
        default: UserRolesEnum.MEMBER,
        required: true
    },
}, { timestamps: true })

export const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);