-- Comprehensive list of trivia hosting companies in America
-- Excludes Challenge Entertainment and Nerdy Talk as requested

INSERT INTO public.trivia_providers (name, website, is_active) VALUES
-- Major National Providers
('Geeks Who Drink', 'https://www.geekswhodrink.com', true),
('DJ Trivia', 'https://www.djtrivia.com', true),
('King Trivia', 'https://www.kingtrivia.com', true),
('Team Trivia', 'https://www.teamtrivia.com', true),
('Pub Trivia USA', 'https://www.pubtriviausa.com', true),
('Buzztime', 'https://www.buzztime.com', true),
('Trivia Nation', 'https://trivianation.com', true),
('Last Call Trivia', 'https://lastcalltrivia.com', true),
('America''s Pub Quiz', 'https://americaspubquiz.com', true),
('Big Quiz Thing', 'https://bigquizthing.com', true),

-- Digital/Franchise Companies  
('Sporcle Live', 'https://live.sporcle.com', true),
('Quiz Night America', 'https://www.quiznightamerica.com', true),
('Trivia Mafia', 'https://www.triviamafia.com', true),
('TriviaHub', 'https://triviahublive.io', true),
('Best Trivia Ever', 'https://www.besttriviaever.com', true),
('Deliver Me Trivia', 'https://delivermetrivia.com', true),

-- Digital Platforms & Tools
('TriviaNerd', 'https://www.trivianerd.com', true),
('CrowdPurr', 'https://www.crowdpurr.com', true),
('TriviaMaker', 'https://triviamaker.com', true)

ON CONFLICT (name) DO NOTHING;

-- Verify all providers were added
SELECT 
    COUNT(*) as total_providers,
    COUNT(*) FILTER (WHERE is_active = true) as active_providers,
    array_agg(name ORDER BY name) as provider_names
FROM public.trivia_providers;