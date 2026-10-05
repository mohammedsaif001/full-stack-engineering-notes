import db from "../db/index.js";
import { usersTable } from "../db/schema.js";

class UsersServices {
  static async getAllUsers() {
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

    return users;
  }
}

export default UsersServices;
