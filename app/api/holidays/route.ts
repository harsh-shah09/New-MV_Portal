import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection } from "@/lib/salesforce";

const MAX_HOLIDAYS_PER_BATCH = 12;

const isValidDateString = (date: unknown): date is string => {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
};

const normalizeDate = (date: string) => date.slice(0, 10);

const findDuplicateDate = (dates: string[]) => {
  const seen = new Set<string>();

  for (const date of dates) {
    if (seen.has(date)) {
      return date;
    }

    seen.add(date);
  }

  return null;
};

const fetchExistingHolidayDates = async (conn: any, excludeHolidayId?: string) => {
  const query = excludeHolidayId
    ? `SELECT Id, Date__c FROM Holidays_List__c WHERE Id != '${excludeHolidayId}'`
    : `SELECT Id, Date__c FROM Holidays_List__c`;

  const holidayRecords = await conn.query<any>(query);

  return new Set(
    holidayRecords.records
      .map((record: any) => record.Date__c)
      .filter(Boolean)
      .map((date: string) => normalizeDate(date))
  );
};

const fetchExistingHolidayNames = async (conn: any, year: string, excludeHolidayId?: string) => {
  const yearNum = parseInt(year, 10);
  const query = excludeHolidayId
    ? `SELECT Id, Holiday_Name__c, Year__c FROM Holidays_List__c WHERE Year__c = ${yearNum} AND Id != '${excludeHolidayId}'`
    : `SELECT Id, Holiday_Name__c, Year__c FROM Holidays_List__c WHERE Year__c = ${yearNum}`;

  const holidayRecords = await conn.query<any>(query);

  return new Set(
    holidayRecords.records
      .map((record: any) => record.Holiday_Name__c)
      .filter(Boolean)
      .map((name: string) => name.toLowerCase().trim())
  );
};

const findDuplicateName = (names: string[]) => {
  const seen = new Set<string>();

  for (const name of names) {
    const normalized = name.toLowerCase().trim();
    if (seen.has(normalized)) {
      return name;
    }
    seen.add(normalized);
  }

  return null;
};

const isValidHolidayName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Holiday name is required' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Holiday name cannot be empty' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Holiday name cannot exceed 30 characters' };
  }

  if (/\d/.test(trimmed)) {
    return { valid: false, error: 'Holiday name cannot contain numbers' };
  }

  return { valid: true };
};

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
        Holiday_Name__c,
        Date__c,
        Day__c,
        Year__c
      FROM Holidays_List__c
      ORDER BY Date__c ASC
    `);

    const holidays = holidayRecords.records.map((record: any) => ({
      id: record.Id,
      name: record.Holiday_Name__c,
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

      if (holidays.length > MAX_HOLIDAYS_PER_BATCH) {
        return NextResponse.json(
          { error: `You can add up to ${MAX_HOLIDAYS_PER_BATCH} holidays at a time` },
          { status: 400 }
        );
      }

      // Validate all holidays have required fields (year can be auto-derived from date)
      const invalidHolidays = holidays.filter(h => !h.name || !h.date || !h.day);
      if (invalidHolidays.length > 0) {
        return NextResponse.json({ error: "Some holidays are missing required fields" }, { status: 400 });
      }

      // Validate holiday names (no numbers, max 30 characters)
      for (let i = 0; i < holidays.length; i++) {
        const nameValidation = isValidHolidayName(holidays[i].name);
        if (!nameValidation.valid) {
          return NextResponse.json(
            { error: `Holiday ${i + 1}: ${nameValidation.error}` },
            { status: 400 }
          );
        }
      }

      const invalidDates = holidays.filter((holiday) => !isValidDateString(holiday.date));
      if (invalidDates.length > 0) {
        return NextResponse.json({ error: "One or more holiday dates are invalid" }, { status: 400 });
      }

      const duplicateDate = findDuplicateDate(holidays.map((holiday) => normalizeDate(holiday.date)));
      if (duplicateDate) {
        return NextResponse.json(
          { error: "Duplicate holidays are not allowed on the same date" },
          { status: 400 }
        );
      }

      const conn = await getSalesforceConnection();

      const existingHolidayDates = await fetchExistingHolidayDates(conn);
      const conflictingDate = holidays
        .map((holiday) => normalizeDate(holiday.date))
        .find((date) => existingHolidayDates.has(date));

      if (conflictingDate) {
        return NextResponse.json(
          { error: `A holiday already exists on ${conflictingDate}` },
          { status: 400 }
        );
      }

      const years = new Set(holidays.map((h) => h.year || new Date(h.date).getFullYear().toString()));
      for (const year of years) {
        const existingNames = await fetchExistingHolidayNames(conn, year);
        const conflictingName = holidays
          .filter((h) => (h.year || new Date(h.date).getFullYear().toString()) === year)
          .map((h) => h.name)
          .find((name) => existingNames.has(name.toLowerCase().trim()));

        if (conflictingName) {
          return NextResponse.json(
            { error: `Holiday "${conflictingName}" already exists for ${year}` },
            { status: 400 }
          );
        }
      }

      const duplicateName = findDuplicateName(holidays.map((h) => h.name));
      if (duplicateName) {
        return NextResponse.json(
          { error: `Duplicate holiday name in this list: "${duplicateName}"` },
          { status: 400 }
        );
      }

      // Prepare bulk insert data
      const holidayRecords = holidays.map(h => ({
        Name: `${h.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        Holiday_Name__c: h.name,
        Date__c: h.date,
        Day__c: h.day,
        Year__c: parseInt(h.year || new Date(h.date).getFullYear().toString(), 10),
      }));

      console.log("Creating holidays with records:", JSON.stringify(holidayRecords, null, 2));

      // Bulk create all holidays at once
      const results = await conn.sobject('Holidays_List__c').create(holidayRecords) as any[];

      console.log("Salesforce create results:", JSON.stringify(results, null, 2));

      // Check for failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error("Failed to create some holidays. Full details:", JSON.stringify(failures, null, 2));
        const errorDetails = failures.map((f: any) => ({
          success: f.success,
          id: f.id,
          errors: f.errors ? f.errors.map((e: any) => ({
            message: e.message,
            errorCode: e.errorCode,
            fields: e.fields,
          })) : f.error,
        }));
        console.error("Formatted error details:", JSON.stringify(errorDetails, null, 2));
        return NextResponse.json({ 
          error: "Failed to create some holidays",
          failures: failures.length,
          total: results.length,
          details: errorDetails
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

      // Validate required fields (year can be auto-derived from date)
      if (!name || !date || !day) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Validate holiday name format
      const nameValidation = isValidHolidayName(name);
      if (!nameValidation.valid) {
        return NextResponse.json(
          { error: nameValidation.error },
          { status: 400 }
        );
      }

      if (!isValidDateString(date)) {
        return NextResponse.json({ error: "Invalid holiday date" }, { status: 400 });
      }

      const conn = await getSalesforceConnection();

      const existingHolidayDates = await fetchExistingHolidayDates(conn);
      const normalizedDate = normalizeDate(date);

      if (existingHolidayDates.has(normalizedDate)) {
        return NextResponse.json(
          { error: `A holiday already exists on ${normalizedDate}` },
          { status: 400 }
        );
      }

      const yearStr = year || new Date(date).getFullYear().toString();
      const existingNames = await fetchExistingHolidayNames(conn, yearStr);
      if (existingNames.has(name.toLowerCase().trim())) {
        return NextResponse.json(
          { error: `Holiday "${name}" already exists for ${yearStr}` },
          { status: 400 }
        );
      }

      // Create holiday record
      const result = await conn.sobject('Holidays_List__c').create({
        Name: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        Holiday_Name__c: name,
        Date__c: date,
        Day__c: day,
        Year__c: parseInt(year || new Date(date).getFullYear().toString(), 10),
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

    if (date && !isValidDateString(date)) {
      return NextResponse.json({ error: "Invalid holiday date" }, { status: 400 });
    }

    if (name) {
      const nameValidation = isValidHolidayName(name);
      if (!nameValidation.valid) {
        return NextResponse.json(
          { error: nameValidation.error },
          { status: 400 }
        );
      }
    }

    if (date) {
      const existingHolidayDates = await fetchExistingHolidayDates(conn, holidayId);
      const normalizedDate = normalizeDate(date);

      if (existingHolidayDates.has(normalizedDate)) {
        return NextResponse.json(
          { error: `A holiday already exists on ${normalizedDate}` },
          { status: 400 }
        );
      }
    }

    if (name) {
      const yearStr = year || (date ? new Date(date).getFullYear().toString() : new Date().getFullYear().toString());
      const existingNames = await fetchExistingHolidayNames(conn, yearStr, holidayId);
      if (existingNames.has(name.toLowerCase().trim())) {
        return NextResponse.json(
          { error: `Holiday "${name}" already exists for ${yearStr}` },
          { status: 400 }
        );
      }
    }

    // Update holiday record
    const updateData: any = {
      Id: holidayId,
    };

    if (name) {
      updateData.Name = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updateData.Holiday_Name__c = name;
    }
    if (date) updateData.Date__c = date;
    if (day) updateData.Day__c = day;
    if (year) {
      updateData.Year__c = parseInt(year, 10);
    } else if (date) {
      updateData.Year__c = parseInt(new Date(date).getFullYear().toString(), 10);
    }

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
