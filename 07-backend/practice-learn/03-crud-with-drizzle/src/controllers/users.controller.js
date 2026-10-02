import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { usersTable } from "../models/users.models.js";

// Helper function to validate UUID format
const isValidUUID = (uuidStr) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuidStr === "string" && uuidRegex.test(uuidStr);
};

// Helper function to validate Email format
const isValidEmail = (emailStr) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof emailStr === "string" && emailRegex.test(emailStr);
};

const getAllUsers = async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    return res.status(200).json({
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createNewUser = async (req, res) => {
  try {
    const { name, age, email } = req.body || {};

    // 1. Validate required fields
    if (!name || age === undefined || !email) {
      return res.status(400).json({
        error: "Missing required fields. 'name', 'age', and 'email' are required.",
      });
    }

    // 2. Validate types and values
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "'name' must be a non-empty string." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
      return res.status(400).json({ error: "'age' must be a positive integer." });
    }

    // 3. Insert into database
    const [user] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        age: parsedAge,
        email: email.trim().toLowerCase(),
      })
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });

    return res.status(201).json({ data: user, message: "User Created Successfully" });
  } catch (error) {
    const pgError = error.cause || error;

    // Duplicate email error
    if (pgError.code === "23505") {
      return res.status(409).json({ error: "A user with this email already exists." });
    }

    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid User ID format (must be a valid UUID)." });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({ data: user, message: "User fetched Successfully" });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid User ID format (must be a valid UUID)." });
    }

    const [user] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({ data: user, message: "User Deleted Successfully" });
  } catch (error) {
    const pgError = error.cause || error;

    // Foreign key violation (user has dependent books)
    if (pgError.code === "23503") {
      return res.status(400).json({
        error: "Cannot delete user because they have associated books.",
      });
    }

    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, email } = req.body || {};

    // 1. Validate UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid User ID format (must be a valid UUID)." });
    }

    // 2. Build update payload dynamically
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "'name' must be a non-empty string." });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }
      updateData.email = email.trim().toLowerCase();
    }

    if (age !== undefined) {
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
        return res.status(400).json({ error: "'age' must be a positive integer." });
      }
      updateData.age = parsedAge;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "At least one field ('name', 'age', or 'email') must be provided to update.",
      });
    }

    // 3. Update database
    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, age: usersTable.age });

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({ data: user, message: "User Updated Successfully" });
  } catch (error) {
    const pgError = error.cause || error;

    if (pgError.code === "23505") {
      return res.status(409).json({ error: "A user with this email already exists." });
    }

    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default {
  getAllUsers,
  createNewUser,
  getUserById,
  deleteUser,
  updateUser,
};

