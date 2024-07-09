// require ('dotenv').config({path: './env'})
// import dotenv from 'dotenv'
import connectDB from "./db/index.js";

import dotenv from 'dotenv';
import { app } from "./app.js";

dotenv.config({ path: './env' });



connectDB()
.then(() => {
    const PORT = process.env.PORT || 5173;
    app.listen(PORT, () => {
        console.log(`Server is running at port ${PORT}`);
        app.on("error", (error) => {
            console.log("Error: ", error);
            throw error
        })
    })
})
.catch((err) => {
    console.log("MongoDB connection failed !!! ", err);
})