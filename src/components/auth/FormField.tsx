import React from "react";

interface FormFieldProps {
    label: string;
    htmlFor: string;
    error?: string;
    children: React.ReactNode;
}

export default function FormField({ label, htmlFor, error, children }: FormFieldProps) {
    return (
        <div className="flex flex-col space-y-1.5 w-full text-left">
            <label htmlFor={htmlFor} className="text-sm font-semibold text-gray-700">
                {label}
            </label>

            {children}

            {error && (
                <p className="text-xs font-medium text-red-500 mt-0.5">{error}</p>
            )}
        </div>
    );
}