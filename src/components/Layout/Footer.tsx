// src/components/Footer.tsx
export default function Footer() {
    return (
        <footer className="bg-gray-100 text-gray-500 border-t border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        Kwizar
                    </p>
                    <p className="text-sm">
                        Testez vos connaissances et défiez vos amis
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        © {new Date().getFullYear()} — Propulsé par Next.js, Prisma et PostgreSQL
                    </p>
                </div>
            </div>
        </footer>
    );
}
