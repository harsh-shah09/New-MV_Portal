"use client"
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Button } from "antd";

export function BackButton() {
    const router = useRouter();
    return (
        <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => router.back()}
            className="text-gray-500 hover:text-blue-600 flex items-center gap-2 mb-4 p-0"
        >
            Back
        </Button>
    )
}
