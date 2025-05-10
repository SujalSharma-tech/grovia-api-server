import { generateToken } from "../middleware/AuthMiddleware.js";
import User from "../models/UserSchema.js";
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export async function login(req, res) {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password",
      });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist!" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }
    const token = generateToken({
      id: user._id,
      name: user.fullname,
      email: user.email,
    });
    res.json({
      success: true,
      user: {
        name: user.fullname,
        email: user.email,
        token,
        id: user._id,
      },
    });
  } catch (err) {
    return res
      .status(400)
      .json({ message: `Login Failed: ${err}`, success: false });
  }
}

export async function register(req, res) {
  const { fullname, email, password } = req.body;
  try {
    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter All fields",
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(404)
        .json({ success: false, message: "User Already Exists!" });
    }
    user = await User.insertOne({ fullname, email, password });
    const token = generateToken({
      id: user._id,
      name: user.fullname,
      email: user.email,
    });
    res
      .cookie("token", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        httpOnly: true,
      })
      .json({
        success: true,
        user: {
          name: user.fullname,
          email: user.email,
          token,
          id: user._id,
        },
      });
  } catch (err) {
    return res
      .status(400)
      .json({ message: `Register Failed: ${err}`, success: false });
  }
}

export async function handleGoogleLogin(req, res) {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).toUpperCase().slice(-2) +
        Math.random().toString(36).slice(-2);

      user = await User.create({
        email,
        fullname: name,
        password: randomPassword,
        googleId,
        isGoogleUser: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.isGoogleUser = true;
      await user.save();
    }

    const token = generateToken({
      id: user._id,
      name: user.fullname,
      email: user.email,
    });
    res
      .cookie("token", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        httpOnly: true,
      })
      .json({
        success: true,
        user: {
          name: user.fullname,
          email: user.email,
          token,
          id: user._id,
        },
      });
  } catch (err) {
    return res
      .status(400)
      .json({ message: `Login Failed: ${err}`, success: false });
  }
}
