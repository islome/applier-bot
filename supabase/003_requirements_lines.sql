-- Run in Supabase SQL Editor (optional, demo data only).
-- The vacancy page shows requirements as a checklist, ONE REQUIREMENT PER LINE.
-- This turns the demo vacancies' one-sentence requirements into lines.

update public.vacancies set requirements = E'1+ year with React, TypeScript, Tailwind\nGit and code review habits\nBasic REST and Supabase knowledge is a plus'
  where title = 'Frontend Developer (React / Next.js)' and company = 'TechNova (demo)';

update public.vacancies set requirements = E'Figma and a portfolio with 3+ projects\nUnderstanding of mobile-first design'
  where title = 'UI/UX Designer' and company = 'PixelHub (demo)';

update public.vacancies set requirements = E'Experience with content planning\nBasic video editing\nUzbek and Russian'
  where title = 'SMM Manager' and company = 'BrandWave (demo)';

update public.vacancies set requirements = E'Strong communication skills\n1+ year in sales preferred\nUzbek and Russian'
  where title = 'Sales Manager' and company = 'SavdoPlus (demo)';

update public.vacancies set requirements = E'Finance or accounting degree\n1C or similar software\nAttention to detail'
  where title = 'Junior Accountant' and company = 'Hisob Group (demo)';

update public.vacancies set requirements = E'Fluent Uzbek and Russian\nPolite communication\nStable internet connection'
  where title = 'Customer Support Agent' and company = 'CallDesk (demo)';

update public.vacancies set requirements = E'Organized and calm under pressure\nExcel\nLogistics experience is a plus'
  where title = 'Logistics Coordinator' and company = 'CargoLine (demo)';

update public.vacancies set requirements = E'Basic JavaScript or TypeScript\nWillingness to learn\n20+ hours per week'
  where title = 'Backend Intern (Node.js)' and company = 'TechNova (demo)';
