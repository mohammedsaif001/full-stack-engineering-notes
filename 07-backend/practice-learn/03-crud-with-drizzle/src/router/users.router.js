import express from 'express';
import controller from "../controllers/users.controller.js";

const router = express.Router();

router.route("/").get(controller.getAllUsers).post(controller.createNewUser);

router
  .route("/:id")
  .get(controller.getUserById)
  .delete(controller.deleteUser)
  .patch(controller.updateUser);

export default router;