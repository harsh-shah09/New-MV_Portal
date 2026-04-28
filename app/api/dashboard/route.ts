import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection } from "@/lib/salesforce";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export async function GET(req: NextRequest) {
    try {
        // Get session from cookies
        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify the session token
        const payload = await verifyToken(session);
        
        if (!payload) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const { employeeId, email, recordId, name, role, title } = payload;
        const currentEmployeeId = employeeId || name || recordId;
        const isTeamLead = title === 'Team Lead';
        
        const conn = await getSalesforceConnection();
        const isHR = role === 'HR';
        const isAdmin = role === 'Admin';
        const canAccessHRView = isHR || isAdmin;

        // Get view mode from query params
        const { searchParams } = new URL(req.url);
        const requestedViewMode = searchParams.get('view') === 'hr' ? 'hr' : 'default';
        const viewMode = canAccessHRView ? requestedViewMode : 'default';
        const today = dayjs().format('YYYY-MM-DD');
        const todayMonth = dayjs().month() + 1;
        const todayDay = dayjs().date();

        const [birthdayquery, anniversaryQuery] = await Promise.all([
            conn.query(`
                SELECT Id, Name, Employee_Id__c, Employee_Name__c, Role__c, Title__c, Profile_Photo__c, Department__c
                FROM Employee__c
                WHERE Birthdate__c != null
                AND CALENDAR_MONTH(Birthdate__c) = ${todayMonth}
                AND DAY_IN_MONTH(Birthdate__c) = ${todayDay}
                AND Status__c = 'Active'
                AND Active__c = true
            `),
            conn.query(`
                SELECT Id, Name, Employee_Id__c, Employee_Name__c, Role__c, Title__c, Profile_Photo__c, Department__c, Onboarding_Date__c
                FROM Employee__c
                WHERE Onboarding_Date__c != null
                AND CALENDAR_MONTH(Onboarding_Date__c) = ${todayMonth}
                AND DAY_IN_MONTH(Onboarding_Date__c) = ${todayDay}
                AND Status__c = 'Active'
                AND Active__c = true
                AND Onboarding_Date__c != ${today}
            `)
        ]);

        const birthdayToday = birthdayquery.records;
        const anniversaryToday = anniversaryQuery.records;
        // HR/Admin Dashboard Data
        if (viewMode === 'hr' && canAccessHRView) {
            const hrDashboardLeaveFilter = isAdmin
                ? ""
                : "AND Employee__r.Role__c NOT IN ('HR', 'Admin')";

            let pendingApprovalsQueryPromise;
            if (isAdmin) {
                pendingApprovalsQueryPromise = conn.query(`
                    SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c, 
                           Leave_Type__c, Leave_Category__c, Start_Date__c, 
                           End_Date__c, Total_Days__c, Status__c, TL_Approval__c, Sandwich_Rule__c, OnePlusTwo_Rule__c, Doubtfull_Case__c
                    FROM Leave__c
                    WHERE Status__c IN ('Applied', 'Withdrawal Pending')
                    ORDER BY Start_Date__c ASC
                `);
            } else if (isHR) {
                pendingApprovalsQueryPromise = conn.query(`
                    SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c, 
                           Leave_Type__c, Leave_Category__c, Start_Date__c, 
                           End_Date__c, Total_Days__c, Status__c, TL_Approval__c, Sandwich_Rule__c, OnePlusTwo_Rule__c, Doubtfull_Case__c
                    FROM Leave__c
                    WHERE Status__c IN ('Applied', 'Withdrawal Pending') ${hrDashboardLeaveFilter}
                    ORDER BY Start_Date__c ASC
                `);
            } else {
                pendingApprovalsQueryPromise = conn.query(`
                    SELECT Id,Name, Employee__c, Employee__r.Employee_Name__c, 
                           Leave_Type__c, Leave_Category__c, Start_Date__c, 
                           End_Date__c, Total_Days__c, Status__c, TL_Approval__c, Sandwich_Rule__c, OnePlusTwo_Rule__c, Doubtfull_Case__c
                    FROM Leave__c
                    WHERE Status__c IN ('Applied', 'Withdrawal Pending') AND Employee__r.Role__c != 'HR'
                    ORDER BY Start_Date__c ASC
                `);
            }

            const [
                employeeQuery,
                pendingApprovalsQuery,
                approvedTodayQuery,
                approvedTodayLeavesQuery,
                onLeaveTodayQuery,
                employeesOnLeaveQuery,
                leaveAnalyticsQuery,
                recentActivitiesQuery,
            ] = await Promise.all([
                conn.query(`
                    SELECT COUNT(Id) totalEmployees
                    FROM Employee__c
                    WHERE Status__c = 'Active'
                `),
                pendingApprovalsQueryPromise,
                conn.query(`
                    SELECT COUNT(Id) approvedCount
                    FROM Leave__c
                    WHERE Approved_Date__c = ${today}
                    AND Status__c = 'Approved'
                    ${hrDashboardLeaveFilter}
                `),
                conn.query(`
                    SELECT Id, Employee__c, Employee__r.Employee_Name__c,
                           Employee__r.Employee_Email__c, Leave_Type__c,
                           Leave_Category__c, Start_Date__c, End_Date__c,
                           Total_Days__c, Approved_Date__c
                    FROM Leave__c
                    WHERE Approved_Date__c = ${today}
                    AND Status__c = 'Approved'
                    ${hrDashboardLeaveFilter}
                    ORDER BY Start_Date__c ASC
                `),
                conn.query(`
                    SELECT COUNT(Id) onLeaveCount
                    FROM Leave__c
                    WHERE Start_Date__c <= ${today}
                    AND End_Date__c >= ${today}
                    AND Status__c = 'Approved'
                    ${hrDashboardLeaveFilter}
                `),
                conn.query(`
                    SELECT Id, Employee__c, Employee__r.Employee_Name__c,
                           Employee__r.Employee_Email__c, Leave_Type__c,
                           Leave_Category__c, Start_Date__c, End_Date__c,
                           Total_Days__c
                    FROM Leave__c
                    WHERE Start_Date__c <= ${today}
                    AND End_Date__c >= ${today}
                    AND Status__c = 'Approved'
                    ${hrDashboardLeaveFilter}
                    ORDER BY Start_Date__c ASC
                `),
                conn.query(`
                    SELECT Leave_Type__c, COUNT(Id) leaveCount
                    FROM Leave__c
                    WHERE Status__c = 'Approved'
                    AND CALENDAR_YEAR(Start_Date__c) = ${new Date().getFullYear()}
                    ${hrDashboardLeaveFilter}
                    GROUP BY Leave_Type__c
                `),
                conn.query(`
                    SELECT Id, Employee__r.Employee_Name__c, Status__c,
                           Leave_Type__c, CreatedDate
                    FROM Leave__c
                    WHERE CreatedDate >= LAST_N_DAYS:7
                    ${hrDashboardLeaveFilter}
                    ORDER BY CreatedDate DESC
                    LIMIT 20
                `),
            ]);

            const totalEmployees = employeeQuery.records[0]?.totalEmployees || 0;

            const pendingApprovals = pendingApprovalsQuery.records.map((record: any) => {
                const sandwichRuleApplicable = record.Sandwich_Rule__c === true
                const onePlusTwoRuleApplicable = record.OnePlusTwo_Rule__c === true

                return {
                    id: record.Id,
                    employeeId: record.Name,
                    employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
                    leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
                    leaveCategory: record.Leave_Category__c,
                    startDate: record.Start_Date__c,
                    endDate: record.End_Date__c,
                    duration: record.Total_Days__c,
                    status: record.Status__c,
                    isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
                    tlApproved: record.TL_Approval__c,
                    sandwichRuleApplicable,
                    onePlusTwoRuleApplicable,
                    doubtfullCase: record.Doubtfull_Case__c === true,
                }
            });

            const approvedToday = approvedTodayQuery.records[0]?.approvedCount || 0;

            const approvedTodayLeaves = approvedTodayLeavesQuery.records.map((record: any) => ({
                id: record.Id,
                employeeId: record.Employee__c,
                employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
                employeeEmail: record.Employee__r?.Employee_Email__c,
                leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
                leaveCategory: record.Leave_Category__c,
                startDate: record.Start_Date__c,
                endDate: record.End_Date__c,
                duration: record.Total_Days__c,
                approvedDate: record.Approved_Date__c,
            }));

            const onLeaveToday = onLeaveTodayQuery.records[0]?.onLeaveCount || 0;

            const employeesOnLeave = employeesOnLeaveQuery.records.map((record: any) => ({
                id: record.Id,
                employeeId: record.Employee__c,
                employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
                employeeEmail: record.Employee__r?.Employee_Email__c,
                leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
                leaveCategory: record.Leave_Category__c,
                startDate: record.Start_Date__c,
                endDate: record.End_Date__c,
                duration: record.Total_Days__c
            }));

            const totalLeaves = leaveAnalyticsQuery.records.reduce((sum: number, record: any) => sum + (record.leaveCount || 0), 0);
            const leaveAnalytics: any = {
                plannedLeaves: 0,
                sickLeaves: 0,
                emergencyLeaves: 0,
                extraDayPay: 0,
                plannedLeavePercentage: 0,
                sickLeavePercentage: 0,
                emergencyLeavePercentage: 0,
                extraDayPayPercentage: 0
            };

            leaveAnalyticsQuery.records.forEach((record: any) => {
                const count = record.leaveCount || 0;
                const percentage = totalLeaves > 0 ? Math.round((count / totalLeaves) * 100) : 0;
                
                if (record.Leave_Type__c === 'Planned Leave') {
                    leaveAnalytics.plannedLeaves = count;
                    leaveAnalytics.plannedLeavePercentage = percentage;
                } else if (record.Leave_Type__c === 'Sick Leave') {
                    leaveAnalytics.sickLeaves = count;
                    leaveAnalytics.sickLeavePercentage = percentage;
                } else if (record.Leave_Type__c === 'Emergency Leave') {
                    leaveAnalytics.emergencyLeaves = count;
                    leaveAnalytics.emergencyLeavePercentage = percentage;
                }
            });

            const recentActivities = recentActivitiesQuery.records.map((record: any, index: number) => ({
                id: `activity-${index}`,
                type: record.Status__c === 'Approved' ? 'approval' : record.Status__c === 'Rejected' ? 'rejection' : 'leave',
                message: `${record.Employee__r?.Employee_Name__c} - ${record.Leave_Type__c || 'Leave'} ${record.Status__c}`,
                timestamp: record.CreatedDate
            }));

            return NextResponse.json({
                dashboardRole: isAdmin ? 'Admin' : 'HR',
                stats: {
                    totalEmployees,
                    pendingApprovals: pendingApprovals.length,
                    approvedToday,
                    onLeaveToday,
                    pendingDocuments: 0,
                    newJoinersThisMonth: 0
                },
                pendingApprovals,
                leaveAnalytics,
                recentActivities,
                departmentStats: [],
                employeesOnLeave,
                approvedTodayLeaves,
                birthdayToday,
                anniversaryToday
            });
        }

        // Employee Dashboard Data
        const currentYear = new Date().getFullYear();
        
        const teamLeadApprovalsPromise = isTeamLead
            ? conn.query(`
                SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c,
                       Leave_Type__c, Leave_Category__c, Start_Date__c,
                       End_Date__c, Total_Days__c, Status__c, TL_Approval__c
                FROM Leave__c
                WHERE Status__c IN ('Applied', 'Withdrawal Pending')
                AND Employee__r.Team_Lead__c = '${currentEmployeeId}'
                AND (TL_Approval__c = null OR TL_Approval__c = '')
                ORDER BY Start_Date__c ASC
            `)
            : Promise.resolve({ records: [] as any[] });

        const [
            leaveBalanceQuery,
            upcomingLeavesQuery,
            pendingRequestsQuery,
            holidaysQuery,
            currentEmployeeQuery,
            teamLeadApprovalsQuery,
        ] = await Promise.all([
            conn.query(`
                SELECT Annual_Leave_Remaining__c, Earned_Leave_Balance__c,
                       Sick_Leave_Count__c, Emergency_Leave_Count__c, Planned_Leave_Count__c
                FROM Leave_Balance__c
                WHERE Employee__c = '${currentEmployeeId}' AND Year__c = ${currentYear}
                LIMIT 1
            `),
            conn.query(`
                SELECT Id, Leave_Type__c, Leave_Category__c, Start_Date__c,
                       End_Date__c, Total_Days__c
                FROM Leave__c
                WHERE Employee__c = '${currentEmployeeId}'
                AND Start_Date__c >= TODAY
                AND Status__c = 'Approved'
                ORDER BY Start_Date__c ASC
                LIMIT 5
            `),
            conn.query(`
                SELECT Id, Leave_Type__c, Leave_Category__c, Start_Date__c,
                       End_Date__c, Total_Days__c, Status__c
                FROM Leave__c
                WHERE Employee__c = '${currentEmployeeId}'
                AND Status__c = 'Applied'
                ORDER BY Start_Date__c ASC
            `),
            conn.query(`
                SELECT Name, Date__c, Day__c
                FROM Holidays_List__c
                WHERE Date__c >= TODAY
                ORDER BY Date__c ASC
                LIMIT 5
            `),
            conn.query(`
                SELECT Id, Employee_Name__c, Employee_Email__c, Title__c, Team_Lead__c
                FROM Employee__c
                WHERE Id = '${currentEmployeeId}'
                LIMIT 1
            `),
            teamLeadApprovalsPromise,
        ]);

        const leaveBalance = leaveBalanceQuery.records.length > 0 ? {
            annualLeaveRemaining: leaveBalanceQuery.records[0].Annual_Leave_Remaining__c || 0,
            earnedLeaveBalance: leaveBalanceQuery.records[0].Earned_Leave_Balance__c || 0,
            sickLeaveCount: leaveBalanceQuery.records[0].Sick_Leave_Count__c || 0,
            emergencyLeaveCount: leaveBalanceQuery.records[0].Emergency_Leave_Count__c || 0,
            plannedLeaveCount: leaveBalanceQuery.records[0].Planned_Leave_Count__c || 0
        } : {
            annualLeaveRemaining: 18,
            earnedLeaveBalance: 0,
            sickLeaveCount: 0,
            emergencyLeaveCount: 0,
            plannedLeaveCount: 0
        };

        const upcomingLeaves = upcomingLeavesQuery.records.map((record: any) => ({
            id: record.Id,
            leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
            leaveCategory: record.Leave_Category__c,
            startDate: record.Start_Date__c,
            endDate: record.End_Date__c,
            duration: record.Total_Days__c
        }));

        const pendingRequests = pendingRequestsQuery.records.map((record: any) => ({
            id: record.Id,
            leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
            leaveCategory: record.Leave_Category__c,
            startDate: record.Start_Date__c,
            endDate: record.End_Date__c,
            duration: record.Total_Days__c,
            status: record.Status__c?.toLowerCase() || 'pending'
        }));

        let teamLeadPendingApprovals: any[] = [];
        if (isTeamLead) {
            teamLeadPendingApprovals = teamLeadApprovalsQuery.records.map((record: any) => ({
                id: record.Id,
                employeeId: record.Name,
                employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
                leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
                leaveCategory: record.Leave_Category__c,
                startDate: record.Start_Date__c,
                endDate: record.End_Date__c,
                duration: record.Total_Days__c,
                status: record.Status__c,
                isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
                tlApproved: record.TL_Approval__c
            }));
        }

        const holidays = holidaysQuery.records.map((record: any) => ({
            name: record.Name,
            date: record.Date__c,
            day: record.Day__c
        }));

        let teamMembers: any[] = [];
        if (currentEmployeeQuery.records.length > 0) {
            const currentEmployee = currentEmployeeQuery.records[0];
            const currentId = currentEmployeeId;

            if (isTeamLead) {
                // If the current user is a Team Lead, fetch their direct reports
                const teamQuery = await conn.query(`
                    SELECT Id, Employee_Name__c, Employee_Email__c, Title__c
                    FROM Employee__c
                    WHERE Team_Lead__c = '${currentId}'
                    AND Id != '${currentId}'
                    AND Status__c = 'Active'
                    ORDER BY Employee_Name__c ASC
                `);

                teamMembers = teamQuery.records.map((record: any) => ({
                    id: record.Id,
                    name: record.Employee_Name__c || "Unknown",
                    email: record.Employee_Email__c || "",
                    title: record.Title__c || ""
                }));
            } else {
                // Non team-leads see colleagues under the same team lead (existing behavior)
                const teamLeadId = currentEmployee.Team_Lead__c;

                if (teamLeadId) {
                    const teamQuery = await conn.query(`
                        SELECT Id, Employee_Name__c, Employee_Email__c, Title__c
                        FROM Employee__c
                        WHERE Team_Lead__c = '${teamLeadId}'
                        AND Id != '${currentId}'
                        AND Status__c = 'Active'
                        ORDER BY Employee_Name__c ASC
                    `);

                    teamMembers = teamQuery.records.map((record: any) => ({
                        id: record.Id,
                        name: record.Employee_Name__c || "Unknown",
                        email: record.Employee_Email__c || "",
                        title: record.Title__c || ""
                    }));
                }
            }
        }
        const employeeName = currentEmployeeQuery.records[0]?.Employee_Name__c || email || name;

        return NextResponse.json({
            employeeName,
            employeeId: currentEmployeeId,
            isTeamLead,
            leaveBalance,
            upcomingLeaves,
            pendingRequests,
            pendingApprovals: teamLeadPendingApprovals,
            holidays,
            teamMembers,
            birthdayToday,
            anniversaryToday
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}