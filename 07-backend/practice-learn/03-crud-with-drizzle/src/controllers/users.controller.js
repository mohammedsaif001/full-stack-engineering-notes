import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { usersTable } from "../models/users.models.js";

const getAllUsers = async (req, res) => {
  const users = await db.select().from(usersTable);
  res.json({
    data: users,
  });
};

const createNewUser = async (req, res) => {
  const { name, age, email } = req.body;
  const user = await db
    .insert(usersTable)
    .values({
      name,
      age,
      email,
    })
    .returning({ id: usersTable.id });
  res.status(201).json({ data: user, message: "User Created Successfully" });
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!user) {
    return res.status(404).json({ message: "User Not Found" });
  }
  res.status(200).json({ data: user, message: "User fetched Successfully" });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id });
  if (!user) {
    return res.status(404).json({ message: "User Not Found" });
  }
  res.status(200).json({ data: user, message: "User Deleted Successfully" });
};

const updateUser = async (req, res) => {
  const { name, age } = req.body;
  const { id } = req.params;
  const user = await db
    .update(usersTable)
    .set({
      name,
      age,
    })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id });
  res.status(200).json({ data: user, message: "User Updated Successfully" });
};

export default {
  getAllUsers,
  createNewUser,
  getUserById,
  deleteUser,
  updateUser,
};
