export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; message: string };

export type AuthUserSnapshot = {
  id: string;
  email: string | null;
};
