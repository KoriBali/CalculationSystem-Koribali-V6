import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useNavigate } from "react-router-dom";
import { loginUser, getMe } from "../services/authService";
import {
  setAuthSession,
  setUser,
  isAuthenticated,
  clearAuthSession,
} from "../utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/project-tools");
    }
  }, [navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isGuestSigningIn, setIsGuestSigningIn] = useState(false);

  const handleGuestLogin = async () => {
    try {
      setIsGuestSigningIn(true);
      setLoginError("");

      // Clear any previous stale session cookies
      clearAuthSession();

      const { accessToken, refreshToken } = await loginUser({
        email: "guest@gmail.com",
        password: "password",
      });

      setAuthSession({ accessToken, refreshToken, user: null });
      const user = await getMe();
      setUser(user);

      navigate("/project-tools");
    } catch (error) {
      console.error("[handleGuestLogin] Login failed:", error);
      setLoginError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to sign in as guest account.",
      );
    } finally {
      setIsGuestSigningIn(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string().required("Email or username is required"),
      password: Yup.string().required("Password is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setLoginError("");

        const { accessToken, refreshToken } = await loginUser(values);

        setAuthSession({ accessToken, refreshToken, user: null });
        const user = await getMe();
        setUser(user);

        navigate("/project-tools");
      } catch (error) {
        setLoginError(
          error.response?.data?.detail ||
            error.message ||
            "Access denied. Please check your credentials.",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans antialiased">
      {/* LEFT PANEL */}
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

      {/* RIGHT PANEL */}
      <div className="flex-1 bg-white flex flex-col px-6 py-8 sm:p-12 lg:px-24 lg:py-16 overflow-y-auto">
        {/* Top Header: Logo */}
        <div className="flex items-center mb-10 md:mb-20">
          <div className="flex items-center gap-3">
            <img
              src="/images/koribali-logo.webp"
              alt="koribali icon"
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
            <span className="text-[18px] md:text-[22px] font-bold text-gray-900 tracking-tight">
              KORIBALI
            </span>
          </div>
        </div>

        {/* FORM CONTAINER */}
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-[28px] md:text-3xl font-bold text-gray-900 tracking-tight mb-8">
            Sign In
          </h1>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Error Alert */}
            <AnimatePresence mode="wait">
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-red-50 border border-red-300 px-4 py-3 flex items-center justify-between text-red-700 text-xs font-medium rounded">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{loginError}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLoginError("")}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* EMAIL */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Email or Username</label>
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

              {formik.touched.email && formik.errors.email && (
                <p className="text-[11px] text-red-500 flex items-center gap-1.5 mt-1">
                  <AlertCircle size={12} />
                  {formik.errors.email}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Password</label>
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

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>

              {formik.touched.password && formik.errors.password && (
                <p className="text-[11px] text-red-500 flex items-center gap-1.5 mt-1">
                  <AlertCircle size={12} />
                  {formik.errors.password}
                </p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={formik.isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded border border-gray-900 flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer disabled:opacity-50"
              >
                {formik.isSubmitting ? "Signing in..." : "Sign In"}
                {!formik.isSubmitting && <ChevronRight size={18} />}
              </button>

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
