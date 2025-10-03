import { Router } from "express";
import { verifyJwtFaculty } from "../middlewares/auth.middleware.js";
import { verifyJwtStudent } from "../middlewares/auth.middleware.js";
import {uploadCertification,
    deleteCertification,
    getCertificationById,
    approveCertification} from "../controllers/certification.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/upload").post(verifyJwtStudent, upload.fields([
    {name: "certificate", maxCount: 1}
]), uploadCertification);

router.route("/delete").delete(verifyJwtStudent, deleteCertification);

router.route("/").get(verifyJwtStudent, getCertificationById);
//Can create a different route for faculty to get the certificate like: 
// router.route("faculty/").get(verifyJwtFaculty, getCertificateById);

router.route("/approve").post(verifyJwtFaculty, approveCertification);

export default router;