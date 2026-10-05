import db from "../db/index.js";
import { usersTable } from "../db/schema.js";

class UsersControllers {
  static async getAllUsers(req, res) {
    try {
      const users = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        })
        .from(usersTable);

      return res.status(200).json(users);
    } catch (error) {
      console.error("Get Users Error:", error);
      return res
        .status(500)
        .json({ message: "Internal server error while fetching users." });
    }
  }

  static async getProfile(req, res) {
    return res.status(200).json({ user: req.user });
  }
}

export default UsersControllers;

