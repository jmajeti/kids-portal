import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://yfboxpmmvdcsbmjatosd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYm94cG1tdmRjc2JtamF0b3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTE2NjQsImV4cCI6MjA4ODY2NzY2NH0.2uUGFYsDKdhGDwvPj-uK0nWVunvVTi_JoMZqnlkkrnQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchDb() {
  console.log("Fetching study_modules from Supabase...");
  const { data, error } = await supabase
    .from('study_modules')
    .select('subject, topics_prompt, exact_content')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No data found.");
    return;
  }
  
  const out = [];
  data.slice(0, 5).forEach((row, i) => {
    out.push({
      subject: row.subject,
      topics_prompt: row.topics_prompt,
      exact_content: row.exact_content
    });
  });
  fs.writeFileSync('fetch-output.json', JSON.stringify(out, null, 2), 'utf-8');
  console.log("Done fetching!");
}

fetchDb();
