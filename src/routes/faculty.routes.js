import { Router } from "express";
import { verifyJwtFaculty, verifyJwtStudent } from "../middlewares/auth.middleware.js";
import {registerFaculty,
    loginFaculty,
    logoutFaculty,
    refreshAccessToken,
    changeFacultyPassword,
    getCurrentFaculty,
    searchFaculty} from "../controllers/faculty.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(upload.none(), registerFaculty);

router.route("/login").post(upload.none(), loginFaculty);

//Secured Routes
router.route("/logout").post(verifyJwtFaculty, logoutFaculty);

router.route("/refresh").post(refreshAccessToken);

router.route("/change-password").post(upload.none(), verifyJwtFaculty, changeFacultyPassword);

router.route("/").get(verifyJwtFaculty, getCurrentFaculty);

router.route("/search").get(verifyJwtStudent, searchFaculty);

export default router;