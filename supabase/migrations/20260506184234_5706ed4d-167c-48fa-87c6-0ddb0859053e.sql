
-- ============================================================
-- Phase 1: Vacancy Pipeline schema upgrade
-- ============================================================

-- ---- Enums ----
CREATE TYPE public.vacancy_source_type AS ENUM (
  'indian_law_firm','intl_law_firm','un_agency','intl_court','ifi',
  'indian_govt','indian_regulator','psu','big4',
  'corporate_indian','corporate_mnc','ngo','legal_tech','other'
);

CREATE TYPE public.vacancy_source_tier AS ENUM (
  'tier_1','tier_2','tier_3','untiered'
);

CREATE TYPE public.vacancy_scrape_frequency AS ENUM (
  'daily','weekly','biweekly','monthly'
);

CREATE TYPE public.vacancy_source_status AS ENUM (
  'active','paused','broken'
);

CREATE TYPE public.vacancy_eligibility_india AS ENUM (
  'eligible','ambiguous','ineligible','unknown'
);

CREATE TYPE public.vacancy_lifecycle_status AS ENUM (
  'active','stale','expired'
);

CREATE TYPE public.vacancy_role_type AS ENUM (
  'lateral_hire','internship','retainership','graduate_trainee',
  'fellowship','consultant','support_staff','other'
);

CREATE TYPE public.vacancy_application_mode_pipeline AS ENUM (
  'external_url','email','onsite_form','ats_redirect','unclear'
);

CREATE TYPE public.scrape_run_status AS ENUM (
  'success','partial','failed','running'
);

-- ---- firm_careers_sources upgrade ----
ALTER TABLE public.firm_careers_sources
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS source_type public.vacancy_source_type NOT NULL DEFAULT 'indian_law_firm',
  ADD COLUMN IF NOT EXISTS tier public.vacancy_source_tier NOT NULL DEFAULT 'untiered',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS scrape_frequency public.vacancy_scrape_frequency NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS pipeline_status public.vacancy_source_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz;

-- backfill name from firm_name
UPDATE public.firm_careers_sources SET name = firm_name WHERE name IS NULL;

-- make legacy columns nullable (kept for back-compat with existing UI/edge fn)
ALTER TABLE public.firm_careers_sources
  ALTER COLUMN firm_slug DROP NOT NULL,
  ALTER COLUMN firm_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fcs_source_type ON public.firm_careers_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_fcs_tier ON public.firm_careers_sources(tier);
CREATE INDEX IF NOT EXISTS idx_fcs_pipeline_status ON public.firm_careers_sources(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_fcs_freq ON public.firm_careers_sources(scrape_frequency);

-- ---- vacancy_review_queue upgrade ----
ALTER TABLE public.vacancy_review_queue
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.firm_careers_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_title text,
  ADD COLUMN IF NOT EXISTS role_type public.vacancy_role_type,
  ADD COLUMN IF NOT EXISTS practice_area text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS is_remote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pqe_min int,
  ADD COLUMN IF NOT EXISTS pqe_max int,
  ADD COLUMN IF NOT EXISTS application_mode public.vacancy_application_mode_pipeline,
  ADD COLUMN IF NOT EXISTS application_target text,
  ADD COLUMN IF NOT EXISTS application_subject text,
  ADD COLUMN IF NOT EXISTS source_posted_date date,
  ADD COLUMN IF NOT EXISTS source_deadline date,
  ADD COLUMN IF NOT EXISTS description_excerpt text,
  ADD COLUMN IF NOT EXISTS description_full text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS consecutive_misses int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifecycle_status public.vacancy_lifecycle_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS eligibility_india public.vacancy_eligibility_india NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS eligibility_reason text,
  ADD COLUMN IF NOT EXISTS eligibility_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS manual_eligibility_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vrq_source_id ON public.vacancy_review_queue(source_id);
CREATE INDEX IF NOT EXISTS idx_vrq_eligibility ON public.vacancy_review_queue(eligibility_india);
CREATE INDEX IF NOT EXISTS idx_vrq_lifecycle ON public.vacancy_review_queue(lifecycle_status);

-- ---- scrape_runs ----
CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.firm_careers_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status public.scrape_run_status NOT NULL DEFAULT 'running',
  vacancies_found int NOT NULL DEFAULT 0,
  vacancies_new int NOT NULL DEFAULT 0,
  vacancies_marked_stale int NOT NULL DEFAULT 0,
  duration_ms int,
  error_message text,
  raw_log text,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON public.scrape_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_status ON public.scrape_runs(status, started_at DESC);

ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Opp admins read scrape runs"
  ON public.scrape_runs FOR SELECT TO authenticated
  USING (has_admin_scope(auth.uid(), 'opportunities_admin'::app_role));

CREATE POLICY "Opp admins insert scrape runs"
  ON public.scrape_runs FOR INSERT TO authenticated
  WITH CHECK (has_admin_scope(auth.uid(), 'opportunities_admin'::app_role));

CREATE POLICY "Service role manages scrape runs"
  ON public.scrape_runs FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---- Seed sources ----
-- Helper: insert with defaults; on conflict (url) update meta but keep state.
INSERT INTO public.firm_careers_sources
  (firm_slug, firm_name, name, url, source_type, tier, country, scrape_frequency, pipeline_status, active)
VALUES
  -- UN System
  ('un-careers','UN Careers (Inspira)','UN Careers (Inspira)','https://careers.un.org/jobSearchDescription','un_agency','tier_1','INTL','weekly','active',true),
  ('undp','UNDP Jobs','UNDP Jobs','https://jobs.undp.org/','un_agency','tier_1','INTL','weekly','active',true),
  ('unicef','UNICEF Careers','UNICEF Careers','https://jobs.unicef.org/','un_agency','tier_1','INTL','weekly','active',true),
  ('unhcr','UNHCR Careers','UNHCR Careers','https://www.unhcr.org/careers','un_agency','tier_1','INTL','weekly','active',true),
  ('who','WHO Careers','WHO Careers','https://careers.who.int/','un_agency','tier_1','INTL','weekly','active',true),
  ('ilo','ILO Jobs','ILO Jobs','https://jobs.ilo.org/','un_agency','tier_1','INTL','weekly','active',true),
  ('unesco','UNESCO Careers','UNESCO Careers','https://careers.unesco.org/','un_agency','tier_1','INTL','weekly','active',true),
  ('wfp','WFP Careers','WFP Careers','https://www.wfp.org/careers','un_agency','tier_1','INTL','weekly','active',true),
  ('iom','IOM Careers','IOM Careers','https://www.iom.int/careers','un_agency','tier_1','INTL','weekly','active',true),
  ('unwomen','UN Women','UN Women','https://www.unwomen.org/en/about-us/employment','un_agency','tier_1','INTL','weekly','active',true),
  ('unep','UNEP','UNEP','https://www.unep.org/about-un-environment/jobs','un_agency','tier_2','INTL','weekly','active',true),
  ('unidir','UNIDIR','UNIDIR','https://unidir.org/jobs/','un_agency','tier_2','INTL','weekly','active',true),
  ('ohchr','OHCHR','OHCHR','https://www.ohchr.org/en/about-us/work-with-us','un_agency','tier_1','INTL','weekly','active',true),
  ('unv','UN Volunteers','UN Volunteers','https://app.unv.org/opportunities','un_agency','tier_2','INTL','weekly','active',true),
  ('reliefweb','ReliefWeb Jobs','ReliefWeb Jobs','https://reliefweb.int/jobs','un_agency','tier_1','INTL','weekly','active',true),

  -- International courts & tribunals
  ('icc','International Criminal Court','International Criminal Court','https://www.icc-cpi.int/employment','intl_court','tier_1','INTL','biweekly','active',true),
  ('icj','International Court of Justice','International Court of Justice','https://www.icj-cij.org/employment','intl_court','tier_1','INTL','biweekly','active',true),
  ('pca','Permanent Court of Arbitration','Permanent Court of Arbitration','https://pca-cpa.org/en/about/work-with-us/','intl_court','tier_1','INTL','biweekly','active',true),
  ('wto','WTO Careers','WTO Careers','https://www.wto.org/english/thewto_e/vacan_e/vacan_e.htm','intl_court','tier_1','INTL','weekly','active',true),
  ('itlos','ITLOS','ITLOS','https://www.itlos.org/en/main/careers/','intl_court','tier_2','INTL','monthly','active',true),
  ('wipo','WIPO','WIPO','https://www.wipo.int/jobs/en/','intl_court','tier_1','INTL','weekly','active',true),

  -- IFIs
  ('worldbank','World Bank Careers','World Bank Careers','https://www.worldbank.org/en/about/careers','ifi','tier_1','INTL','weekly','active',true),
  ('imf','IMF Careers','IMF Careers','https://www.imf.org/en/About/Careers','ifi','tier_1','INTL','weekly','active',true),
  ('adb','Asian Development Bank','Asian Development Bank','https://www.adb.org/work-with-us/careers','ifi','tier_1','INTL','weekly','active',true),
  ('ifc','IFC Careers','IFC Careers','https://www.ifc.org/en/careers','ifi','tier_1','INTL','weekly','active',true),
  ('aiib','AIIB','AIIB','https://www.aiib.org/en/opportunities/career/','ifi','tier_1','INTL','weekly','active',true),
  ('ndb','New Development Bank','New Development Bank','https://www.ndb.int/careers/','ifi','tier_2','INTL','monthly','active',true),
  ('ebrd','EBRD','EBRD','https://www.ebrdjobs.com/','ifi','tier_2','INTL','weekly','active',true),

  -- Other intl orgs
  ('oecd','OECD Careers','OECD Careers','https://www.oecd.org/careers/','intl_court','tier_1','INTL','weekly','active',true),
  ('commonwealth','Commonwealth Secretariat','Commonwealth Secretariat','https://thecommonwealth.org/jobs','intl_court','tier_2','INTL','monthly','active',true),
  ('icrc','ICRC','ICRC','https://careers.icrc.org/','ngo','tier_1','INTL','weekly','active',true),
  ('coe','Council of Europe','Council of Europe','https://www.coe.int/en/web/jobs/','intl_court','tier_2','INTL','monthly','active',true),
  ('hcch','Hague Conference (HCCH)','Hague Conference (HCCH)','https://www.hcch.net/en/about/jobs','intl_court','tier_2','INTL','monthly','active',true),

  -- Indian Constitutional / Statutory (top 6 HCs only; SC paused — PDF-only)
  ('sci','Supreme Court of India','Supreme Court of India','https://www.sci.gov.in/recruitments/','indian_govt','tier_1','IN','weekly','paused',false),
  ('delhi-hc','Delhi High Court','Delhi High Court','https://delhihighcourt.nic.in/recruitment','indian_govt','tier_1','IN','weekly','paused',false),
  ('bombay-hc','Bombay High Court','Bombay High Court','https://bombayhighcourt.nic.in/recruitments.php','indian_govt','tier_1','IN','weekly','paused',false),
  ('calcutta-hc','Calcutta High Court','Calcutta High Court','https://www.calcuttahighcourt.gov.in/Recruitments','indian_govt','tier_1','IN','weekly','paused',false),
  ('madras-hc','Madras High Court','Madras High Court','https://www.mhc.tn.gov.in/judis/recruit','indian_govt','tier_1','IN','weekly','paused',false),
  ('karnataka-hc','Karnataka High Court','Karnataka High Court','https://karnatakajudiciary.kar.nic.in/recruitment.php','indian_govt','tier_1','IN','weekly','paused',false),
  ('upsc','UPSC','UPSC','https://upsc.gov.in/whats-new','indian_govt','tier_1','IN','weekly','active',true),
  ('nalsa','NALSA','NALSA','https://nalsa.gov.in/career','indian_govt','tier_2','IN','monthly','active',true),
  ('lci','Law Commission of India','Law Commission of India','https://lawcommissionofindia.nic.in/','indian_govt','tier_2','IN','monthly','active',true),

  -- Regulators
  ('sebi','SEBI','SEBI','https://www.sebi.gov.in/sebi_data/careers/','indian_regulator','tier_1','IN','weekly','active',true),
  ('rbi','RBI','RBI','https://opportunities.rbi.org.in/scripts/Careers.aspx','indian_regulator','tier_1','IN','weekly','active',true),
  ('cci','Competition Commission of India','Competition Commission of India','https://www.cci.gov.in/careers','indian_regulator','tier_1','IN','weekly','active',true),
  ('irdai','IRDAI','IRDAI','https://irdai.gov.in/careers','indian_regulator','tier_2','IN','weekly','active',true),
  ('trai','TRAI','TRAI','https://www.trai.gov.in/notifications/recruitment','indian_regulator','tier_2','IN','weekly','active',true),
  ('pfrda','PFRDA','PFRDA','https://www.pfrda.org.in/','indian_regulator','tier_2','IN','monthly','active',true),
  ('sat','Securities Appellate Tribunal','Securities Appellate Tribunal','https://sat.gov.in/','indian_regulator','tier_2','IN','monthly','active',true),
  ('nclt','NCLT','NCLT','https://nclt.gov.in/recruitment-notice','indian_regulator','tier_1','IN','weekly','active',true),

  -- Tribunals (PDF-heavy → paused)
  ('ngt','NGT','NGT','https://greentribunal.gov.in/','indian_govt','tier_2','IN','monthly','paused',false),
  ('cestat','CESTAT','CESTAT','https://cestat.gov.in/','indian_govt','tier_3','IN','monthly','paused',false),

  -- PSUs
  ('ongc','ONGC','ONGC','https://ongcindia.com/web/eng/careers','psu','tier_2','IN','monthly','active',true),
  ('ntpc','NTPC','NTPC','https://www.ntpc.co.in/careers','psu','tier_2','IN','monthly','active',true),
  ('gail','GAIL','GAIL','https://gailonline.com/careers.html','psu','tier_2','IN','monthly','active',true),
  ('lic','LIC','LIC','https://licindia.in/careers','psu','tier_2','IN','monthly','active',true),
  ('nabard','NABARD','NABARD','https://www.nabard.org/career.aspx','psu','tier_1','IN','weekly','active',true),
  ('sidbi','SIDBI','SIDBI','https://www.sidbi.in/careers','psu','tier_2','IN','monthly','active',true),

  -- Ministries (PDF-heavy → paused)
  ('lawmin','Ministry of Law & Justice','Ministry of Law & Justice','https://lawmin.gov.in/','indian_govt','tier_1','IN','monthly','paused',false),
  ('mea','Ministry of External Affairs','Ministry of External Affairs','https://www.mea.gov.in/career.htm','indian_govt','tier_2','IN','monthly','paused',false),

  -- Magic Circle
  ('linklaters','Linklaters','Linklaters','https://careers.linklaters.com/','intl_law_firm','tier_1','UK','weekly','active',true),
  ('aoshearman','A&O Shearman','A&O Shearman','https://www.aoshearman.com/en/careers','intl_law_firm','tier_1','UK','weekly','active',true),
  ('cliffordchance','Clifford Chance','Clifford Chance','https://careers.cliffordchance.com/','intl_law_firm','tier_1','UK','weekly','active',true),
  ('freshfields','Freshfields','Freshfields','https://careers.freshfields.com/','intl_law_firm','tier_1','UK','weekly','active',true),
  ('slaughterandmay','Slaughter and May','Slaughter and May','https://www.slaughterandmay.com/careers/','intl_law_firm','tier_1','UK','weekly','active',true),

  -- US Big Law
  ('lathamwatkins','Latham & Watkins','Latham & Watkins','https://www.lw.com/careers','intl_law_firm','tier_1','US','weekly','active',true),
  ('kirkland','Kirkland & Ellis','Kirkland & Ellis','https://www.kirkland.com/careers','intl_law_firm','tier_1','US','weekly','active',true),
  ('whitecase','White & Case','White & Case','https://www.whitecase.com/careers','intl_law_firm','tier_1','US','weekly','active',true),
  ('skadden','Skadden','Skadden','https://www.skadden.com/careers','intl_law_firm','tier_1','US','weekly','active',true),
  ('sidley','Sidley Austin','Sidley Austin','https://www.sidley.com/en/careers/','intl_law_firm','tier_1','US','weekly','active',true),
  ('bakermckenzie','Baker McKenzie','Baker McKenzie','https://www.bakermckenzie.com/en/careers','intl_law_firm','tier_1','US','weekly','active',true),
  ('dlapiper','DLA Piper','DLA Piper','https://careers.dlapiper.com/','intl_law_firm','tier_1','US','weekly','active',true),
  ('hoganlovells','Hogan Lovells','Hogan Lovells','https://www.hoganlovells.com/en/careers','intl_law_firm','tier_1','US','weekly','active',true),
  ('nortonrose','Norton Rose Fulbright','Norton Rose Fulbright','https://www.nortonrosefulbright.com/en/careers','intl_law_firm','tier_1','UK','weekly','active',true),
  ('hsfkramer','Herbert Smith Freehills Kramer','Herbert Smith Freehills Kramer','https://careers.hsfkramer.com/','intl_law_firm','tier_1','UK','weekly','active',true),
  ('reedsmith','Reed Smith','Reed Smith','https://www.reedsmith.com/en/careers','intl_law_firm','tier_2','US','weekly','active',true),
  ('dentons','Dentons','Dentons','https://www.dentons.com/en/careers','intl_law_firm','tier_2','US','weekly','active',true),

  -- Singapore Big 4
  ('allengledhill','Allen & Gledhill','Allen & Gledhill','https://www.allenandgledhill.com/sg/careers','intl_law_firm','tier_1','SG','weekly','active',true),
  ('wongpartnership','WongPartnership','WongPartnership','https://www.wongpartnership.com/careers','intl_law_firm','tier_1','SG','weekly','active',true),
  ('rajahtann','Rajah & Tann','Rajah & Tann','https://www.rajahtann.com/careers/','intl_law_firm','tier_1','SG','weekly','active',true),
  ('drewnapier','Drew & Napier','Drew & Napier','https://www.drewnapier.com/careers','intl_law_firm','tier_1','SG','weekly','active',true),

  -- Indian Tier 1/2 firms
  ('lakshmisri','Lakshmikumaran & Sridharan','Lakshmikumaran & Sridharan','https://www.lakshmisri.com/careers/','indian_law_firm','tier_1','IN','weekly','active',true),
  ('kochhar','Kochhar & Co','Kochhar & Co','https://www.kochhar.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('wadiaghandy','Wadia Ghandy & Co','Wadia Ghandy & Co','https://www.wadiaghandy.com/careers/','indian_law_firm','tier_2','IN','monthly','active',true),
  ('vaishlaw','Vaish Associates','Vaish Associates','https://www.vaishlaw.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('crawfordbayley','Crawford Bayley & Co','Crawford Bayley & Co','https://www.crawfordbayley.com/careers.html','indian_law_firm','tier_2','IN','monthly','active',true),
  ('karanjawala','Karanjawala & Co','Karanjawala & Co','https://karanjawala.in/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('foxmandal','Fox Mandal','Fox Mandal','https://www.foxmandal.in/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('mullamulla','Mulla & Mulla CB&D','Mulla & Mulla CB&D','https://www.mullaandmulla.com/careers/','indian_law_firm','tier_2','IN','monthly','active',true),
  ('duaassociates','Dua Associates','Dua Associates','https://www.duaassociates.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('dmdadvocates','DMD Advocates','DMD Advocates','https://www.dmdadvocates.com/careers/','indian_law_firm','tier_2','IN','monthly','active',true),
  ('linklegal','Link Legal','Link Legal','https://www.linklegal.in/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('majmudar','Majmudar & Partners','Majmudar & Partners','https://www.majmudarindia.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('singhania','Singhania & Partners','Singhania & Partners','https://singhania.in/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('anantlaw','AnantLaw','AnantLaw','https://anantlaw.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('spicerouteleagal','Spice Route Legal','Spice Route Legal','https://spicerouteleagal.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('tatvalegal','Tatva Legal','Tatva Legal','https://www.tatvalegal.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('ikigailaw','Ikigai Law','Ikigai Law','https://www.ikigailaw.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('naiknaik','Naik Naik & Co','Naik Naik & Co','https://naiknaik.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('khaitanlegal','Khaitan Legal Associates','Khaitan Legal Associates','https://khaitanlegal.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('techlegis','TechLegis','TechLegis','https://techlegis.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('pioneerlegal','Pioneer Legal','Pioneer Legal','https://pioneerlegal.in/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('veritaslegal','Veritas Legal','Veritas Legal','https://www.veritaslegal.in/careers/','indian_law_firm','tier_3','IN','monthly','active',true),

  -- IP boutiques
  ('remfry','Remfry & Sagar','Remfry & Sagar','https://remfry.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('knspartners','K&S Partners','K&S Partners','https://knspartners.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('lexorbis','LexOrbis','LexOrbis','https://www.lexorbis.com/careers/','indian_law_firm','tier_2','IN','weekly','active',true),
  ('singhandsingh','Singh & Singh','Singh & Singh','https://singhandsingh.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),
  ('inttladvocare','Inttl Advocare','Inttl Advocare','https://inttladvocare.com/careers/','indian_law_firm','tier_3','IN','monthly','active',true),

  -- Big 4 / Consulting
  ('eyindia','EY India','EY India','https://www.ey.com/en_in/careers','big4','tier_1','IN','weekly','active',true),
  ('deloitteindia','Deloitte India','Deloitte India','https://www2.deloitte.com/in/en/careers.html','big4','tier_1','IN','weekly','active',true),
  ('kpmgindia','KPMG India','KPMG India','https://home.kpmg/in/en/home/careers.html','big4','tier_1','IN','weekly','active',true),
  ('pwcindia','PwC India','PwC India','https://www.pwc.in/careers.html','big4','tier_1','IN','weekly','active',true),
  ('gtbharat','Grant Thornton Bharat','Grant Thornton Bharat','https://www.grantthornton.in/careers/','big4','tier_2','IN','weekly','active',true),
  ('bdoindia','BDO India','BDO India','https://www.bdo.in/en-gb/careers','big4','tier_2','IN','weekly','active',true),
  ('rsmindia','RSM India','RSM India','https://www.rsm.global/india/careers','big4','tier_2','IN','monthly','active',true),
  ('nangia','Nangia Andersen','Nangia Andersen','https://nangia-andersen.com/careers/','big4','tier_2','IN','monthly','active',true),

  -- Indian conglomerates
  ('tatas','Tata Group (TAS)','Tata Group (TAS)','https://tas.tatacareers.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('reliance','Reliance Industries','Reliance Industries','https://careers.ril.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('adityabirla','Aditya Birla Group','Aditya Birla Group','https://careers.adityabirla.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('mahindra','Mahindra Group','Mahindra Group','https://careers.mahindra.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('itc','ITC Limited','ITC Limited','https://www.itcportal.com/careers/','corporate_indian','tier_1','IN','weekly','active',true),
  ('hul','Hindustan Unilever','Hindustan Unilever','https://careers.unilever.com/','corporate_mnc','tier_1','IN','weekly','active',true),
  ('lt','Larsen & Toubro','Larsen & Toubro','https://www.larsentoubro.com/careers/','corporate_indian','tier_1','IN','weekly','active',true),
  ('bajaj','Bajaj Group','Bajaj Group','https://www.bajajauto.com/about-us/careers','corporate_indian','tier_2','IN','monthly','active',true),
  ('godrej','Godrej Industries','Godrej Industries','https://www.godrejcareers.com/','corporate_indian','tier_2','IN','weekly','active',true),

  -- MNCs
  ('microsoftindia','Microsoft India','Microsoft India','https://careers.microsoft.com/','corporate_mnc','tier_1','IN','weekly','active',true),
  ('amazonindia','Amazon India','Amazon India','https://www.amazon.jobs/en/locations/india','corporate_mnc','tier_1','IN','weekly','active',true),
  ('googleindia','Google India','Google India','https://careers.google.com/locations/india/','corporate_mnc','tier_1','IN','weekly','active',true),
  ('metaindia','Meta India','Meta India','https://www.metacareers.com/','corporate_mnc','tier_1','IN','weekly','active',true),
  ('cmacgmindia','CMA CGM India','CMA CGM India','https://www.cma-cgm.com/the-group/careers','corporate_mnc','tier_2','IN','monthly','active',true),
  ('maerskindia','Maersk India','Maersk India','https://www.maersk.com/careers','corporate_mnc','tier_2','IN','monthly','active',true),
  ('dhlindia','DHL India','DHL India','https://careers.dhl.com/','corporate_mnc','tier_2','IN','monthly','active',true),
  ('schneiderindia','Schneider Electric India','Schneider Electric India','https://www.se.com/in/en/about-us/careers/','corporate_mnc','tier_2','IN','monthly','active',true),
  ('siemensindia','Siemens India','Siemens India','https://www.siemens.com/in/en/company/jobs.html','corporate_mnc','tier_2','IN','monthly','active',true),

  -- Banking / NBFC / Fintech
  ('hdfcbank','HDFC Bank','HDFC Bank','https://www.hdfcbank.com/personal/about-us/careers','corporate_indian','tier_1','IN','weekly','active',true),
  ('icicibank','ICICI Bank','ICICI Bank','https://www.icicicareers.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('axisbank','Axis Bank','Axis Bank','https://www.axisbank.com/careers','corporate_indian','tier_1','IN','weekly','active',true),
  ('kotak','Kotak Mahindra Bank','Kotak Mahindra Bank','https://www.kotak.com/en/about-us/careers.html','corporate_indian','tier_1','IN','weekly','active',true),
  ('sbi','SBI','SBI','https://bank.sbi/web/careers','corporate_indian','tier_1','IN','monthly','active',true),
  ('bajajfinserv','Bajaj Finserv','Bajaj Finserv','https://www.bajajfinserv.in/careers','corporate_indian','tier_1','IN','weekly','active',true),
  ('razorpay','Razorpay','Razorpay','https://razorpay.com/jobs/jobs-all/','legal_tech','tier_1','IN','weekly','active',true),
  ('phonepe','PhonePe','PhonePe','https://www.phonepe.com/careers/','corporate_indian','tier_1','IN','weekly','active',true),
  ('paytm','Paytm','Paytm','https://jobs.paytm.com/','corporate_indian','tier_1','IN','weekly','active',true),

  -- Pharma
  ('sunpharma','Sun Pharma','Sun Pharma','https://sunpharma.com/careers/','corporate_indian','tier_2','IN','monthly','active',true),
  ('cipla','Cipla','Cipla','https://www.cipla.com/careers','corporate_indian','tier_2','IN','monthly','active',true),
  ('drreddys','Dr. Reddy''s','Dr. Reddy''s','https://careers.drreddys.com/','corporate_indian','tier_2','IN','monthly','active',true),
  ('lupin','Lupin','Lupin','https://www.lupin.com/careers/','corporate_indian','tier_2','IN','monthly','active',true),
  ('biocon','Biocon','Biocon','https://www.biocon.com/careers/','corporate_indian','tier_2','IN','monthly','active',true),

  -- Tech / Internet
  ('flipkart','Flipkart','Flipkart','https://www.flipkartcareers.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('swiggy','Swiggy','Swiggy','https://careers.swiggy.com/','corporate_indian','tier_1','IN','weekly','active',true),
  ('zomato','Zomato','Zomato','https://www.zomato.com/careers/','corporate_indian','tier_1','IN','weekly','active',true),
  ('ola','Ola','Ola','https://www.olacabs.com/careers','corporate_indian','tier_2','IN','weekly','active',true),
  ('nykaa','Nykaa','Nykaa','https://www.nykaa.com/careers','corporate_indian','tier_2','IN','weekly','active',true),
  ('infosys','Infosys','Infosys','https://www.infosys.com/careers/','corporate_indian','tier_1','IN','weekly','active',true),
  ('tcs','TCS','TCS','https://www.tcs.com/careers','corporate_indian','tier_1','IN','weekly','active',true),
  ('wipro','Wipro','Wipro','https://careers.wipro.com/','corporate_indian','tier_1','IN','weekly','active',true),

  -- Insurance
  ('hdfclife','HDFC Life','HDFC Life','https://www.hdfclife.com/about-us/careers','corporate_indian','tier_2','IN','weekly','active',true),
  ('icicipru','ICICI Prudential','ICICI Prudential','https://www.iciciprulife.com/about-us/careers.html','corporate_indian','tier_2','IN','weekly','active',true),
  ('sbilife','SBI Life','SBI Life','https://www.sbilife.co.in/en/about-us/careers','corporate_indian','tier_2','IN','monthly','active',true),

  -- NGOs / Policy / Legal-tech
  ('vidhi','Vidhi Centre for Legal Policy','Vidhi Centre for Legal Policy','https://vidhilegalpolicy.in/careers/','ngo','tier_1','IN','weekly','active',true),
  ('prsindia','PRS Legislative Research','PRS Legislative Research','https://prsindia.org/careers','ngo','tier_1','IN','weekly','active',true),
  ('iff','Internet Freedom Foundation','Internet Freedom Foundation','https://internetfreedom.in/careers','ngo','tier_2','IN','weekly','active',true),
  ('sflc','SFLC.in','SFLC.in','https://sflc.in/careers/','ngo','tier_2','IN','monthly','active',true),
  ('cisindia','Centre for Internet & Society','Centre for Internet & Society','https://cis-india.org/careers','ngo','tier_2','IN','monthly','active',true),
  ('carnegie','Carnegie India','Carnegie India','https://carnegieindia.org/about/jobs','ngo','tier_2','IN','monthly','active',true),
  ('orf','ORF','ORF','https://www.orfonline.org/careers/','ngo','tier_2','IN','monthly','active',true),
  ('hrw','Human Rights Watch','Human Rights Watch','https://www.hrw.org/careers','ngo','tier_2','INTL','monthly','active',true),

  -- Remote / Legal platforms
  ('freelaw','Free Law Project','Free Law Project','https://free.law/jobs/','legal_tech','tier_3','INTL','monthly','active',true),
  ('thomsonreuters','Thomson Reuters','Thomson Reuters','https://careers.thomsonreuters.com/','legal_tech','tier_2','INTL','weekly','active',true),
  ('unitedlex','UnitedLex','UnitedLex','https://unitedlex.com/careers/','legal_tech','tier_2','INTL','weekly','active',true),
  ('integreon','Integreon','Integreon','https://www.integreon.com/careers/','legal_tech','tier_2','INTL','weekly','active',true),
  ('cipher','Cipher','Cipher','https://www.cipher.ai/careers','legal_tech','tier_3','INTL','monthly','active',true),
  ('disco','Disco','Disco','https://www.csdisco.com/careers','legal_tech','tier_2','INTL','weekly','active',true)
ON CONFLICT (url) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  tier = EXCLUDED.tier,
  country = EXCLUDED.country,
  scrape_frequency = EXCLUDED.scrape_frequency,
  pipeline_status = EXCLUDED.pipeline_status,
  updated_at = now();
