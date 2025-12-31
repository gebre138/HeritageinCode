import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const EmailVerification: React.FC = () => {
  const [status] = useState("Email verified");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) axios.get(`${API_URL}/api/auth/activate?token=${token}`).catch(() => {});
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow text-center">
        <h1 className="text-2xl font-bold mb-3">Email Verification</h1>
        <p className="mb-3">{status}</p>
        <a href="/" className="text-sm underline">Back to home</a>
      </div>
    </div>
  );
};

export default EmailVerification;