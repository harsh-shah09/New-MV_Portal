
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'public', 'templates');
    
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(templatesDir);
    const templates = files
      .filter(file => file.endsWith('.html'))
      .map(file => ({
        id: file,
        name: file.replace(/-/g, ' ').replace('.html', '').replace(/\b\w/g, l => l.toUpperCase()),
        path: `/templates/${file}`
      }));

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 });
  }
}
