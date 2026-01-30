import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection } from "@/lib/salesforce";

export async function GET(request: NextRequest) {
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

    const { role } = payload;

    // Fetch holidays from Salesforce
    const conn = await getSalesforceConnection();
    
    const holidayRecords = await conn.query<any>(`
      SELECT 
        Id,
        Name,
        Date__c,
        Day__c,
        Year__c
      FROM Holidays_List__c
      ORDER BY Date__c ASC
    `);

    const holidays = holidayRecords.records.map((record: any) => ({
      id: record.Id,
      name: record.Name,
      date: record.Date__c,
      day: record.Day__c,
      year: record.Year__c ? String(record.Year__c) : new Date(record.Date__c).getFullYear().toString(),
    }));

    return NextResponse.json({
      holidays,
      userRole: role,
    });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { role } = payload;

    // Check if user is HR or Admin
    if (role !== 'HR' && role !== 'Admin') {
      return NextResponse.json({ error: "Only HR and Admin can create holidays" }, { status: 403 });
    }

    const body = await request.json();
    const { holidays } = body;

    // Check if it's a bulk insert or single insert
    if (holidays && Array.isArray(holidays)) {
      // Bulk insert
      if (holidays.length === 0) {
        return NextResponse.json({ error: "No holidays provided" }, { status: 400 });
      }

      // Validate all holidays have required fields
      const invalidHolidays = holidays.filter(h => !h.name || !h.date || !h.day || !h.year);
      if (invalidHolidays.length > 0) {
        return NextResponse.json({ error: "Some holidays are missing required fields" }, { status: 400 });
      }

      const conn = await getSalesforceConnection();

      // Prepare bulk insert data
      const holidayRecords = holidays.map(h => ({
        Name: h.name,
        Date__c: h.date,
        Day__c: h.day,
        Year__c: h.year,
      }));

      // Bulk create all holidays at once
      const results = await conn.sobject('Holidays_List__c').create(holidayRecords) as any[];

      // Check for failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error("Failed to create some holidays:", failures);
        return NextResponse.json({ 
          error: "Failed to create some holidays",
          failures: failures.length,
          total: results.length
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully created ${results.length} holiday(s)`,
        count: results.length
      });
    } else {
      // Single insert (legacy support)
      const { name, date, day, year } = body;

      // Validate required fields
      if (!name || !date || !day || !year) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const conn = await getSalesforceConnection();

      // Create holiday record
      const result = await conn.sobject('Holidays_List__c').create({
        Name: name,
        Date__c: date,
        Day__c: day,
        Year__c: year,
      }) as any;

      if (!result.success) {
        console.error("Failed to create holiday:", result);
        return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Holiday created successfully",
        holidayId: result.id 
      });
    }
  } catch (error) {
    console.error("Error creating holiday:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const { role } = payload;

    // Check if user is HR or Admin
    if (role !== 'HR' && role !== 'Admin') {
      return NextResponse.json({ error: "Only HR and Admin can update holidays" }, { status: 403 });
    }

    const body = await request.json();
    const { holidayId, name, date, day, year } = body;

    if (!holidayId) {
      return NextResponse.json({ error: "Missing holiday ID" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    // Update holiday record
    const updateData: any = {
      Id: holidayId,
    };

    if (name) updateData.Name = name;
    if (date) updateData.Date__c = date;
    if (day) updateData.Day__c = day;
    if (year) updateData.Year__c = year;

    await conn.sobject('Holidays_List__c').update(updateData);

    return NextResponse.json({ success: true, message: "Holiday updated successfully" });
  } catch (error) {
    console.error("Error updating holiday:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { role } = payload;

    // Check if user is HR or Admin
    if (role !== 'HR' && role !== 'Admin') {
      return NextResponse.json({ error: "Only HR and Admin can delete holidays" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const holidayId = searchParams.get('id');

    if (!holidayId) {
      return NextResponse.json({ error: "Missing holiday ID" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    await conn.sobject('Holidays_List__c').delete(holidayId);

    return NextResponse.json({ success: true, message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
