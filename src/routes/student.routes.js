import { Router } from "express";
import { verifyJwtStudent } from "../middlewares/auth.middleware.js";
import {registerStudent,
    loginStudent,
    logoutStudent,
    refreshAccessToken,
    changeStudentPassword,
    getCurrentStudent} from "../controllers/student.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(upload.none(), registerStudent);

router.route("/login").post(upload.none(), loginStudent);

//Secured Routes
router.route("/logout").post(verifyJwtStudent, logoutStudent);

router.route("/refresh").post(refreshAccessToken);

router.route("/change-password").post(upload.none(), verifyJwtStudent, changeStudentPassword);

router.route("/").get(verifyJwtStudent, getCurrentStudent);

export default router;