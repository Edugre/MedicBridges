-- MedicBridges v2 schema -- 07: seed the service catalog with a category taxonomy
-- service_id values are stable and referenced by the ETL keyword/UDS maps.

INSERT INTO public.service (service_id, name, code, category, description) VALUES
  (1,  'Primary Care',                     'PC',   'Primary Care',      'General adult and family medicine'),
  (2,  'Preventive Health',                'PREV', 'Primary Care',      'Screenings, immunizations, wellness visits'),
  (3,  'Pediatrics',                       'PED',  'Primary Care',      'Child and adolescent medical care'),
  (4,  'OB/GYN',                           'OBGYN','Primary Care',      'Obstetrics, gynecology, prenatal care'),
  (5,  'General Dentistry',                'DENT', 'Dental',            'Oral health and general dental services'),
  (6,  'Pediatric Dentistry',             'PDENT','Dental',            'Dental care for children'),
  (7,  'Mental Health Counseling',         'MH',   'Behavioral Health', 'Counseling and behavioral health therapy'),
  (8,  'Psychiatry',                       'PSY',  'Behavioral Health', 'Psychiatric evaluation and medication management'),
  (9,  'Substance Use Disorder Treatment', 'SUD',  'Behavioral Health', 'Addiction and medication-assisted treatment'),
  (10, 'Diagnostic Laboratory',            'LAB',  'Diagnostic',        'On-site laboratory and phlebotomy'),
  (11, 'Diagnostic Radiology',             'RAD',  'Diagnostic',        'X-ray and diagnostic imaging'),
  (12, 'Optometry & Vision Care',          'VIS',  'Vision',            'Eye exams and vision services'),
  (13, 'Pharmacy / 340B Dispensary',       'RX',   'Pharmacy',          'On-site pharmacy and 340B dispensing'),
  (14, 'Case Management',                  'CM',   'Enabling Services', 'Care coordination and patient navigation'),
  (15, 'Translation & Interpretation',     'LANG', 'Enabling Services', 'Language access and interpretation'),
  (16, 'Patient Transportation',           'TRANS','Enabling Services', 'Transportation assistance')
ON CONFLICT (service_id) DO UPDATE SET
  name        = EXCLUDED.name,
  code        = EXCLUDED.code,
  category    = EXCLUDED.category,
  description = EXCLUDED.description;
