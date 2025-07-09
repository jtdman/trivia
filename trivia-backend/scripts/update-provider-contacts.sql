-- Update existing trivia providers with contact information
-- Only updates existing records, doesn't create new ones
-- Excludes Nerdy Talk and Challenge Entertainment from updates

-- Update Geeks Who Drink contact info
UPDATE public.trivia_providers 
SET contact_info = '{"emails": ["sales@geekswhodrink.com", "info@geekswhodrink.com", "events@geekswhodrink.com", "marketing@geekswhodrink.com"], "phones": ["303-532-4737", "888-493-7849"], "address": "PO Box 53568, Albuquerque, NM 87153"}'
WHERE name = 'Geeks Who Drink'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update King Trivia contact info
UPDATE public.trivia_providers 
SET contact_info = '{"emails": ["Contact@KingTrivia.com"], "phones": ["818-808-0008"], "address": "3645 Thousand Oaks Blvd, Thousand Oaks, CA 91362"}'
WHERE name = 'King Trivia'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Trivia Mafia contact info
UPDATE public.trivia_providers 
SET contact_info = '{"emails": ["info@triviamafia.com"], "location": "Minneapolis, MN, USA", "social": "@triviamafia"}'
WHERE name = 'Trivia Mafia'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Trivia Nation contact info
UPDATE public.trivia_providers 
SET contact_info = '{"emails": ["admin@trivianation.com"], "phones": ["904-412-8383"]}'
WHERE name = 'Trivia Nation'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Team Trivia contact info
UPDATE public.trivia_providers 
SET contact_info = '{"phones": ["478-874-4842"], "social": {"facebook": "teamtriviaga", "instagram": "@teamtriviaga"}}'
WHERE name = 'Team Trivia'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Pub Trivia USA contact info
UPDATE public.trivia_providers 
SET contact_info = '{"phones": ["312-533-8890"], "address": "P.O. Box 41, Arlington Heights, Illinois 60006"}'
WHERE name = 'Pub Trivia USA'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Buzztime contact info
UPDATE public.trivia_providers 
SET contact_info = '{"phones": ["+1234-564-0202"], "demo_booking": "https://calendly.com/buzztime", "support": "https://www.buzztime.com/business/support-request/"}'
WHERE name = 'Buzztime'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update DJ Trivia with placeholder
UPDATE public.trivia_providers 
SET contact_info = '{"website": "https://www.djtrivia.com", "note": "Contact via website form"}'
WHERE name = 'DJ Trivia'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Sporcle Live with placeholder
UPDATE public.trivia_providers 
SET contact_info = '{"website": "https://live.sporcle.com", "note": "Contact research needed"}'
WHERE name = 'Sporcle Live'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Update Quiz Night America with placeholder
UPDATE public.trivia_providers 
SET contact_info = '{"website": "https://www.quiznightamerica.com", "note": "Contact research needed"}'
WHERE name = 'Quiz Night America'
  AND name NOT IN ('Nerdy Talk', 'Challenge Entertainment');

-- Show results - only providers that were updated
SELECT 
    name,
    website,
    CASE 
        WHEN contact_info->>'emails' IS NOT NULL THEN 'Has Email ✓'
        WHEN contact_info->>'phones' IS NOT NULL THEN 'Has Phone ✓'
        WHEN contact_info->>'note' LIKE '%research needed%' THEN 'Needs Research 🔍'
        ELSE 'No Contact Info ❌'
    END as contact_status,
    contact_info
FROM public.trivia_providers 
WHERE name NOT IN ('Nerdy Talk', 'Challenge Entertainment')
ORDER BY contact_status DESC, name;

-- Verify Nerdy Talk and Challenge Entertainment were not touched
SELECT name, contact_info 
FROM public.trivia_providers 
WHERE name IN ('Nerdy Talk', 'Challenge Entertainment');