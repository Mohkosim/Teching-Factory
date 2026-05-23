"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ hasError, placeholder = "Masukkan Kata Sandi", className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className={`flex w-full rounded-xl bg-sky-50 border-0 h-12 px-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow ${
            hasError
              ? "ring-1 ring-red-400 focus-visible:ring-red-400"
              : ""
          } ${className ?? ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;