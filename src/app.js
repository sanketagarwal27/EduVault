import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

//routes import
import studentRouter from "./routes/student.routes.js";
import facultyRouter from "./routes/faculty.routes.js";
import institutionRouter from "./routes/institution.routes.js";
import certificationRouter from "./routes/certification.routes.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({
    limit: "16kb"
}))
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))
app.use(express.static("public"))
app.use(cookieParser())


//routes declaration
app.use("/EduVault/v1/student", studentRouter);
app.use("/EduVault/v1/faculty", facultyRouter);
app.use("/EduVault/v1/institution", institutionRouter)
app.use("/EduVault/v1/certification", certificationRouter);

export {app};