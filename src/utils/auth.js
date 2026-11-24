// =============================================================================
// FILE: src/utils/auth.js
// DESKRIPSI: Utilitas penyimpanan dan manajemen sesi autentikasi pengguna.
// PENYIMPANAN:
//  - Access Token  : Disimpan di Cookie browser (session cookie, hilang saat browser ditutup).
//  - Refresh Token : Disimpan di Cookie browser (expires: 7 hari).
//  - User Profile  : Disimpan di localStorage (agar data user tetap tersimpan saat reload).
// =============================================================================

import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

// Masa berlaku refresh token di browser (7 hari, disesuaikan dengan backend)
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

const cookieOptions = {
  secure: window.location.protocol === "https:",
  sameSite: "strict",
};

/**
 * Menyimpan seluruh sesi login baru ke dalam Cookie & LocalStorage.
 * 
 * @param {Object} session - Data sesi baru
 * @param {string} session.accessToken - JWT token akses jangka pendek
 * @param {string} session.refreshToken - JWT token refresh jangka panjang
 * @param {Object|null} session.user - Data profil user (opsional)
 */
export const setAuthSession = ({ accessToken, refreshToken, user }) => {
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, cookieOptions);
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
    ...cookieOptions,
    expires: REFRESH_TOKEN_EXPIRES_DAYS,
  });
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Memperbarui token saja (digunakan saat interceptor me-refresh access token).
 */
export const setTokens = ({ accessToken, refreshToken }) => {
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, cookieOptions);
  if (refreshToken) {
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
      ...cookieOptions,
      expires: REFRESH_TOKEN_EXPIRES_DAYS,
    });
  }
};

/**
 * Menyimpan atau memperbarui data profil pengguna ke localStorage.
 */
export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Menghapus seluruh sesi autentikasi (logout atau sesi kedaluwarsa).
 */
export const clearAuthSession = () => {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Mengambil access token aktif dari cookie.
 */
export const getAccessToken = () => Cookies.get(ACCESS_TOKEN_KEY) || null;

/**
 * Mengambil refresh token aktif dari cookie.
 */
export const getRefreshToken = () => Cookies.get(REFRESH_TOKEN_KEY) || null;

/**
 * Mengambil profil user yang tersimpan di localStorage.
 */
export const getUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Memeriksa apakah pengguna saat ini terautentikasi.
 * Selama refresh token masih ada, sesi dianggap valid/bisa di-refresh.
 */
export const isAuthenticated = () => {
  return !!getRefreshToken();
};

/**
 * Memeriksa apakah user saat ini login sebagai akun tamu (Guest).
 */
export const isGuestUser = () => {
  const user = getUser();
  const token = getAccessToken();
  return (
    !user ||
    user.email === "guest@koribali.com" ||
    user.role === "guest" ||
    token === "guest-session-token"
  );
};

/**
 * Memeriksa akun guest berdasarkan email / username.
 */
export const isGuestAccount = () => {
  const user = getUser();
  return Boolean(
    user?.email === "guest@gmail.com" ||
    user?.username === "guest" ||
    user?.email === "guest@koribali.com" ||
    user?.role === "guest"
  );
};
