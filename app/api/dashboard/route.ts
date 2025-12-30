import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from '@/lib/salesforce';
type KPIStats = {
    title: string;
    value: string | number;
    trend?: number;
    icon: any;
    color: "blue" | "amber" | "red" | "green" | "cyan";
}
type RecentActivity = {
    title: string;
    value: string | number;
    trend?: number;
    icon: any;
    color: "blue" | "amber" | "red" | "green" | "cyan";
}
type StatsOverview = {
    title: string;
    value: string | number;
    trend?: number;
    icon: any;
    color: "blue" | "amber" | "red" | "green" | "cyan";
}
export async function GET(req: NextRequest) {
    try {
        const dashboardData = await getDashboardData();
        const mapStats = (items: any[] = []) => items.map((item: any) => ({
            title: item.title,
            value: item.value,
            trend: item.trend ?? 0,
            icon: item.icon ?? 'Icons',
            color: item.color ?? 'blue'
        }));

        const kpiStats: KPIStats[] = mapStats(dashboardData?.kpiStats);
        const recentActivities: RecentActivity[] = mapStats(dashboardData?.recentActivities);
        const statsOverview: StatsOverview[] = mapStats(dashboardData?.statsOverview);
        return NextResponse.json({ kpiStats, recentActivities, statsOverview })
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}