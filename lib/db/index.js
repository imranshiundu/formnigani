'use client';

// Provider switch. Supabase is the hosted backend for now; the memory
// provider keeps every screen working offline and documents the interface
// our own future API must implement (see fng.txt §11).
import { USE_SUPABASE } from './client';
import { memory } from './memory';
import { supabaseDb } from './supabase';

export const db = USE_SUPABASE ? supabaseDb : memory;
export { USE_SUPABASE };
