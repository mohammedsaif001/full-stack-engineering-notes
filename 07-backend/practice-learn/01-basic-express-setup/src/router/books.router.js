import express from 'express';
import { BOOKS } from "../db/books.js";

const router = express.Router();

router
  .get("/", (req, res) => {
    const books = BOOKS;
    console.log(books);
    res.status(200).json({
      data: books,
      message: "Books Fetched Successfully",
    });
  })
  .post("/", (req, res) => {
    const body = req.body;

    if (!body) {
      res.status(400).json({
        message: "Invalid Request",
        data: [],
      });
      return;
    }

    const name = body.name || body.title;
    const { author } = body;

    if (!name || !author) {
      res.status(400).json({
        message: "Invalid Request: name/title and author are required",
        data: [],
      });
      return;
    }

    const newBook = {
      id: BOOKS.length > 0 ? Math.max(...BOOKS.map((b) => b.id)) + 1 : 1,
      name,
      author,
    };

    BOOKS.push(newBook);
    res.status(201).json({
      message: "Book Created Successfully",
      data: newBook,
    });
  });

router
  .get("/:id", (req, res) => {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      res.status(400).json({
        message: "Invalid Request",
        data: [],
      });
      return;
    }

    const book = BOOKS.find((item) => item.id === id);
    if (!book) {
      res.status(404).json({
        message: "Book Not Found",
        data: [],
      });
      return;
    }

    res.status(200).json({
      data: book,
      message: "Book Fetched Successfully",
    });
  })
  .delete("/:id", (req, res) => {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      res.status(400).json({
        message: "Invalid Request",
        data: [],
      });
      return;
    }

    const index = BOOKS.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({
        message: "Book Not Found",
        data: [],
      });
      return;
    }

    const [deletedBook] = BOOKS.splice(index, 1);

    res.status(200).json({
      data: deletedBook,
      message: "Book Deleted Successfully",
    });
  })
  .put("/:id", (req, res) => {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      res.status(400).json({
        message: "Invalid Request",
        data: [],
      });
      return;
    }

    const book = BOOKS.find((item) => item.id === id);
    if (!book) {
      res.status(404).json({
        message: "Book Not Found",
        data: [],
      });
      return;
    }

    const name = req.body.name || req.body.title;
    const { author } = req.body;

    if (name) {
      book.name = name;
    }
    if (author) {
      book.author = author;
    }

    res.status(200).json({
      data: book,
      message: "Book Updated Successfully",
    });
  })
  .patch("/:id", (req, res) => {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      res.status(400).json({
        message: "Invalid Request",
        data: [],
      });
      return;
    }

    const book = BOOKS.find((item) => item.id === id);
    if (!book) {
      res.status(404).json({
        message: "Book Not Found",
        data: [],
      });
      return;
    }

    const name = req.body.name || req.body.title;
    const { author } = req.body;

    if (name) {
      book.name = name;
    }
    if (author) {
      book.author = author;
    }

    res.status(200).json({
      data: book,
      message: "Book Updated Successfully",
    });
  });



export default router;