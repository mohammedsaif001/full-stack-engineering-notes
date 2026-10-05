import UsersServices from "../services/users.services.js";

class UsersControllers {
  static async getAllUsers(req, res) {
    try {
      const users = await UsersServices.getAllUsers();
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
