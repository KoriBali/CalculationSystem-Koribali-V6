// =============================================================================
// FILE: src/pages/LoginPage.jsx
// DESKRIPSI: Halaman Autentikasi Pengguna (Login Page).
// FITUR:
//  1. Login Reguler (Input Username/Email & Password via Formik + Yup).
//  2. Login Akun Tamu Cepat (Quick Guest Login).
//  3. Auto-redirect jika pengguna sudah memiliki sesi login aktif.
//  4. Tampilan Wireframe Bersih (Kotak-kotak terstruktur tanpa dekorasi berat).
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";

// Service & Helper Autentikasi
import { loginUser, getMe } from "../services/authService";
import {
  setAuthSession,
  setUser,
  isAuthenticated,
  clearAuthSession,
} from "../utils/auth";

// =============================================================================
// 1. VALIDATION SCHEMA (YUP)
// Aturan validasi input sebelum data dikirimkan ke backend.
// =============================================================================
const loginValidationSchema = Yup.object({
  email: Yup.string().required("Email or username is required"),
  password: Yup.string().required("Password is required"),
});

export default function LoginPage() {
  const navigate = useNavigate();

  // ===========================================================================
  // 2. COMPONENT STATES
  // ===========================================================================
  // Toggle visibilitas karakter password (text / password)
  const [showPassword, setShowPassword] = useState(false);

  // Pesan error dari server jika autentikasi gagal
  const [loginError, setLoginError] = useState("");

  // Indikator loading khusus untuk tombol "Login as Guest"
  const [isGuestSigningIn, setIsGuestSigningIn] = useState(false);

  // ===========================================================================
  // 3. LIFECYCLE EFFECT (SESSION CHECK)
  // Memeriksa apakah pengguna sudah terautentikasi (ada refresh token).
  // Jika sudah login, langsung alihkan ke halaman utama (/project-tools).
  // ===========================================================================
  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/project-tools");
    }
  }, [navigate]);

  // ===========================================================================
  // 4. FUNCTION: GUEST LOGIN HANDLER
  // Menangani proses login otomatis satu klik menggunakan akun default guest.
  // ===========================================================================
  const handleGuestLogin = async () => {
    try {
      setIsGuestSigningIn(true);
      setLoginError("");

      // Bersihkan sesi atau cookie lama agar tidak terjadi konflik sesi
      clearAuthSession();

      // Langkah 1: Kirim kredensial akun guest ke endpoint POST /api/auth/login
      const { accessToken, refreshToken } = await loginUser({
        email: "guest@gmail.com",
        password: "password",
      });

      // Langkah 2: Simpan token baru ke cookie browser
      setAuthSession({ accessToken, refreshToken, user: null });

      // Langkah 3: Ambil informasi profil pengguna dari endpoint GET /api/users/me
      const user = await getMe();
      setUser(user);

      // Langkah 4: Berhasil login -> alihkan pengguna ke /project-tools
      navigate("/project-tools");
    } catch (error) {
      console.error("[handleGuestLogin] Guest login failed:", error);
      setLoginError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Failed to sign in as guest account.",
      );
    } finally {
      setIsGuestSigningIn(false);
    }
  };

  // ===========================================================================
  // 5. FORMIK: REGULAR LOGIN HANDLER
  // Mengelola state input formulir login, error validasi, dan event submit.
  // ===========================================================================
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setLoginError("");

        // Langkah 1: Kirim kredensial (username/email & password) ke backend
        const { accessToken, refreshToken } = await loginUser(values);

        // Langkah 2: Simpan access token & refresh token ke cookies
        setAuthSession({ accessToken, refreshToken, user: null });

        // Langkah 3: Ambil data pengguna terkini menggunakan access token yang baru
        const user = await getMe();
        setUser(user);

        // Langkah 4: Alihkan ke menu kalkulasi (/project-tools)
        navigate("/project-tools");
      } catch (error) {
        console.error("[formik.onSubmit] Regular login failed:", error);
        setLoginError(
          error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message ||
            "Access denied. Please check your credentials.",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  // ===========================================================================
  // 6. JSX RENDER (WIREFRAME VIEW)
  // Struktur layout terbagi menjadi 2 panel:
  // - Panel Kiri : Judul Sistem (Hero Title)
  // - Panel Kanan: Form Autentikasi (Brand Logo, Input Fields, & Action Buttons)
  // ===========================================================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans antialiased">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION: LEFT PANEL (HERO TITLE)                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center p-6 md:p-12 lg:p-20 bg-white border-b md:border-b-0 md:border-r border-gray-300 text-gray-900 md:min-h-screen">
        <div className="text-center md:text-left">
          <h2 className="text-[32px] leading-[1.15] md:text-5xl lg:text-[54px] font-semibold md:leading-[1.1] tracking-tight text-gray-900">
            Design
            <br />
            Calculation
            <br />
            System
          </h2>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION: RIGHT PANEL (AUTHENTICATION FORM)                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col px-6 py-8 sm:p-12 lg:px-24 lg:py-16 overflow-y-auto">
        
        {/* Sub-section: Brand Logo */}
        <div className="flex items-center mb-10 md:mb-20">
          <div className="flex items-center gap-3">
            <img
              src="/images/koribali-logo.webp"
              alt="Kori Bali Logo"
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
            <span className="text-[18px] md:text-[22px] font-bold text-gray-900 tracking-tight">
              KORIBALI
            </span>
          </div>
        </div>

        {/* Sub-section: Form Box Container */}
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-[28px] md:text-3xl font-bold text-gray-900 tracking-tight mb-8">
            Sign In
          </h1>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            
            {/* Alert Notifikasi Error Server */}
            {loginError && (
              <div className="bg-red-50 border border-red-300 px-4 py-3 flex items-center justify-between text-red-700 text-xs font-medium rounded mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{loginError}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setLoginError("")}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                  title="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Input Field: Email / Username */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Email or Username"
                  {...formik.getFieldProps("email")}
                  className={`w-full bg-white border text-sm py-3 px-4 outline-none rounded transition-all ${
                    formik.touched.email && formik.errors.email
                      ? "border-red-500 ring-1 ring-red-200"
                      : "border-gray-300 hover:border-gray-400 focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
                  }`}
                />
              </div>

              {/* Error Validasi Sisi Klien (Yup) */}
              {formik.touched.email && formik.errors.email && (
                <p className="text-[11px] text-red-500 flex items-center gap-1.5 mt-1">
                  <AlertCircle size={12} />
                  {formik.errors.email}
                </p>
              )}
            </div>

            {/* Input Field: Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  {...formik.getFieldProps("password")}
                  className={`w-full bg-white border text-sm py-3 pl-4 pr-12 outline-none rounded transition-all ${
                    formik.touched.password && formik.errors.password
                      ? "border-red-500 ring-1 ring-red-200"
                      : "border-gray-300 hover:border-gray-400 focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
                  }`}
                />

                {/* Tombol Toggle Show/Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>

              {/* Error Validasi Password */}
              {formik.touched.password && formik.errors.password && (
                <p className="text-[11px] text-red-500 flex items-center gap-1.5 mt-1">
                  <AlertCircle size={12} />
                  {formik.errors.password}
                </p>
              )}
            </div>

            {/* Action Buttons: Tombol Sign In & Tombol Guest Login */}
            <div className="pt-2 flex flex-col gap-3">
              {/* Tombol Sign In Reguler */}
              <button
                type="submit"
                disabled={formik.isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded border border-gray-900 flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer disabled:opacity-50"
              >
                {formik.isSubmitting ? "Signing in..." : "Sign In"}
                {!formik.isSubmitting && <ChevronRight size={18} />}
              </button>

              {/* Tombol Login Tamu (Guest) */}
              <button
                type="button"
                disabled={isGuestSigningIn || formik.isSubmitting}
                onClick={handleGuestLogin}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer disabled:opacity-50"
              >
                {isGuestSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
                    <span>Signing in as Guest...</span>
                  </>
                ) : (
                  <span>Login as Guest</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
