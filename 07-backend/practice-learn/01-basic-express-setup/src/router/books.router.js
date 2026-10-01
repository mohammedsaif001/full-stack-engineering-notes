import express from 'express';
import controller from "../controllers/books.controller.js";

const router = express.Router();

router.route("/").get(controller.getAllBooks).post(controller.createNewBook);

router
  .route("/:id")
  .get(controller.getBookById)
  .delete(controller.deleteBook)
  .put(controller.updateBookPUT)
  .patch(controller.updateBookPATCH);



export default router;