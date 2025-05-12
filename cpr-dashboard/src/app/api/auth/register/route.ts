// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { registerUser } from "@/auth";

export async function POST(request: Request) {
    try {
        // const { email, password, name } = await request.json();

        const body = await request.text();
        console.log("Raw body:", body);
        let json;
        try {
            json = JSON.parse(body);
        } catch (e) {
            console.error("JSON parse error:", e);
            return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
        }
        const { email, password, name } = json;
        console.log("Parsed:", email, password, name);

        // 验证输入
        if (!email || !password) {
            return NextResponse.json(
                { message: "email and password are required" },
                { status: 400 }
            );
        }

        // 使用Firebase创建用户
        const user = await registerUser(email, password);

        // 返回成功响应
        return NextResponse.json(
            {
                message: "user registration successful",
                userId: user.uid
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("registration error:", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "registration failed, please try again later" },
            { status: 500 }
        );
    }
}