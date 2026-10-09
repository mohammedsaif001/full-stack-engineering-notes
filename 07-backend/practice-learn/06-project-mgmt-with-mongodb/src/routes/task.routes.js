import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteTask,
  deleteSubTask,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
} from "../controllers/task.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createTaskValidator,
  updateTaskValidator,
  createSubtaskValidator,
} from "../validators/index.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole), getTasks)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    upload.array("attachments", 5),
    createTaskValidator(),
    validate,
    createTask,
  );

router
  .route("/:projectId/t/:taskId")
  .get(validateProjectPermission(AvailableUserRole), getTaskById)
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    upload.array("attachments", 5),
    updateTaskValidator(),
    validate,
    updateTask,
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    deleteTask,
  );

router
  .route("/:projectId/t/:taskId/subtasks")
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    createSubtaskValidator(),
    validate,
    createSubTask,
  );

router
  .route("/:projectId/st/:subTaskId")
  .put(validateProjectPermission(AvailableUserRole), updateSubTask)
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
    deleteSubTask,
  );

export default router;
