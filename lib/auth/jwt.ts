import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Type assertion: JWT_SECRET is guaranteed to be string after the check above
const JWT_SECRET_STRING = JWT_SECRET as string;

export interface JWTPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET_STRING, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET_STRING) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
