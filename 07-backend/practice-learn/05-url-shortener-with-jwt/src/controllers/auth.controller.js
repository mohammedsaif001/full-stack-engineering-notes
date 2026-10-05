import AuthServices from "../services/auth.services.js";

class AuthController {
  static async signup(req, res) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
      }

      const user = await AuthServices.createUser({ name, email, password });

      return res.status(201).json({ user, message: "User created successfully." });
    } catch (error) {
      console.error("Signup Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error during signup." });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const result = await AuthServices.loginUser({ email, password });

      return res.status(200).json({
        userId: result.userId,
        sessionId: result.sessionId,
        message: "User logged in successfully.",
      });
    } catch (error) {
      console.error("Login Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error during login." });
    }
  }

  static async logout(req, res) {
    try {
      await AuthServices.logoutUser(req.user.id);
      return res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
      console.error("Logout Error:", error);
      return res.status(500).json({ message: "Internal server error during logout." });
    }
  }
}

export default AuthController;