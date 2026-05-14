import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET!;

export function generateToken(
  userId: string
) {
  return jwt.sign(
    {
      userId,
    },
    JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
}

export function verifyToken(
  token: string
) {
  try {
    return jwt.verify(
      token,
      JWT_SECRET
    );
  } catch {
    return null;
  }
}