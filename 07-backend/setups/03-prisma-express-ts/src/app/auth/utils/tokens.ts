import JWT from 'jsonwebtoken'

export interface UserTokenPayload {
  id: string;
}

const JWT_SECRET = "myjwtsecret";

export function createUserToken(payload: UserTokenPayload) {
  const token = JWT.sign(payload, JWT_SECRET);
  return token;
}

export function verifyUserToken(token: string) {
  try {
    const decodedToken = JWT.verify(token, JWT_SECRET) as UserTokenPayload;
    return decodedToken;
  } catch (error) {
    return null;
  }
}
