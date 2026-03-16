const SUPABASE_URL = 'https://rylapwjambqfppjktjra.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bGFwd2phbWJxZnBwamt0anJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjgxMjEsImV4cCI6MjA4ODc0NDEyMX0.SyTXZI2zv5EL9l7ie5uOSXvGj10G03E0yjXL0m0BgMY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
