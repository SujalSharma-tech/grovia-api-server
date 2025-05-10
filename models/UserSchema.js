import mongoose from "mongoose";
import bcrypt from "bcrypt";
const UserSchema = new mongoose.Schema({
  fullname: {
    type: "String",
    required: [true, "Full name is required!"],
  },
  email: {
    required: [true, "Email is required!"],
    type: String,
    unique: true,
    lowercase: true,
  },
  password: {
    required: [true, "Password is required!"],
    type: String,
    minlength: [8, "Password must be of minimum 8 characters."],
  },
  isGoogleUser: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre("save", async function (next) {
  try {
    const hashedPass = await bcrypt.hash(this.password, 8);
    this.password = hashedPass;
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

const User = mongoose.model("User", UserSchema);
export default User;
