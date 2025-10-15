import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const systemPromptPath = path.join(process.cwd(), "public", "LLM", "system_prompt.txt");
    
    let systemPrompt = "";
    try {
      systemPrompt = fs.readFileSync(systemPromptPath, "utf8");
    } catch (e) {
      return NextResponse.json({
        error: "Could not read system prompt file",
        details: String(e)
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      systemPrompt: systemPrompt,
      length: systemPrompt.length,
      preview: systemPrompt.substring(0, 200) + "..."
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to load system prompt",
      details: String(error)
    }, { status: 500 });
  }
}
