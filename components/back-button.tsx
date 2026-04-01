"use client"
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Button } from "antd";

export function BackButton() {
    const router = useRouter();
    return (
        <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => router.back()}
        >
            Back
        </Button>
    )
}
