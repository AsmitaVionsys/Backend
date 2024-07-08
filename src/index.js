// require ('dotenv').config({path: './env'})
// import dotenv from 'dotenv'
import connectDB from "./db/index.js";

import dotenv from 'dotenv';

dotenv.config({ path: './env' });



connectDB()