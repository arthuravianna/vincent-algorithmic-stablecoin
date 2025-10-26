"use client"


import LiquidatorOptions from "@/app/liquidator_options/components/LiquidatorOptions";
import Login from "@/app/login/components/Login";
import { useJwtContext } from "@lit-protocol/vincent-app-sdk/react";



export default function Home() {
    const { authInfo } = useJwtContext();
    console.log(authInfo)
    
    return (
        <main className="relative px-4 sm:px-6 md:px-8 flex justify-center pt-8 sm:pt-16 md:pt-24 pb-8">
            {authInfo ? <LiquidatorOptions /> : <Login />}
        </main>
    );
}