import LoginButton from "@/components/LoginButton";

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
            <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-900/[0.04] bg-[bottom_1px_center] [mask-image:linear-gradient(to_bottom,transparent,black)] pointer-events-none" />

            <div className="relative z-10 glass-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                        Journal Recommender
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Please sign in to access the application.
                    </p>
                </div>

                <div className="py-6 w-full flex justify-center border-t border-gray-200 dark:border-white/10 border-b mb-4">
                    <LoginButton />
                </div>

                <p className="text-xs text-gray-400">
                    Internal Access Only • Secured by Microsoft Entra ID
                </p>
            </div>
        </main>
    );
}
