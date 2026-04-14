import argon2 from "argon2";

export const hashPassword = async (value: string): Promise<string> =>
  argon2.hash(value, {
    type: argon2.argon2id,
  });

export const verifyPassword = async (
  plainText: string,
  hash: string,
): Promise<boolean> =>
  argon2.verify(hash, plainText);
