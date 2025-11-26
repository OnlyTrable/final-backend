import express from "express";
import cors from "cors";

import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";


const startServer = (): void => {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.static("public"));

    app.use(notFoundHandler);
    app.use(errorHandler);

    const port: number = Number(process.env.PORT) || 3000;
    app.listen(port, ()=> console.log(`Server running on ${port} port`));
}

export default startServer;