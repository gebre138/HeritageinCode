import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const EmailVerification: React.FC = () => {
  const [status, setStatus] = useState("processing...");
  const [isResetMode, setIsResetMode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    const path = window.location.pathname;
    
    if (path.includes("reset-password")) {
      setIsResetMode(true);
      setStatus("Enter your new password");
    } else if (path.includes("verify-email") && token) {
      axios.get(`${API_URL}/api/auth/activate?token=${token}`)
        .then(() => {
          setStatus("account verified");
          setIsSuccess(true);
        })
        .catch(() => {
          setStatus("Account Verified");
          setIsSuccess(false);
        });
    }
  }, [token]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!password || !confirmPassword) {
      setFormError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        password
      });
      setStatus(res.data.message.toLowerCase());
      setIsSuccess(true);
      setFormError("");
    } catch (err: any) {
      setFormError(err.response?.data?.error?.toLowerCase() || "reset failed");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm text-center w-full max-w-sm border border-gray-100">
        <h1 className="text-lg text-gray-700 mb-2">
          {isResetMode ? "Reset password" : "Email verification"}
        </h1>
        
        <p className={`text-sm mb-6 ${isSuccess ? "text-green-500" : "text-gray-400"}`}>
          {status}
        </p>

        {isResetMode && !isSuccess && (
          <form onSubmit={handlePasswordReset} noValidate className="space-y-3 text-left">
            <div>
              <input
                type="password"
                placeholder="new password"
                className={`w-full p-3 bg-gray-50 border rounded-xl outline-none text-sm transition-all focus:border-orange-400 ${formError.includes("password") || (formError.includes("fields") && !password) ? "border-red-300" : "border-gray-100"}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError("");
                }}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="confirm password"
                className={`w-full p-3 bg-gray-50 border rounded-xl outline-none text-sm transition-all focus:border-orange-400 ${formError.includes("match") || (formError.includes("fields") && !confirmPassword) ? "border-red-300" : "border-gray-100"}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (formError) setFormError("");
                }}
              />
            </div>
            
            {formError && (
              <p className="text-red-400 text-xs ml-1 animate-pulse">{formError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-xl text-sm hover:bg-orange-600 transition-all disabled:bg-gray-200 active:scale-[0.98]"
            >
              {loading ? "updating..." : "update password"}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-gray-50 pt-4">
          <a href="/" className="text-xs text-gray-400 hover:text-orange-500 transition-colors">
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;