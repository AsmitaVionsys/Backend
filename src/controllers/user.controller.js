import { asyncHandler } from '../utils/asyncHandler.js';

const registerUser = asyncHandler (async (req, res) => {
    const {name}=req.body
    res.status(200).json ({
        message: "ok",
        name
    })
})

export { registerUser }