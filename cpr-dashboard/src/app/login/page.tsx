// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (mode === "login") {
      // 处理登录
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
    } else {
      // 处理注册
      try {
        console.log("register:", email, password, name);
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "registration failed, please try again later");
        }

        // 注册成功后自动登录
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        router.push("/dashboard");
      } catch (error) {
        setError(error instanceof Error ? error.message : "registration failed, please try again later");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200">
      <div className="w-full max-w-md">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-left">Welcome to your CPR training dashboard</h1>
        {/* Card */}
        <div className="bg-white/80 rounded-2xl shadow-lg px-8 py-8 space-y-6 border border-blue-100">
          <h2 className="text-2xl font-semibold text-blue-700 mb-2 text-left">
            {mode === "login" ? "Login" : "Register"}
          </h2>
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 text-left">Username</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-200 sm:text-sm px-3 py-2 border bg-blue-50/50"
                  placeholder="Please enter username"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-200 sm:text-sm px-3 py-2 border bg-blue-50/50"
                placeholder="Please enter email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-left">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-200 sm:text-sm px-3 py-2 border bg-blue-50/50"
                placeholder="Please enter password"
              />
            </div>
            {mode === "login" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label>
                </div>
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">Forgot password?</Link>
                </div>
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-md bg-blue-500 py-2 px-3 text-sm font-semibold text-white hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:bg-blue-200 transition-colors"
              >
                {isLoading ? ("Processing...") : mode === "login" ? ("Login") : ("Register")}
              </button>
            </div>
          </form>
          {/* Switch mode button */}
          <div className="mt-2 text-left">
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-medium text-blue-600 hover:text-blue-500 text-sm"
            >
              {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}