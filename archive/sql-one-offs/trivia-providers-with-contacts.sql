-- Comprehensive trivia providers with contact information
-- Updated with actual contact details scraped from company websites

INSERT INTO public.trivia_providers (name, website, contact_info, is_active) VALUES

-- Major National Providers with Full Contact Info
('Geeks Who Drink', 'https://www.geekswhodrink.com', 
 '{"emails": ["sales@geekswhodrink.com", "info@geekswhodrink.com", "events@geekswhodrink.com", "marketing@geekswhodrink.com"], "phones": ["303-532-4737", "888-493-7849"], "address": "PO Box 53568, Albuquerque, NM 87153"}', 
 true),

('King Trivia', 'https://www.kingtrivia.com', 
 '{"emails": ["Contact@KingTrivia.com"], "phones": ["818-808-0008"], "address": "3645 Thousand Oaks Blvd, Thousand Oaks, CA 91362"}', 
 true),

('Trivia Mafia', 'https://www.triviamafia.com', 
 '{"emails": ["info@triviamafia.com"], "location": "Minneapolis, MN, USA", "social": "@triviamafia"}', 
 true),

('Trivia Nation', 'https://trivianation.com', 
 '{"emails": ["admin@trivianation.com"], "phones": ["904-412-8383"]}', 
 true),

('Team Trivia', 'https://www.teamtrivia.com', 
 '{"phones": ["478-874-4842"], "social": {"facebook": "teamtriviaga", "instagram": "@teamtriviaga"}}', 
 true),

('Pub Trivia USA', 'https://www.pubtriviausa.com', 
 '{"phones": ["312-533-8890"], "address": "P.O. Box 41, Arlington Heights, Illinois 60006"}', 
 true),

('Buzztime', 'https://www.buzztime.com', 
 '{"phones": ["+1234-564-0202"], "demo_booking": "https://calendly.com/buzztime", "support": "https://www.buzztime.com/business/support-request/"}', 
 true),

-- Companies with websites but need contact research
('DJ Trivia', 'https://www.djtrivia.com', 
 '{"website": "https://www.djtrivia.com", "note": "Contact via website form"}', 
 true),

('Sporcle Live', 'https://live.sporcle.com', 
 '{"website": "https://live.sporcle.com", "note": "Contact research needed"}', 
 true),

('Quiz Night America', 'https://www.quiznightamerica.com', 
 '{"website": "https://www.quiznightamerica.com", "note": "Contact research needed"}', 
 true),

('Last Call Trivia', 'https://lastcalltrivia.com', 
 '{"website": "https://lastcalltrivia.com", "note": "Contact research needed"}', 
 true),

('America''s Pub Quiz', 'https://americaspubquiz.com', 
 '{"website": "https://americaspubquiz.com", "note": "Contact research needed"}', 
 true),

('Big Quiz Thing', 'https://bigquizthing.com', 
 '{"website": "https://bigquizthing.com", "note": "Contact research needed"}', 
 true),

-- Digital/Platform Companies  
('TriviaHub', 'https://triviahublive.io', 
 '{"website": "https://triviahublive.io", "note": "Digital platform - contact research needed"}', 
 true),

('Best Trivia Ever', 'https://www.besttriviaever.com', 
 '{"website": "https://www.besttriviaever.com", "note": "Contact research needed"}', 
 true),

('Deliver Me Trivia', 'https://delivermetrivia.com', 
 '{"website": "https://delivermetrivia.com", "note": "Contact research needed"}', 
 true),

('TriviaNerd', 'https://www.trivianerd.com', 
 '{"website": "https://www.trivianerd.com", "note": "Digital platform - contact research needed"}', 
 true),

('CrowdPurr', 'https://www.crowdpurr.com', 
 '{"website": "https://www.crowdpurr.com", "note": "Digital platform - contact research needed"}', 
 true),

('TriviaMaker', 'https://triviamaker.com', 
 '{"website": "https://triviamaker.com", "note": "Digital platform - contact research needed"}', 
 true)

ON CONFLICT (name) DO UPDATE SET 
  contact_info = EXCLUDED.contact_info,
  website = EXCLUDED.website;

-- Query to see all providers with contact status
SELECT 
    name,
    website,
    CASE 
        WHEN contact_info->>'emails' IS NOT NULL THEN 'Has Email'
        WHEN contact_info->>'phones' IS NOT NULL THEN 'Has Phone'
        WHEN contact_info->>'note' LIKE '%research needed%' THEN 'Needs Research'
        ELSE 'Unknown'
    END as contact_status,
    contact_info
FROM public.trivia_providers 
ORDER BY contact_status DESC, name;