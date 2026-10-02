import { eq, ilike } from "drizzle-orm";
import db from "../db/index.js";
import { booksTable } from "../models/books.models.js";

// Helper function to validate UUID format
const isValidUUID = (uuidStr) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuidStr === "string" && uuidRegex.test(uuidStr);
};

const getAllBooks = async (req, res) => {
  try {
    const { q } = req.query;

    if (q) {
      const books = await db
        .select()
        .from(booksTable)
        .where(ilike(booksTable.description, `%${q}%`));
      return res.status(200).json({
        data: books,
        message: "Books Fetched Successfully",
      });
    }

    const books = await db.select().from(booksTable);
    return res.status(200).json({
      data: books,
      message: "Books Fetched Successfully",
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const createNewBook = async (req, res) => {
  try {
    const { title, description, authorId, genre } = req.body || {};

    // 1. Required fields validation
    if (!title || !authorId || !genre) {
      return res.status(400).json({
        error:
          "Missing required fields. 'title', 'authorId', and 'genre' are required.",
      });
    }

    // 2. Data type & format validation
    if (typeof title !== "string" || title.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "'title' must be a non-empty string." });
    }

    if (typeof genre !== "string" || genre.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "'genre' must be a non-empty string." });
    }

    if (!isValidUUID(authorId)) {
      return res
        .status(400)
        .json({ error: "Invalid 'authorId' format (must be a valid UUID)." });
    }

    // 3. Insert into database
    const [newBook] = await db
      .insert(booksTable)
      .values({
        title: title.trim(),
        description: description ? String(description).trim() : null,
        authorId,
        genre: genre.trim(),
      })
      .returning();

    return res.status(201).json({
      data: newBook,
      message: "Book Created Successfully",
    });
  } catch (error) {
    const pgError = error.cause || error;

    // Foreign Key constraint failure (authorId does not exist in users table)
    if (pgError.code === "23503") {
      return res.status(400).json({
        error: "Invalid 'authorId'. User does not exist.",
      });
    }

    console.error("Error creating book:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res
        .status(400)
        .json({ error: "Invalid Book ID format (must be a valid UUID)." });
    }

    const [book] = await db
      .select()
      .from(booksTable)
      .where(eq(booksTable.id, id));

    if (!book) {
      return res.status(404).json({ message: "Book Not Found" });
    }

    return res.status(200).json({
      data: book,
      message: "Book Fetched Successfully",
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res
        .status(400)
        .json({ error: "Invalid Book ID format (must be a valid UUID)." });
    }

    const [deletedBook] = await db
      .delete(booksTable)
      .where(eq(booksTable.id, id))
      .returning();

    if (!deletedBook) {
      return res.status(404).json({ message: "Book Not Found" });
    }

    return res.status(200).json({
      data: deletedBook,
      message: "Book Deleted Successfully",
    });
  } catch (error) {
    console.error("Error deleting book:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, authorId, genre } = req.body || {};

    if (!isValidUUID(id)) {
      return res
        .status(400)
        .json({ error: "Invalid Book ID format (must be a valid UUID)." });
    }

    const updateData = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res
          .status(400)
          .json({ error: "'title' must be a non-empty string." });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (genre !== undefined) {
      if (typeof genre !== "string" || genre.trim().length === 0) {
        return res
          .status(400)
          .json({ error: "'genre' must be a non-empty string." });
      }
      updateData.genre = genre.trim();
    }

    if (authorId !== undefined) {
      if (!isValidUUID(authorId)) {
        return res
          .status(400)
          .json({ error: "Invalid 'authorId' format (must be a valid UUID)." });
      }
      updateData.authorId = authorId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error:
          "At least one field ('title', 'description', 'genre', or 'authorId') must be provided to update.",
      });
    }

    const [updatedBook] = await db
      .update(booksTable)
      .set(updateData)
      .where(eq(booksTable.id, id))
      .returning();

    if (!updatedBook) {
      return res.status(404).json({ message: "Book Not Found" });
    }

    return res.status(200).json({
      data: updatedBook,
      message: "Book Updated Successfully",
    });
  } catch (error) {
    const pgError = error.cause || error;

    if (pgError.code === "23503") {
      return res.status(400).json({
        error: "Invalid 'authorId'. User does not exist.",
      });
    }

    console.error("Error updating book:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default {
  getAllBooks,
  createNewBook,
  getBookById,
  deleteBook,
  updateBook,
  updateBookPUT: updateBook,
  updateBookPATCH: updateBook,
};
