import { User } from "../types/user";
import { clearUserSession } from "./fcmTokenManager";

let currentUser: User | null = null;

export const setCurrentUser = (user: User | null) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

export const signOut = () => {
  currentUser = null;
  clearUserSession();
};
