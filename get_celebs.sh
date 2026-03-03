#!/bin/bash
URL="https://wouqtpvfctednlffross.supabase.co/rest/v1/profiles?select=id,nickname,profession,speech_tone&profile_type=eq.CELEB&status=eq.active&limit=20"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdXF0cHZmY3RlZG5sZmZyb3NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4NDMyMywiZXhwIjoyMDc5NDYwMzIzfQ.GDOfWkP6A3QC_GiFiYPybqLx0NqFGk7zD1GR8Avc6ns"
curl -s -X GET "$URL" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
