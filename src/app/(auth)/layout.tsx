export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-6 shadow-md sm:p-8">
          {children}
        </div>
      </div>
      {/* Global auth styles: ensure touch-friendly form elements (min 44x44px) */}
      <style>{`
        .auth-form input,
        .auth-form button,
        .auth-form select,
        .auth-form textarea,
        .auth-form a {
          min-height: 44px;
          min-width: 44px;
        }
      `}</style>
    </div>
  );
}
