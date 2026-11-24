// =============================================================================
// FILE: src/services/authService.js
// DESKRIPSI: Service API untuk autentikasi dan data profil pengguna.
// ENDPOINT:
//  1. POST /api/auth/login  -> Mengirim kredensial dan menerima pasangan token.
//  2. POST /api/auth/logout -> Membatalkan refresh token di backend.
//  3. GET  /api/users/me    -> Mengambil detail profil dan role pengguna aktif.
// =============================================================================

import api from "../config/api";
import { getRefreshToken } from "../utils/auth";

/**
 * Mengirim kredensial login ke backend.
 * Backend mengembalikan format: { success, data: { accessToken, refreshToken }, message }
 * 
 * @param {Object} credentials - Objek berisi email/username dan password
 * @param {string} credentials.email - Username atau Email pengguna
 * @param {string} credentials.password - Kata sandi pengguna
 * @returns {Promise<{ accessToken: string, refreshToken: string }>} Pasangan token JWT
 */
export const loginUser = async ({ email, password }) => {
  const { data } = await api.post("/api/auth/login", {
    usernameOrEmail: email,
    password,
  });

  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  };
};

/**
 * Mengirim request logout ke backend untuk menganulir refresh token aktif.
 */
export const logoutUser = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  await api.post("/api/auth/logout", { refreshToken });
};

/**
 * Mengambil informasi data diri pengguna saat ini (current user).
 * Endpoint ini membutuhkan header `Authorization: Bearer <accessToken>`
 * yang secara otomatis dipasang oleh axios interceptor di `src/config/api.js`.
 * 
 * @returns {Promise<Object>} Data profil pengguna lengkap dengan role & nama
 */
export const getMe = async () => {
  const { data } = await api.get("/api/users/me");
  const me = data.data;

  // Normalisasi: Komponen Layout/ProfileDropdown memakai properti `name`,
  // sedangkan backend mengembalikan `fullName`.
  return { ...me, name: me.fullName };
};
