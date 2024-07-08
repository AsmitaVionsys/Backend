// require ('dotenv').config({path: './env'})
// import dotenv from 'dotenv'
import connectDB from "./db/index.js";

import dotenv from 'dotenv';

dotenv.config({ path: './env' });



connectDB()
.then(() => {
    app.listen(process.env.PORT || 5173, () => {
        console.log(`Server is running at port ${process.env.PORT}`);
        app.on("error", (error) => {
            console.log("Error: ", error);
            throw error
        })
    })
})
.catch((err) => {
    console.log("MongoDB connection failed !!! ", err);
})