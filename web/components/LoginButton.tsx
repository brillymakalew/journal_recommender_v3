"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
    return (
        <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
            className="flex items-center gap-3 bg-[#0072C6] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#005a9e] transition-colors shadow-lg shadow-blue-900/20"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.393L10.375 0V7.55H0V3.393ZM10.375 16.45V24L0 20.607V16.45H10.375ZM11.625 1.173L23.003 3.33V11.23H11.625V1.173ZM11.625 12.77H23.003V20.67L11.625 22.827V12.77Z" />
            </svg>
            Sign in with Outlook
        </button>
    );
}
