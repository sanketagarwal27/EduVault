import { Router } from "express";
import { verifyJwtInstitution } from "../middlewares/auth.middleware.js";
import {registerInstitute,
    loginInstitute,
    logoutInstitute,
    refreshAccessToken,
    changeInstitutePassword,
    getCurrentInstitute} from "../controllers/institution.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(upload.none(),registerInstitute);

router.route("/login").post(loginInstitute);

//Secured Routes
router.route("/logout").post(verifyJwtInstitution, logoutInstitute);

router.route("/refresh").post(refreshAccessToken);

router.route("/change-password").post(verifyJwtInstitution, changeInstitutePassword);

router.route("/").get(verifyJwtInstitution, getCurrentInstitute);

export default router;