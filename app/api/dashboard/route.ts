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
        const isTeamLead = role === 'Developer' && title === 'Team Lead';
        
        const conn = await getSalesforceConnection();
        const isHR = role === 'HR';
        const isAdmin = role === 'Admin';
        const canAccessHRView = isHR || isAdmin;

        // Get view mode from query params
        const { searchParams } = new URL(req.url);
        const requestedViewMode = searchParams.get('view') === 'hr' ? 'hr' : 'default';
        const viewMode = canAccessHRView ? requestedViewMode : 'default';
        const today = dayjs().format('YYYY-MM-DD');
        const birthdayquery =  await conn.query(`
            SELECT Id , Name , Employee_Name__c,Role__c , Title__c ,Profile_Photo__c,Department__c
            FROM Employee__c
            WHERE Birthdate__c = ${today} AND Status__c = 'Active' AND Active__c = true`);
        const birthdayToday = birthdayquery.records;
        const anniversaryQuery = await conn.query(`
            SELECT Id, Name, Employee_Name__c, Role__c, Title__c, Profile_Photo__c, Department__c, Onboarding_Date__c
            FROM Employee__c
            WHERE Onboarding_Date__c != null
            AND Status__c = 'Active'
            AND Active__c = true
        `)
        const todayMonthDay = dayjs().format('MM-DD')
        const anniversaryToday = anniversaryQuery.records.filter((record: any) =>
            dayjs(record.Onboarding_Date__c).format('MM-DD') === todayMonthDay
        );
        // HR/Admin Dashboard Data
        if (viewMode === 'hr' && canAccessHRView) {
            const hrDashboardLeaveFilter = isAdmin
                ? ""
                : "AND Employee__r.Role__c NOT IN ('HR', 'Admin')";

            // Get total employees
            const employeeQuery = await conn.query(`
                SELECT COUNT(Id) totalEmployees
                FROM Employee__c
                WHERE Status__c = 'Active'
            `);
            const totalEmployees = employeeQuery.records[0]?.totalEmployees || 0;

            // Get pending approvals count
            let pendingApprovalsQuery;
            if (isAdmin) {
                pendingApprovalsQuery = await conn.query(`
                    SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c, 
                           Leave_Type__c, Leave_Category__c, Start_Date__c, 
                           End_Date__c, Total_Days__c, TL_Approval__c
                    FROM Leave__c
                    WHERE Status__c = 'Applied'
                    ORDER BY Start_Date__c ASC
                `);
            } else if (isHR) {
                pendingApprovalsQuery = await conn.query(`
                    SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c, 
                           Leave_Type__c, Leave_Category__c, Start_Date__c, 
                           End_Date__c, Total_Days__c, TL_Approval__c
                    FROM Leave__c
                    WHERE Status__c = 'Applied' ${hrDashboardLeaveFilter}
                    ORDER BY Start_Date__c ASC
                `);
            } else {
                pendingApprovalsQuery = await conn.query(`
                    SELECT Id,Name, Employee__c, Employee__r.Employee_Name__c, 
                           Leave_Type__c, Leave_Category__c, Start_Date__c, 
                           End_Date__c, Total_Days__c, TL_Approval__c
                    FROM Leave__c
                    WHERE Status__c = 'Applied' AND Employee__r.Role__c != 'HR'
                    ORDER BY Start_Date__c ASC
                `);
            }

            const pendingApprovals = pendingApprovalsQuery.records.map((record: any) => ({
                id: record.Id,
                employeeId: record.Name,
                employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
                leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
                leaveCategory: record.Leave_Category__c,
                startDate: record.Start_Date__c,
                endDate: record.End_Date__c,
                duration: record.Total_Days__c,
                tlApproved: record.TL_Approval__c
            }));

            // Get approved today count
            const approvedTodayQuery = await conn.query(`
                SELECT COUNT(Id) approvedCount
                FROM Leave__c
                WHERE Approved_Date__c = ${today}
                AND Status__c = 'Approved'
                ${hrDashboardLeaveFilter}
            `);
            const approvedToday = approvedTodayQuery.records[0]?.approvedCount || 0;

            const approvedTodayLeavesQuery = await conn.query(`
                SELECT Id, Employee__c, Employee__r.Employee_Name__c,
                       Employee__r.Employee_Email__c, Leave_Type__c,
                       Leave_Category__c, Start_Date__c, End_Date__c,
                       Total_Days__c, Approved_Date__c
                FROM Leave__c
                WHERE Approved_Date__c = ${today}
                AND Status__c = 'Approved'
                ${hrDashboardLeaveFilter}
                ORDER BY Start_Date__c ASC
            `);

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

            
            // Get on leave today count
            const onLeaveTodayQuery = await conn.query(`
                SELECT COUNT(Id) onLeaveCount
                FROM Leave__c
                WHERE Start_Date__c <= ${today} 
                AND End_Date__c >= ${today}
                AND Status__c = 'Approved'
                ${hrDashboardLeaveFilter}
            `);
            const onLeaveToday = onLeaveTodayQuery.records[0]?.onLeaveCount || 0;

            // Get employees on leave today (with details)
            const employeesOnLeaveQuery = await conn.query(`
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
            `);

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

            // Get leave analytics
            const leaveAnalyticsQuery = await conn.query(`
                SELECT Leave_Type__c, COUNT(Id) leaveCount
                FROM Leave__c
                WHERE Status__c = 'Approved'
                AND CALENDAR_YEAR(Start_Date__c) = ${new Date().getFullYear()}
                ${hrDashboardLeaveFilter}
                GROUP BY Leave_Type__c
            `);

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

            // Get recent activities
            const recentActivitiesQuery = await conn.query(`
                SELECT Id, Employee__r.Employee_Name__c, Status__c, 
                       Leave_Type__c, CreatedDate
                FROM Leave__c
                WHERE CreatedDate >= LAST_N_DAYS:7
                ${hrDashboardLeaveFilter}
                ORDER BY CreatedDate DESC
                LIMIT 20
            `);

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
        
        // Get leave balance
        const leaveBalanceQuery = await conn.query(`
            SELECT Annual_Leave_Remaining__c, Earned_Leave_Balance__c,
                   Sick_Leave_Count__c, Emergency_Leave_Count__c, Planned_Leave_Count__c
            FROM Leave_Balance__c
            WHERE Employee__c = '${currentEmployeeId}' AND Year__c = ${currentYear}
            LIMIT 1
        `);

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

        // Get upcoming approved leaves
        const upcomingLeavesQuery = await conn.query(`
            SELECT Id, Leave_Type__c, Leave_Category__c, Start_Date__c, 
                   End_Date__c, Total_Days__c
            FROM Leave__c
            WHERE Employee__c = '${currentEmployeeId}'
            AND Start_Date__c >= TODAY
            AND Status__c = 'Approved'
            ORDER BY Start_Date__c ASC
            LIMIT 5
        `);

        const upcomingLeaves = upcomingLeavesQuery.records.map((record: any) => ({
            id: record.Id,
            leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
            leaveCategory: record.Leave_Category__c,
            startDate: record.Start_Date__c,
            endDate: record.End_Date__c,
            duration: record.Total_Days__c
        }));

        // Get pending requests
        const pendingRequestsQuery = await conn.query(`
            SELECT Id, Leave_Type__c, Leave_Category__c, Start_Date__c, 
                   End_Date__c, Total_Days__c, Status__c
            FROM Leave__c
            WHERE Employee__c = '${currentEmployeeId}'
            AND Status__c = 'Applied'
            ORDER BY Start_Date__c ASC
        `);

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
            const teamLeadApprovalsQuery = await conn.query(`
                SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c,
                       Leave_Type__c, Leave_Category__c, Start_Date__c,
                       End_Date__c, Total_Days__c, TL_Approval__c
                FROM Leave__c
                WHERE Status__c = 'Applied'
                AND Employee__r.Team_Lead__c = '${currentEmployeeId}'
                AND (TL_Approval__c = null OR TL_Approval__c = '')
                ORDER BY Start_Date__c ASC
            `);

            teamLeadPendingApprovals = teamLeadApprovalsQuery.records.map((record: any) => ({
                id: record.Id,
                employeeId: record.Name,
                employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
                leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : record.Leave_Type__c,
                leaveCategory: record.Leave_Category__c,
                startDate: record.Start_Date__c,
                endDate: record.End_Date__c,
                duration: record.Total_Days__c,
                tlApproved: record.TL_Approval__c
            }));
        }

        // Get upcoming holidays
        const holidaysQuery = await conn.query(`
            SELECT Name, Date__c, Day__c
            FROM Holidays_List__c
            WHERE Date__c >= TODAY
            ORDER BY Date__c ASC
            LIMIT 5
        `);

        const holidays = holidaysQuery.records.map((record: any) => ({
            name: record.Name,
            date: record.Date__c,
            day: record.Day__c
        }));

        // Get team members (employees with the same team lead)
        const teamMembersQuery = await conn.query(`
            SELECT Id, Employee_Name__c, Employee_Email__c, Title__c, Team_Lead__c
            FROM Employee__c
            WHERE Id = '${currentEmployeeId}'
            LIMIT 1
        `);

        let teamMembers: any[] = [];
        if (teamMembersQuery.records.length > 0) {
            const currentEmployee = teamMembersQuery.records[0];
            const teamLeadId = currentEmployee.Team_Lead__c;

            if (teamLeadId) {
                // Fetch all employees under the same team lead, excluding the current employee
                const teamQuery = await conn.query(`
                    SELECT Id, Employee_Name__c, Employee_Email__c, Title__c
                    FROM Employee__c
                    WHERE Team_Lead__c = '${teamLeadId}'
                    AND Id != '${currentEmployeeId}'
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

        // Get employee name
        const empQuery = await conn.query(`
            SELECT Employee_Name__c
            FROM Employee__c
            WHERE Id = '${currentEmployeeId}'
            LIMIT 1
        `);
        const employeeName = empQuery.records[0]?.Employee_Name__c || email || name;

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