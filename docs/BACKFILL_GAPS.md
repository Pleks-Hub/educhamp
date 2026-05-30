# EduChamp Phase 1C Backfill Gaps Report

Generated: 2026-05-30T04:39:43.345Z

## Summary

| Category | Count |
|---|---|
| Units with extracted canonical TEKS codes | 444 |
| Units with narrative-only teksAlignment (need manual TEKS codes) | 444 |
| Extracted codes not yet in standards table | 97 |
| masteryRecords backfilled | 0 |
| masteryRecords skipped (no mapping) | 0 |

## ⚠️ Phase 2 Day 1 Priority: Algebra I Narrative Gaps

All Algebra I units use narrative-only teksAlignment strings. These have been assigned
`isCanonical = false` placeholder standards (prefixed `SLUG_`). The "am I at par"
diagnostic **cannot work correctly for Algebra I** until these are replaced with real TEKS codes.

**Action required before Phase 2 lesson content injection:**
For each row below, look up the real TEKS code and run:
```sql
UPDATE standards SET code = '<REAL_TEKS_CODE>', isCanonical = true
WHERE code = '<SLUG_CODE>';
```

### Narrative-Only Units (444 units)

| Unit ID | Unit Title | teksAlignment Text | Placeholder Code |
|---|---|---|---|
| 1 | Reading Foundations & Comprehension | Aligned to TEKS Algebra I — algebraic reasoning and number properties | `SLUG_alg1_algebraic_reasoning_and_number_properties` |
| 2 | Linear Equations | Aligned to TEKS Algebra I — solving linear equations | `SLUG_alg1_solving_linear_equations` |
| 3 | Linear Inequalities | Aligned to TEKS Algebra I — solving linear inequalities | `SLUG_alg1_solving_linear_inequalities` |
| 4 | Functions and Relations | Aligned to TEKS Algebra I — functions and their representations | `SLUG_alg1_functions_and_their_representations` |
| 5 | Linear Functions and Graphing | Aligned to TEKS Algebra I — linear functions and graphing | `SLUG_alg1_linear_functions_and_graphing` |
| 6 | Systems of Equations | Aligned to TEKS Algebra I — systems of linear equations | `SLUG_alg1_systems_of_linear_equations` |
| 7 | Exponents and Exponential Functions | Aligned to TEKS Algebra I — exponents and exponential functions | `SLUG_alg1_exponents_and_exponential_functions` |
| 8 | Polynomials | Aligned to TEKS Algebra I — polynomial operations | `SLUG_alg1_polynomial_operations` |
| 9 | Factoring | Aligned to TEKS Algebra I — factoring polynomials | `SLUG_alg1_factoring_polynomials` |
| 10 | Quadratic Functions | Aligned to TEKS Algebra I — quadratic functions and equations | `SLUG_alg1_quadratic_functions_and_equations` |
| 11 | Data Analysis and Scatter Plots | Aligned to TEKS Algebra I — data analysis and statistical reasoning | `SLUG_alg1_data_analysis_and_statistical_reasoning` |
| 12 | STAAR/EOC-Style Review | Aligned to TEKS Algebra I — comprehensive review across all strands | `SLUG_alg1_comprehensive_review_across_all_strands` |
| 60012 | AP Exam Free-Response Strategies | AP Chem FRQ | `SLUG_ap_chem_frq` |
| 60013 | Full AP Practice Exam | AP Chem Exam | `SLUG_ap_chem_exam` |
| 60036 | AP Exam Free-Response Strategies | AP Stat FRQ | `SLUG_ap_stat_frq` |
| 60037 | Full AP Practice Exam | AP Stat Exam | `SLUG_ap_stat_exam` |
| 60038 | Limits & Continuity | AP Calc BC Unit 1 | `SLUG_ap_calc_bc_unit_1` |
| 60039 | Differentiation: Definition & Fundamental Properties | AP Calc BC Unit 2 | `SLUG_ap_calc_bc_unit_2` |
| 60040 | Differentiation: Composite, Implicit & Inverse Functions | AP Calc BC Unit 3 | `SLUG_ap_calc_bc_unit_3` |
| 60041 | Contextual Applications of Differentiation | AP Calc BC Unit 4 | `SLUG_ap_calc_bc_unit_4` |
| 60042 | Analytical Applications of Differentiation | AP Calc BC Unit 5 | `SLUG_ap_calc_bc_unit_5` |
| 60043 | Integration & Accumulation of Change | AP Calc BC Unit 6 | `SLUG_ap_calc_bc_unit_6` |
| 60044 | Differential Equations | AP Calc BC Unit 7 | `SLUG_ap_calc_bc_unit_7` |
| 60045 | Applications of Integration | AP Calc BC Unit 8 | `SLUG_ap_calc_bc_unit_8` |
| 60046 | Parametric Equations, Polar Coordinates & Vector-Valued Functions | AP Calc BC Unit 9 | `SLUG_ap_calc_bc_unit_9` |
| 60047 | Infinite Sequences & Series | AP Calc BC Unit 10 | `SLUG_ap_calc_bc_unit_10` |
| 60048 | AP Exam Free-Response Strategies | AP Calc BC FRQ | `SLUG_ap_calc_bc_frq` |
| 60049 | Full AP Practice Exam | AP Calc BC Exam | `SLUG_ap_calc_bc_exam` |
| 60058 | The Literary Argument Essay (Q3) | AP Lit Q3 | `SLUG_ap_lit_q3` |
| 60059 | Prose Analysis Essay (Q2) | AP Lit Q2 | `SLUG_ap_lit_q2` |
| 60060 | Poetry Analysis Essay (Q1) | AP Lit Q1 | `SLUG_ap_lit_q1` |
| 60061 | Full AP Practice Exam | AP Lit Exam | `SLUG_ap_lit_exam` |
| 60074 | SAT Overview & Score Strategy | SAT Overview | `SLUG_sat_overview` |
| 60075 | Reading: Information & Ideas | SAT Reading | `SLUG_sat_reading` |
| 60076 | Reading: Craft & Structure | SAT Reading | `SLUG_sat_reading` |
| 60077 | Writing: Standard English Conventions | SAT Writing | `SLUG_sat_writing` |
| 60078 | Writing: Expression of Ideas | SAT Writing | `SLUG_sat_writing` |
| 60079 | Math: Algebra & Linear Functions | SAT Math | `SLUG_sat_math` |
| 60080 | Math: Advanced Algebra & Functions | SAT Math | `SLUG_sat_math` |
| 60081 | Math: Problem-Solving & Data Analysis | SAT Math | `SLUG_sat_math` |
| 60082 | Math: Geometry & Trigonometry | SAT Math | `SLUG_sat_math` |
| 60083 | Advanced SAT Tricks & Shortcuts | SAT Strategies | `SLUG_sat_strategies` |
| 60084 | Full Practice Test 1 with Analysis | SAT Practice | `SLUG_sat_practice` |
| 60085 | Full Practice Test 2 & Score Maximization | SAT Practice | `SLUG_sat_practice` |
| 90001 | Place Value & Number Sense | TEKS 4.2 | `SLUG_teks_4_2` |
| 90002 | Addition & Subtraction | TEKS 4.4 | `SLUG_teks_4_4` |
| 90003 | Multiplication | TEKS 4.4 | `SLUG_teks_4_4` |
| 90004 | Division | TEKS 4.4 | `SLUG_teks_4_4` |
| 90005 | Fractions | TEKS 4.3 | `SLUG_teks_4_3` |
| 90006 | Decimals | TEKS 4.2 | `SLUG_teks_4_2` |
| 90007 | Geometry & Measurement | TEKS 4.5-4.8 | `SLUG_teks_4_5_4_8` |
| 90008 | Data Analysis | TEKS 4.9 | `SLUG_teks_4_9` |
| 90017 | Reading Comprehension — Literary Text | TEKS 4.7-4.8 | `SLUG_teks_4_7_4_8` |
| 90018 | Reading Comprehension — Informational Text | TEKS 4.9-4.10 | `SLUG_teks_4_9_4_10` |
| 90019 | Vocabulary & Word Study | TEKS 4.3 | `SLUG_teks_4_3` |
| 90020 | Writing — Narrative | TEKS 4.11 | `SLUG_teks_4_11` |
| 90021 | Writing — Expository | TEKS 4.11 | `SLUG_teks_4_11` |
| 90022 | Writing — Persuasive | TEKS 4.11 | `SLUG_teks_4_11` |
| 90023 | Grammar & Conventions | TEKS 4.12 | `SLUG_teks_4_12` |
| 90024 | Research & Oral Communication | TEKS 4.6, 4.13 | `SLUG_teks_4_6_4_13` |
| 90025 | Scientific Investigation | TEKS 4.1-4.2 | `SLUG_teks_4_1_4_2` |
| 90026 | Matter & Its Properties | TEKS 4.5 | `SLUG_teks_4_5` |
| 90027 | Energy | TEKS 4.6 | `SLUG_teks_4_6` |
| 90028 | Force & Motion | TEKS 4.6 | `SLUG_teks_4_6` |
| 90029 | Earth's Surface | TEKS 4.7 | `SLUG_teks_4_7` |
| 90030 | Weather & Climate | TEKS 4.8 | `SLUG_teks_4_8` |
| 90031 | Organisms & Environments | TEKS 4.9 | `SLUG_teks_4_9` |
| 90032 | Earth & Space | TEKS 4.8 | `SLUG_teks_4_8` |
| 90033 | Texas Geography | TEKS 4.7-4.8 | `SLUG_teks_4_7_4_8` |
| 90034 | Native Americans of Texas | TEKS 4.1 | `SLUG_teks_4_1` |
| 90035 | European Exploration & Settlement | TEKS 4.2 | `SLUG_teks_4_2` |
| 90036 | Texas Revolution | TEKS 4.3 | `SLUG_teks_4_3` |
| 90037 | Republic of Texas & Statehood | TEKS 4.3 | `SLUG_teks_4_3` |
| 90038 | Texas Economy | TEKS 4.9-4.11 | `SLUG_teks_4_9_4_11` |
| 90039 | Texas Government & Citizenship | TEKS 4.14-4.17 | `SLUG_teks_4_14_4_17` |
| 90040 | Texas Culture & Contributions | TEKS 4.18-4.20 | `SLUG_teks_4_18_4_20` |
| 90041 | Digital Citizenship & Safety | TEKS Tech 4.1 | `SLUG_teks_tech_4_1` |
| 90042 | Coding Fundamentals | TEKS Tech 4.5 | `SLUG_teks_tech_4_5` |
| 90043 | Word Processing & Documents | TEKS Tech 4.3 | `SLUG_teks_tech_4_3` |
| 90044 | Spreadsheets & Data | TEKS Tech 4.3 | `SLUG_teks_tech_4_3` |
| 90045 | Presentations | TEKS Tech 4.3 | `SLUG_teks_tech_4_3` |
| 90046 | Internet Research Skills | TEKS Tech 4.4 | `SLUG_teks_tech_4_4` |
| 90047 | Multimedia & Creative Projects | TEKS Tech 4.6 | `SLUG_teks_tech_4_6` |
| 90048 | Computational Thinking | TEKS Tech 4.5 | `SLUG_teks_tech_4_5` |
| 90049 | Place Value & Decimals | TEKS 5.2 | `SLUG_teks_5_2` |
| 90050 | Operations with Decimals | TEKS 5.3 | `SLUG_teks_5_3` |
| 90051 | Fractions — Addition & Subtraction | TEKS 5.3 | `SLUG_teks_5_3` |
| 90052 | Fractions — Multiplication & Division | TEKS 5.3 | `SLUG_teks_5_3` |
| 90053 | Algebraic Reasoning | TEKS 5.4 | `SLUG_teks_5_4` |
| 90054 | Geometry | TEKS 5.5-5.6 | `SLUG_teks_5_5_5_6` |
| 90055 | Measurement & Conversions | TEKS 5.7 | `SLUG_teks_5_7` |
| 90056 | Data Analysis & Graphing | TEKS 5.9 | `SLUG_teks_5_9` |
| 90057 | Literary Analysis | TEKS 5.7-5.8 | `SLUG_teks_5_7_5_8` |
| 90058 | Informational Text | TEKS 5.9-5.10 | `SLUG_teks_5_9_5_10` |
| 90059 | Vocabulary & Word Study | TEKS 5.3 | `SLUG_teks_5_3` |
| 90060 | Narrative Writing | TEKS 5.11 | `SLUG_teks_5_11` |
| 90061 | Expository Writing | TEKS 5.11 | `SLUG_teks_5_11` |
| 90062 | Persuasive & Argumentative Writing | TEKS 5.11 | `SLUG_teks_5_11` |
| 90063 | Grammar & Conventions | TEKS 5.12 | `SLUG_teks_5_12` |
| 90064 | Research & Media Literacy | TEKS 5.6, 5.13 | `SLUG_teks_5_6_5_13` |
| 90065 | Scientific Process & Safety | TEKS 5.1-5.2 | `SLUG_teks_5_1_5_2` |
| 90066 | Properties of Matter | TEKS 5.5 | `SLUG_teks_5_5` |
| 90067 | Energy Transformations | TEKS 5.6 | `SLUG_teks_5_6` |
| 90068 | Force, Motion & Simple Machines | TEKS 5.6 | `SLUG_teks_5_6` |
| 90069 | Earth's Systems | TEKS 5.7 | `SLUG_teks_5_7` |
| 90070 | Weather, Climate & Water Cycle | TEKS 5.8 | `SLUG_teks_5_8` |
| 90071 | Ecosystems & Food Webs | TEKS 5.9 | `SLUG_teks_5_9` |
| 90072 | Space Systems | TEKS 5.8 | `SLUG_teks_5_8` |
| 90073 | Geography of the United States | TEKS 5.8-5.9 | `SLUG_teks_5_8_5_9` |
| 90074 | Native Americans | TEKS 5.1 | `SLUG_teks_5_1` |
| 90075 | European Exploration & Colonization | TEKS 5.2 | `SLUG_teks_5_2` |
| 90076 | American Revolution | TEKS 5.3 | `SLUG_teks_5_3` |
| 90077 | The Constitution & New Nation | TEKS 5.4 | `SLUG_teks_5_4` |
| 90078 | Westward Expansion | TEKS 5.5 | `SLUG_teks_5_5` |
| 90079 | Civil War & Reconstruction | TEKS 5.6 | `SLUG_teks_5_6` |
| 90080 | U.S. Government & Economics | TEKS 5.15-5.20 | `SLUG_teks_5_15_5_20` |
| 90081 | Digital Citizenship & Ethics | TEKS Tech 5.1 | `SLUG_teks_tech_5_1` |
| 90082 | Programming & Coding | TEKS Tech 5.5 | `SLUG_teks_tech_5_5` |
| 90083 | Advanced Word Processing | TEKS Tech 5.3 | `SLUG_teks_tech_5_3` |
| 90084 | Spreadsheets & Data Analysis | TEKS Tech 5.3 | `SLUG_teks_tech_5_3` |
| 90085 | Multimedia Presentations | TEKS Tech 5.3 | `SLUG_teks_tech_5_3` |
| 90086 | Research & Information Literacy | TEKS Tech 5.4 | `SLUG_teks_tech_5_4` |
| 90087 | Digital Storytelling & Media | TEKS Tech 5.6 | `SLUG_teks_tech_5_6` |
| 90088 | Computational Thinking & Problem Solving | TEKS Tech 5.5 | `SLUG_teks_tech_5_5` |
| 90089 | Advanced Place Value & Number Theory | TEKS 4.2 KAP | `SLUG_teks_4_2_kap` |
| 90090 | Multi-Step Problem Solving | TEKS 4.4 KAP | `SLUG_teks_4_4_kap` |
| 90091 | Advanced Fractions | TEKS 4.3 KAP | `SLUG_teks_4_3_kap` |
| 90092 | Decimals & Percents | TEKS 4.2 KAP | `SLUG_teks_4_2_kap` |
| 90093 | Pre-Algebraic Reasoning | TEKS 4.4 KAP | `SLUG_teks_4_4_kap` |
| 90094 | Geometry & Spatial Reasoning | TEKS 4.5 KAP | `SLUG_teks_4_5_kap` |
| 90095 | Measurement & Data | TEKS 4.7-4.9 KAP | `SLUG_teks_4_7_4_9_kap` |
| 90096 | Mathematical Reasoning & Proof | TEKS 4 KAP | `SLUG_teks_4_kap` |
| 90097 | Advanced Decimals & Number Theory | TEKS 5.2-5.3 KAP | `SLUG_teks_5_2_5_3_kap` |
| 90098 | Fraction Operations & Ratios | TEKS 5.3 KAP | `SLUG_teks_5_3_kap` |
| 90099 | Pre-Algebra: Expressions & Equations | TEKS 5.4 KAP | `SLUG_teks_5_4_kap` |
| 90100 | Integers & Coordinate Plane | TEKS 5.4 KAP | `SLUG_teks_5_4_kap` |
| 90101 | Advanced Geometry | TEKS 5.5-5.6 KAP | `SLUG_teks_5_5_5_6_kap` |
| 90102 | Proportional Reasoning | TEKS 5 KAP | `SLUG_teks_5_kap` |
| 90103 | Statistics & Probability | TEKS 5.9 KAP | `SLUG_teks_5_9_kap` |
| 90104 | Mathematical Reasoning & Proof | TEKS 5 KAP | `SLUG_teks_5_kap` |
| 90105 | Advanced Literary Analysis | TEKS 4.7-4.8 KAP | `SLUG_teks_4_7_4_8_kap` |
| 90106 | Critical Reading of Informational Text | TEKS 4.9-4.10 KAP | `SLUG_teks_4_9_4_10_kap` |
| 90107 | Advanced Vocabulary & Etymology | TEKS 4.3 KAP | `SLUG_teks_4_3_kap` |
| 90108 | Advanced Narrative Writing | TEKS 4.11 KAP | `SLUG_teks_4_11_kap` |
| 90109 | Research Writing | TEKS 4.11 KAP | `SLUG_teks_4_11_kap` |
| 90110 | Argumentative Writing | TEKS 4.11 KAP | `SLUG_teks_4_11_kap` |
| 90111 | Advanced Grammar & Style | TEKS 4.12 KAP | `SLUG_teks_4_12_kap` |
| 90112 | Socratic Seminar & Debate | TEKS 4.6 KAP | `SLUG_teks_4_6_kap` |
| 90113 | Complex Literary Analysis | TEKS 5.7-5.8 KAP | `SLUG_teks_5_7_5_8_kap` |
| 90114 | Evaluating Informational Text | TEKS 5.9-5.10 KAP | `SLUG_teks_5_9_5_10_kap` |
| 90115 | Advanced Vocabulary & Word Study | TEKS 5.3 KAP | `SLUG_teks_5_3_kap` |
| 90116 | Advanced Narrative Writing | TEKS 5.11 KAP | `SLUG_teks_5_11_kap` |
| 90117 | Argumentative & Persuasive Writing | TEKS 5.11 KAP | `SLUG_teks_5_11_kap` |
| 90118 | Research & Synthesis | TEKS 5.11 KAP | `SLUG_teks_5_11_kap` |
| 90119 | Advanced Grammar & Rhetoric | TEKS 5.12 KAP | `SLUG_teks_5_12_kap` |
| 90120 | Socratic Seminar & Academic Discourse | TEKS 5.6 KAP | `SLUG_teks_5_6_kap` |
| 120001 | Ratios and Rates | TEKS 6.4-6.5 | `SLUG_teks_6_4_6_5` |
| 120002 | Fractions, Decimals, and Percents | TEKS 6.4 | `SLUG_teks_6_4` |
| 120003 | Integers and the Number Line | TEKS 6.2 | `SLUG_teks_6_2` |
| 120004 | Operations with Rational Numbers | TEKS 6.3 | `SLUG_teks_6_3` |
| 120005 | Expressions and Equations | TEKS 6.7-6.9 | `SLUG_teks_6_7_6_9` |
| 120006 | Proportional Relationships | TEKS 6.4-6.6 | `SLUG_teks_6_4_6_6` |
| 120007 | Geometry: Area, Surface Area, and Volume | TEKS 6.8 | `SLUG_teks_6_8` |
| 120008 | Statistics and Data Analysis | TEKS 6.12-6.13 | `SLUG_teks_6_12_6_13` |
| 120009 | Literary Analysis — Fiction | TEKS 6.7-6.8 | `SLUG_teks_6_7_6_8` |
| 120010 | Literary Analysis — Poetry and Drama | TEKS 6.7 | `SLUG_teks_6_7` |
| 120011 | Informational Text Analysis | TEKS 6.9-6.10 | `SLUG_teks_6_9_6_10` |
| 120012 | Vocabulary and Word Study | TEKS 6.3 | `SLUG_teks_6_3` |
| 120013 | Writing Process — Narrative | TEKS 6.11 | `SLUG_teks_6_11` |
| 120014 | Writing Process — Expository and Argumentative | TEKS 6.11 | `SLUG_teks_6_11` |
| 120015 | Research and Inquiry | TEKS 6.12 | `SLUG_teks_6_12` |
| 120016 | Grammar, Conventions, and Oral Communication | TEKS 6.1-6.2, 6.5 | `SLUG_teks_6_1_6_2_6_5` |
| 120017 | Scientific Investigation and Safety | TEKS 6.1-6.4 | `SLUG_teks_6_1_6_4` |
| 120018 | Matter and Its Properties | TEKS 6.5 | `SLUG_teks_6_5` |
| 120019 | Energy and Heat | TEKS 6.9 | `SLUG_teks_6_9` |
| 120020 | Force, Motion, and Newton's Laws | TEKS 6.8 | `SLUG_teks_6_8` |
| 120021 | Earth's Structure and Plate Tectonics | TEKS 6.10 | `SLUG_teks_6_10` |
| 120022 | Weathering, Erosion, and Soil | TEKS 6.10 | `SLUG_teks_6_10` |
| 120023 | Atmosphere and Weather | TEKS 6.11 | `SLUG_teks_6_11` |
| 120024 | Ecosystems and Interdependence | TEKS 6.12-6.13 | `SLUG_teks_6_12_6_13` |
| 120025 | Geographic Tools and World Regions | TEKS 6.3-6.4 | `SLUG_teks_6_3_6_4` |
| 120026 | Ancient Mesopotamia and Egypt | TEKS 6.1 | `SLUG_teks_6_1` |
| 120027 | Ancient Greece | TEKS 6.1 | `SLUG_teks_6_1` |
| 120028 | Ancient Rome | TEKS 6.1 | `SLUG_teks_6_1` |
| 120029 | Ancient China and India | TEKS 6.1 | `SLUG_teks_6_1` |
| 120030 | World Religions and Culture | TEKS 6.2 | `SLUG_teks_6_2` |
| 120031 | Medieval Europe and the Byzantine Empire | TEKS 6.1 | `SLUG_teks_6_1` |
| 120032 | Economics, Government, and Citizenship | TEKS 6.9-6.14 | `SLUG_teks_6_9_6_14` |
| 120033 | Digital Citizenship and Online Safety | TEKS 126.14.b.1 | `SLUG_teks_126_14_b_1` |
| 120034 | Computational Thinking and Problem Solving | TEKS 126.14.b.2 | `SLUG_teks_126_14_b_2` |
| 120035 | Introduction to Coding and Programming | TEKS 126.14.b.3 | `SLUG_teks_126_14_b_3` |
| 120036 | Data Management and Spreadsheets | TEKS 126.14.b.4 | `SLUG_teks_126_14_b_4` |
| 120037 | Multimedia and Digital Communication | TEKS 126.14.b.5 | `SLUG_teks_126_14_b_5` |
| 120038 | Research, Information Literacy, and AI Basics | TEKS 126.14.b.6 | `SLUG_teks_126_14_b_6` |
| 120039 | Proportionality and Constant of Variation | TEKS 7.4 | `SLUG_teks_7_4` |
| 120040 | Rational Number Operations | TEKS 7.3 | `SLUG_teks_7_3` |
| 120041 | Expressions and Equations | TEKS 7.10-7.11 | `SLUG_teks_7_10_7_11` |
| 120042 | Percent Applications | TEKS 7.4 | `SLUG_teks_7_4` |
| 120043 | Geometry: Scale Drawings and Similarity | TEKS 7.5 | `SLUG_teks_7_5` |
| 120044 | Geometry: Circles and Composite Figures | TEKS 7.8-7.9 | `SLUG_teks_7_8_7_9` |
| 120045 | Statistics and Probability | TEKS 7.6, 7.12 | `SLUG_teks_7_6_7_12` |
| 120046 | Financial Literacy | TEKS 7.13 | `SLUG_teks_7_13` |
| 120047 | Literary Analysis — Novel Study | TEKS 7.7-7.8 | `SLUG_teks_7_7_7_8` |
| 120048 | Literary Analysis — Short Stories and Poetry | TEKS 7.7 | `SLUG_teks_7_7` |
| 120049 | Informational and Argumentative Text | TEKS 7.9-7.10 | `SLUG_teks_7_9_7_10` |
| 120050 | Vocabulary — Academic and Domain-Specific | TEKS 7.3 | `SLUG_teks_7_3` |
| 120051 | Argumentative Writing | TEKS 7.11 | `SLUG_teks_7_11` |
| 120052 | Expository and Informational Writing | TEKS 7.11 | `SLUG_teks_7_11` |
| 120053 | Research Process and Synthesis | TEKS 7.12 | `SLUG_teks_7_12` |
| 120054 | Grammar, Style, and Oral Communication | TEKS 7.1-7.2, 7.5 | `SLUG_teks_7_1_7_2_7_5` |
| 120055 | Scientific Investigation and Measurement | TEKS 7.1-7.4 | `SLUG_teks_7_1_7_4` |
| 120056 | Cell Structure and Function | TEKS 7.12 | `SLUG_teks_7_12` |
| 120057 | Cell Processes — Photosynthesis and Respiration | TEKS 7.12 | `SLUG_teks_7_12` |
| 120058 | Genetics and Heredity | TEKS 7.14 | `SLUG_teks_7_14` |
| 120059 | Evolution and Natural Selection | TEKS 7.11 | `SLUG_teks_7_11` |
| 120060 | Taxonomy and Classification | TEKS 7.10 | `SLUG_teks_7_10` |
| 120061 | Ecology and Ecosystems | TEKS 7.5, 7.13 | `SLUG_teks_7_5_7_13` |
| 120062 | Human Body Systems | TEKS 7.12 | `SLUG_teks_7_12` |
| 120063 | Native Americans of Texas | TEKS 7.1 | `SLUG_teks_7_1` |
| 120064 | European Exploration and Colonization | TEKS 7.2 | `SLUG_teks_7_2` |
| 120065 | Mexican Texas and Anglo Settlement | TEKS 7.3 | `SLUG_teks_7_3` |
| 120066 | Texas Revolution | TEKS 7.4 | `SLUG_teks_7_4` |
| 120067 | Republic of Texas | TEKS 7.5 | `SLUG_teks_7_5` |
| 120068 | Texas Statehood and Antebellum Period | TEKS 7.6 | `SLUG_teks_7_6` |
| 120069 | Civil War and Reconstruction in Texas | TEKS 7.7 | `SLUG_teks_7_7` |
| 120070 | Texas Geography, Economics, and Government | TEKS 7.8-7.14 | `SLUG_teks_7_8_7_14` |
| 120071 | Advanced Digital Citizenship | TEKS 126.14.b.1 | `SLUG_teks_126_14_b_1` |
| 120072 | Programming Logic and Algorithms | TEKS 126.14.b.2 | `SLUG_teks_126_14_b_2` |
| 120073 | Web Design Fundamentals | TEKS 126.14.b.3 | `SLUG_teks_126_14_b_3` |
| 120074 | Database Concepts and Spreadsheet Analysis | TEKS 126.14.b.4 | `SLUG_teks_126_14_b_4` |
| 120075 | Digital Media Production | TEKS 126.14.b.5 | `SLUG_teks_126_14_b_5` |
| 120076 | Cybersecurity and Digital Responsibility | TEKS 126.14.b.6 | `SLUG_teks_126_14_b_6` |
| 120077 | Number and Operations — Real Numbers | TEKS 8.2 | `SLUG_teks_8_2` |
| 120078 | Proportionality and Slope | TEKS 8.4-8.5 | `SLUG_teks_8_4_8_5` |
| 120079 | Expressions and Equations | TEKS 8.7-8.8 | `SLUG_teks_8_7_8_8` |
| 120080 | Two-Variable Equations and Systems | TEKS 8.8-8.9 | `SLUG_teks_8_8_8_9` |
| 120081 | Functions | TEKS 8.5 | `SLUG_teks_8_5` |
| 120082 | Geometry — Transformations | TEKS 8.10 | `SLUG_teks_8_10` |
| 120083 | Pythagorean Theorem and Volume | TEKS 8.6, 8.7 | `SLUG_teks_8_6_8_7` |
| 120084 | Statistics and Scatter Plots | TEKS 8.11-8.12 | `SLUG_teks_8_11_8_12` |
| 120085 | Literary Analysis — Complex Texts | TEKS 8.7-8.8 | `SLUG_teks_8_7_8_8` |
| 120086 | Literary Analysis — Across Genres | TEKS 8.7 | `SLUG_teks_8_7` |
| 120087 | Informational and Persuasive Text | TEKS 8.9-8.10 | `SLUG_teks_8_9_8_10` |
| 120088 | Vocabulary — Advanced Word Study | TEKS 8.3 | `SLUG_teks_8_3` |
| 120089 | Argumentative Writing — Advanced | TEKS 8.11 | `SLUG_teks_8_11` |
| 120090 | Literary and Analytical Writing | TEKS 8.11 | `SLUG_teks_8_11` |
| 120091 | Research and Synthesis | TEKS 8.12 | `SLUG_teks_8_12` |
| 120092 | Media Literacy and Oral Communication | TEKS 8.1-8.2, 8.5-8.6 | `SLUG_teks_8_1_8_2_8_5_8_6` |
| 120093 | Scientific Investigation and Reasoning | TEKS 8.1-8.4 | `SLUG_teks_8_1_8_4` |
| 120094 | Matter — Atoms and the Periodic Table | TEKS 8.5 | `SLUG_teks_8_5` |
| 120095 | Chemical Reactions and Properties | TEKS 8.5 | `SLUG_teks_8_5` |
| 120096 | Forces and Newton's Laws | TEKS 8.6 | `SLUG_teks_8_6` |
| 120097 | Motion and Momentum | TEKS 8.6 | `SLUG_teks_8_6` |
| 120098 | Energy — Forms and Transformations | TEKS 8.7 | `SLUG_teks_8_7` |
| 120099 | Waves, Sound, and Light | TEKS 8.7 | `SLUG_teks_8_7` |
| 120100 | Space Science and the Universe | TEKS 8.8-8.9 | `SLUG_teks_8_8_8_9` |
| 120101 | Age of Exploration and Colonial America | TEKS 8.1-8.2 | `SLUG_teks_8_1_8_2` |
| 120102 | Road to Revolution | TEKS 8.3 | `SLUG_teks_8_3` |
| 120103 | American Revolution and Independence | TEKS 8.4 | `SLUG_teks_8_4` |
| 120104 | The Constitution and Bill of Rights | TEKS 8.5-8.6 | `SLUG_teks_8_5_8_6` |
| 120105 | The Early Republic | TEKS 8.7 | `SLUG_teks_8_7` |
| 120106 | Westward Expansion and Manifest Destiny | TEKS 8.8-8.9 | `SLUG_teks_8_8_8_9` |
| 120107 | Sectionalism and the Road to Civil War | TEKS 8.10 | `SLUG_teks_8_10` |
| 120108 | Civil War and Reconstruction | TEKS 8.11-8.12 | `SLUG_teks_8_11_8_12` |
| 120109 | Digital Leadership and Ethics | TEKS 126.14.b.1 | `SLUG_teks_126_14_b_1` |
| 120110 | Advanced Programming Concepts | TEKS 126.14.b.2 | `SLUG_teks_126_14_b_2` |
| 120111 | App and Game Design | TEKS 126.14.b.3 | `SLUG_teks_126_14_b_3` |
| 120112 | Data Science and Visualization | TEKS 126.14.b.4 | `SLUG_teks_126_14_b_4` |
| 120113 | Networks and Cybersecurity | TEKS 126.14.b.5 | `SLUG_teks_126_14_b_5` |
| 120114 | Digital Entrepreneurship and Careers | TEKS 126.14.b.6 | `SLUG_teks_126_14_b_6` |
| 120115 | Ratios, Rates, and Proportional Reasoning | TEKS 6.4-6.5 | `SLUG_teks_6_4_6_5` |
| 120116 | Rational Number Operations — Advanced | TEKS 6.3 | `SLUG_teks_6_3` |
| 120117 | Algebraic Expressions and Equations | TEKS 6.7-6.9 | `SLUG_teks_6_7_6_9` |
| 120118 | Proportional Relationships and Graphing | TEKS 6.4-6.6 | `SLUG_teks_6_4_6_6` |
| 120119 | Geometry — Area, Surface Area, Volume | TEKS 6.8 | `SLUG_teks_6_8` |
| 120120 | Statistics — Data Analysis and Probability | TEKS 6.12-6.13 | `SLUG_teks_6_12_6_13` |
| 120121 | Introduction to Functions and Patterns | TEKS 6.4 | `SLUG_teks_6_4` |
| 120122 | Financial Literacy and Applications | TEKS 6.14 | `SLUG_teks_6_14` |
| 120123 | Advanced Literary Analysis — Fiction | TEKS 6.7-6.8 | `SLUG_teks_6_7_6_8` |
| 120124 | Advanced Literary Analysis — Poetry and Drama | TEKS 6.7 | `SLUG_teks_6_7` |
| 120125 | Advanced Informational and Argumentative Text | TEKS 6.9-6.10 | `SLUG_teks_6_9_6_10` |
| 120126 | Advanced Vocabulary and Etymology | TEKS 6.3 | `SLUG_teks_6_3` |
| 120127 | Argumentative Writing — Advanced | TEKS 6.11 | `SLUG_teks_6_11` |
| 120128 | Research Writing and Synthesis | TEKS 6.12 | `SLUG_teks_6_12` |
| 120129 | Literary Analysis Essay Writing | TEKS 6.11 | `SLUG_teks_6_11` |
| 120130 | Advanced Grammar and Style | TEKS 6.1-6.2, 6.5 | `SLUG_teks_6_1_6_2_6_5` |
| 120131 | Proportionality — Advanced Applications | TEKS 7.4 | `SLUG_teks_7_4` |
| 120132 | Rational Number Operations — Mastery | TEKS 7.3 | `SLUG_teks_7_3` |
| 120133 | Multi-Step Equations and Inequalities | TEKS 7.10-7.11 | `SLUG_teks_7_10_7_11` |
| 120134 | Percent and Financial Mathematics | TEKS 7.4, 7.13 | `SLUG_teks_7_4_7_13` |
| 120135 | Geometry — Similarity and Proportions | TEKS 7.5 | `SLUG_teks_7_5` |
| 120136 | Geometry — Circles and 3D Figures | TEKS 7.8-7.9 | `SLUG_teks_7_8_7_9` |
| 120137 | Statistics and Probability — Advanced | TEKS 7.6, 7.12 | `SLUG_teks_7_6_7_12` |
| 120138 | Introduction to Algebra — Functions | TEKS 7.4 | `SLUG_teks_7_4` |
| 120139 | Advanced Novel Study and Literary Analysis | TEKS 7.7-7.8 | `SLUG_teks_7_7_7_8` |
| 120140 | Advanced Poetry and Dramatic Analysis | TEKS 7.7 | `SLUG_teks_7_7` |
| 120141 | Rhetoric and Persuasion | TEKS 7.9-7.10 | `SLUG_teks_7_9_7_10` |
| 120142 | Advanced Vocabulary and Academic Language | TEKS 7.3 | `SLUG_teks_7_3` |
| 120143 | Advanced Argumentative Writing | TEKS 7.11 | `SLUG_teks_7_11` |
| 120144 | Literary Analysis Essay | TEKS 7.11 | `SLUG_teks_7_11` |
| 120145 | Advanced Research and Synthesis | TEKS 7.12 | `SLUG_teks_7_12` |
| 120146 | Advanced Grammar, Style, and Oral Communication | TEKS 7.1-7.2, 7.5 | `SLUG_teks_7_1_7_2_7_5` |
| 120147 | Real Numbers and Number Theory | TEKS 8.2 | `SLUG_teks_8_2` |
| 120148 | Linear Equations and Systems — Advanced | TEKS 8.8-8.9 | `SLUG_teks_8_8_8_9` |
| 120149 | Functions and Function Notation | TEKS 8.5 | `SLUG_teks_8_5` |
| 120150 | Slope and Linear Relationships | TEKS 8.4-8.5 | `SLUG_teks_8_4_8_5` |
| 120151 | Transformations and Congruence | TEKS 8.10 | `SLUG_teks_8_10` |
| 120152 | Pythagorean Theorem — Advanced Applications | TEKS 8.6-8.7 | `SLUG_teks_8_6_8_7` |
| 120153 | Statistics — Bivariate Data | TEKS 8.11-8.12 | `SLUG_teks_8_11_8_12` |
| 120154 | Introduction to Algebra I Concepts | TEKS 8.1-8.12 | `SLUG_teks_8_1_8_12` |
| 120155 | Advanced Literary Analysis — Complex Texts | TEKS 8.7-8.8 | `SLUG_teks_8_7_8_8` |
| 120156 | Comparative Literature Analysis | TEKS 8.7 | `SLUG_teks_8_7` |
| 120157 | Advanced Rhetoric and Argumentation | TEKS 8.9-8.10 | `SLUG_teks_8_9_8_10` |
| 120158 | Advanced Vocabulary and Academic Discourse | TEKS 8.3 | `SLUG_teks_8_3` |
| 120159 | Advanced Argumentative Writing | TEKS 8.11 | `SLUG_teks_8_11` |
| 120160 | Literary Analysis — AP Preparation | TEKS 8.11 | `SLUG_teks_8_11` |
| 120161 | Independent Research Paper | TEKS 8.12 | `SLUG_teks_8_12` |
| 120162 | Media Literacy, Rhetoric, and Advanced Communication | TEKS 8.1-8.2, 8.5-8.6 | `SLUG_teks_8_1_8_2_8_5_8_6` |
| 150001 | Scientific Investigation & STEM Thinking | TEKS 6.1-6.3 | `SLUG_teks_6_1_6_3` |
| 150002 | Properties of Matter & Atomic Structure | TEKS 6.5 | `SLUG_teks_6_5` |
| 150003 | Energy Transformations | TEKS 6.9 | `SLUG_teks_6_9` |
| 150004 | Earth's Layers & Plate Tectonics | TEKS 6.10 | `SLUG_teks_6_10` |
| 150005 | Weathering, Erosion & Soil Science | TEKS 6.11 | `SLUG_teks_6_11` |
| 150006 | Ecosystems & Biodiversity | TEKS 6.12 | `SLUG_teks_6_12` |
| 150007 | Cells & Life Processes | TEKS 6.12 | `SLUG_teks_6_12` |
| 150008 | Space Science & Earth in the Universe | TEKS 6.11 | `SLUG_teks_6_11` |
| 150009 | Geographic Tools & World Regions | TEKS 6.1-6.3 | `SLUG_teks_6_1_6_3` |
| 150010 | Ancient Civilisations & Cultural Foundations | TEKS 6.4-6.5 | `SLUG_teks_6_4_6_5` |
| 150011 | World Religions & Cultural Diffusion | TEKS 6.6 | `SLUG_teks_6_6` |
| 150012 | Economic Systems & Global Trade | TEKS 6.7-6.8 | `SLUG_teks_6_7_6_8` |
| 150013 | Government Systems & Political Philosophy | TEKS 6.9-6.10 | `SLUG_teks_6_9_6_10` |
| 150014 | Human Rights & Global Issues | TEKS 6.11 | `SLUG_teks_6_11` |
| 150015 | Primary Sources & Historical Analysis | TEKS 6.12 | `SLUG_teks_6_12` |
| 150016 | Research, Writing & Social Studies Skills | TEKS 6.13 | `SLUG_teks_6_13` |
| 150017 | Scientific Methods & Advanced Inquiry | TEKS 7.1-7.3 | `SLUG_teks_7_1_7_3` |
| 150018 | Cell Biology & Biochemistry | TEKS 7.12 | `SLUG_teks_7_12` |
| 150019 | Genetics & Heredity | TEKS 7.14 | `SLUG_teks_7_14` |
| 150020 | Evolution & Natural Selection | TEKS 7.13 | `SLUG_teks_7_13` |
| 150021 | Human Body Systems | TEKS 7.12 | `SLUG_teks_7_12` |
| 150022 | Ecosystems & Environmental Science | TEKS 7.11 | `SLUG_teks_7_11` |
| 150023 | Earth's History & Geological Time | TEKS 7.10 | `SLUG_teks_7_10` |
| 150024 | Chemistry of Life & Matter | TEKS 7.6 | `SLUG_teks_7_6` |
| 150025 | Pre-Columbian Texas & Native Peoples | TEKS 7.1 | `SLUG_teks_7_1` |
| 150026 | European Exploration & Colonisation | TEKS 7.2 | `SLUG_teks_7_2` |
| 150027 | Mexican Texas & the Road to Revolution | TEKS 7.3 | `SLUG_teks_7_3` |
| 150028 | The Republic of Texas | TEKS 7.4 | `SLUG_teks_7_4` |
| 150029 | Texas in the Civil War & Reconstruction | TEKS 7.5 | `SLUG_teks_7_5` |
| 150030 | Texas in the Industrial Age | TEKS 7.6 | `SLUG_teks_7_6` |
| 150031 | 20th Century Texas | TEKS 7.7 | `SLUG_teks_7_7` |
| 150032 | Texas Government, Geography & Economy | TEKS 7.8-7.10 | `SLUG_teks_7_8_7_10` |
| 150033 | Scientific Reasoning & STEM Applications | TEKS 8.1-8.3 | `SLUG_teks_8_1_8_3` |
| 150034 | Matter, Atomic Theory & Chemical Bonding | TEKS 8.5 | `SLUG_teks_8_5` |
| 150035 | Chemical Reactions & Stoichiometry | TEKS 8.5 | `SLUG_teks_8_5` |
| 150036 | Motion, Forces & Newton's Laws | TEKS 8.6 | `SLUG_teks_8_6` |
| 150037 | Energy, Work & Power | TEKS 8.6 | `SLUG_teks_8_6` |
| 150038 | Waves, Sound & Light | TEKS 8.7 | `SLUG_teks_8_7` |
| 150039 | Electricity & Magnetism | TEKS 8.8 | `SLUG_teks_8_8` |
| 150040 | Earth Systems & Climate Science | TEKS 8.9-8.11 | `SLUG_teks_8_9_8_11` |
| 150041 | Colonial America & the Road to Revolution | TEKS 8.1 | `SLUG_teks_8_1` |
| 150042 | The American Revolution & Founding Documents | TEKS 8.2 | `SLUG_teks_8_2` |
| 150043 | The Constitution & Bill of Rights | TEKS 8.3 | `SLUG_teks_8_3` |
| 150044 | The Early Republic & Westward Expansion | TEKS 8.4 | `SLUG_teks_8_4` |
| 150045 | Jacksonian Democracy & Reform Movements | TEKS 8.5 | `SLUG_teks_8_5` |
| 150046 | Sectionalism & the Road to Civil War | TEKS 8.6 | `SLUG_teks_8_6` |
| 150047 | The Civil War | TEKS 8.7 | `SLUG_teks_8_7` |
| 150048 | Reconstruction & Its Legacy | TEKS 8.8 | `SLUG_teks_8_8` |
| 180001 | Counting and Cardinality | PREK-MATH-U1 | `SLUG_prek_math_u1` |
| 180002 | Shapes and Spatial Sense | PREK-MATH-U2 | `SLUG_prek_math_u2` |
| 180003 | Patterns and Sorting | PREK-MATH-U3 | `SLUG_prek_math_u3` |
| 180004 | Comparing and Measuring | PREK-MATH-U4 | `SLUG_prek_math_u4` |
| 180005 | Numbers 1 to 20 | PREK-MATH-U5 | `SLUG_prek_math_u5` |
| 180006 | Print Awareness | PREK-ELA-U1 | `SLUG_prek_ela_u1` |
| 180007 | Phonological Awareness | PREK-ELA-U2 | `SLUG_prek_ela_u2` |
| 180008 | Letter Recognition | PREK-ELA-U3 | `SLUG_prek_ela_u3` |
| 180009 | Vocabulary and Oral Language | PREK-ELA-U4 | `SLUG_prek_ela_u4` |
| 180010 | Early Writing | PREK-ELA-U5 | `SLUG_prek_ela_u5` |
| 180011 | My Five Senses | PREK-SCI-U1 | `SLUG_prek_sci_u1` |
| 180012 | Living and Non-Living Things | PREK-SCI-U2 | `SLUG_prek_sci_u2` |
| 180013 | Weather and Seasons | PREK-SCI-U3 | `SLUG_prek_sci_u3` |
| 180014 | Earth Materials | PREK-SCI-U4 | `SLUG_prek_sci_u4` |
| 180015 | All About Me | PREK-SS-U1 | `SLUG_prek_ss_u1` |
| 180016 | My Family and Community | PREK-SS-U2 | `SLUG_prek_ss_u2` |
| 180017 | My World | PREK-SS-U3 | `SLUG_prek_ss_u3` |
| 180018 | Celebrations and Traditions | PREK-SS-U4 | `SLUG_prek_ss_u4` |
| 180019 | Counting to 100 | K-MATH-U1 | `SLUG_k_math_u1` |
| 180020 | Addition Foundations | K-MATH-U2 | `SLUG_k_math_u2` |
| 180021 | Subtraction Foundations | K-MATH-U3 | `SLUG_k_math_u3` |
| 180022 | Shapes and Geometry | K-MATH-U4 | `SLUG_k_math_u4` |
| 180023 | Measurement and Data | K-MATH-U5 | `SLUG_k_math_u5` |
| 180024 | Teen Numbers | K-MATH-U6 | `SLUG_k_math_u6` |
| 180025 | Phonics: Short Vowels | K-ELA-U1 | `SLUG_k_ela_u1` |
| 180026 | Sight Words | K-ELA-U2 | `SLUG_k_ela_u2` |
| 180027 | Reading Comprehension Foundations | K-ELA-U3 | `SLUG_k_ela_u3` |
| 180028 | Writing Sentences | K-ELA-U4 | `SLUG_k_ela_u4` |
| 180029 | Phonics: Consonant Blends | K-ELA-U5 | `SLUG_k_ela_u5` |
| 180030 | Living Things | K-SCI-U1 | `SLUG_k_sci_u1` |
| 180031 | Weather and Sky | K-SCI-U2 | `SLUG_k_sci_u2` |
| 180032 | Properties of Objects | K-SCI-U3 | `SLUG_k_sci_u3` |
| 180033 | Earth Resources | K-SCI-U4 | `SLUG_k_sci_u4` |
| 180034 | Community Helpers | K-SS-U1 | `SLUG_k_ss_u1` |
| 180035 | Maps and Globes | K-SS-U2 | `SLUG_k_ss_u2` |
| 180036 | National Symbols | K-SS-U3 | `SLUG_k_ss_u3` |
| 180037 | Needs and Wants | K-SS-U4 | `SLUG_k_ss_u4` |
| 180038 | Place Value: Tens and Ones | G1-MATH-U1 | `SLUG_g1_math_u1` |
| 180039 | Addition within 20 | G1-MATH-U2 | `SLUG_g1_math_u2` |
| 180040 | Subtraction within 20 | G1-MATH-U3 | `SLUG_g1_math_u3` |
| 180041 | Measurement and Time | G1-MATH-U4 | `SLUG_g1_math_u4` |
| 180042 | Geometry | G1-MATH-U5 | `SLUG_g1_math_u5` |
| 180043 | Data and Graphs | G1-MATH-U6 | `SLUG_g1_math_u6` |
| 180044 | Phonics: Long Vowels and Vowel Teams | G1-ELA-U1 | `SLUG_g1_ela_u1` |
| 180045 | Sight Words Grade 1 | G1-ELA-U2 | `SLUG_g1_ela_u2` |
| 180046 | Reading Comprehension: Fiction | G1-ELA-U3 | `SLUG_g1_ela_u3` |
| 180047 | Reading Comprehension: Nonfiction | G1-ELA-U4 | `SLUG_g1_ela_u4` |
| 180048 | Writing: Narratives and Opinions | G1-ELA-U5 | `SLUG_g1_ela_u5` |
| 180049 | Grammar and Conventions | G1-ELA-U6 | `SLUG_g1_ela_u6` |
| 180050 | Properties of Matter | G1-SCI-U1 | `SLUG_g1_sci_u1` |
| 180051 | Plants and Their Needs | G1-SCI-U2 | `SLUG_g1_sci_u2` |
| 180052 | Animals and Their Needs | G1-SCI-U3 | `SLUG_g1_sci_u3` |
| 180053 | Earth Materials and Sky | G1-SCI-U4 | `SLUG_g1_sci_u4` |
| 180054 | Family History and Traditions | G1-SS-U1 | `SLUG_g1_ss_u1` |
| 180055 | Community and Government | G1-SS-U2 | `SLUG_g1_ss_u2` |
| 180056 | Maps and Geography | G1-SS-U3 | `SLUG_g1_ss_u3` |
| 180057 | Economics: Goods and Services | G1-SS-U4 | `SLUG_g1_ss_u4` |
| 180058 | Place Value to 1000 | G2-MATH-U1 | `SLUG_g2_math_u1` |
| 180059 | Addition within 100 | G2-MATH-U2 | `SLUG_g2_math_u2` |
| 180060 | Subtraction within 100 | G2-MATH-U3 | `SLUG_g2_math_u3` |
| 180061 | Multiplication Foundations | G2-MATH-U4 | `SLUG_g2_math_u4` |
| 180062 | Measurement: Length and Time | G2-MATH-U5 | `SLUG_g2_math_u5` |
| 180063 | Geometry and Fractions | G2-MATH-U6 | `SLUG_g2_math_u6` |
| 180064 | Money and Data | G2-MATH-U7 | `SLUG_g2_math_u7` |
| 180065 | Phonics: Digraphs and Diphthongs | G2-ELA-U1 | `SLUG_g2_ela_u1` |
| 180066 | Fluency and Sight Words | G2-ELA-U2 | `SLUG_g2_ela_u2` |
| 180067 | Reading Comprehension: Fiction | G2-ELA-U3 | `SLUG_g2_ela_u3` |
| 180068 | Reading Comprehension: Nonfiction | G2-ELA-U4 | `SLUG_g2_ela_u4` |
| 180069 | Writing: Informational and Narrative | G2-ELA-U5 | `SLUG_g2_ela_u5` |
| 180070 | Grammar: Parts of Speech | G2-ELA-U6 | `SLUG_g2_ela_u6` |
| 180071 | Life Cycles | G2-SCI-U1 | `SLUG_g2_sci_u1` |
| 180072 | Habitats and Ecosystems | G2-SCI-U2 | `SLUG_g2_sci_u2` |
| 180073 | Properties and Changes of Matter | G2-SCI-U3 | `SLUG_g2_sci_u3` |
| 180074 | Earth Changing Surface | G2-SCI-U4 | `SLUG_g2_sci_u4` |
| 180075 | Government and Citizenship | G2-SS-U1 | `SLUG_g2_ss_u1` |
| 180076 | Economics: Supply and Demand | G2-SS-U2 | `SLUG_g2_ss_u2` |
| 180077 | Geography of Texas and the U.S. | G2-SS-U3 | `SLUG_g2_ss_u3` |
| 180078 | History: American Heroes and Holidays | G2-SS-U4 | `SLUG_g2_ss_u4` |

## Extracted Codes Not Yet in Standards Table (97 units)

These units had extractable TEKS codes but those codes are not yet seeded in the `standards` table.
Add them to `seed-phase1b.mjs` and re-run.

| Unit ID | Unit Title | Extracted Code |
|---|---|---|
| 30002 | Reading Foundations & Comprehension | `110.39(b)(6)` |
| 30003 | Literary Analysis: Fiction & Poetry | `110.39(b)(7)` |
| 30004 | Informational & Expository Texts | `110.39(b)(8)` |
| 30005 | Vocabulary & Academic Language | `110.39(b)(3)` |
| 30006 | Grammar & Conventions | `110.39(b)(11)` |
| 30007 | Narrative Writing | `110.39(b)(10)` |
| 30008 | Expository & Argumentative Writing | `110.39(b)(10)` |
| 30009 | Research & Synthesis | `110.39(b)(9)` |
| 30010 | Cell Structure & Function | `112.34(b)(4)` |
| 30011 | Cell Processes | `112.34(b)(5)` |
| 30012 | Genetics & Heredity | `112.34(b)(6)` |
| 30013 | Evolution & Natural Selection | `112.34(b)(7)` |
| 30014 | Ecology & Ecosystems | `112.34(b)(12)` |
| 30015 | Classification of Living Things | `112.34(b)(8)` |
| 30016 | Human Body Systems | `112.34(b)(10)` |
| 30017 | Scientific Investigations & Lab Skills | `112.34(b)(2)` |
| 30018 | Thinking Geographically | `113.44(c)(1)` |
| 30019 | Population & Migration | `113.44(c)(2)` |
| 30020 | Cultural Patterns & Processes | `113.44(c)(3)` |
| 30021 | Political Organization of Space | `113.44(c)(4)` |
| 30022 | Agriculture & Rural Land Use | `113.44(c)(5)` |
| 30023 | Industrialization & Economic Development | `113.44(c)(6)` |
| 30024 | Cities & Urban Land Use | `113.44(c)(7)` |
| 30025 | Reflexive Verbs & Daily Routines | `114.24(c)(1)` |
| 30026 | Preterite Tense | `114.24(c)(2)` |
| 30027 | Imperfect Tense | `114.24(c)(3)` |
| 30028 | Direct & Indirect Object Pronouns | `114.24(c)(4)` |
| 30029 | Subjunctive Mood | `114.24(c)(5)` |
| 30030 | Future & Conditional Tenses | `114.24(c)(6)` |
| 30031 | Reading & Cultural Competency | `114.24(c)(7)` |
| 30032 | Place Value & Number Sense | `111.5(b)(2)` |
| 30033 | Addition & Subtraction | `111.5(b)(3)` |
| 30034 | Multiplication Concepts | `111.5(b)(4)` |
| 30035 | Division Concepts | `111.5(b)(4)` |
| 30036 | Fractions | `111.5(b)(3)` |
| 30037 | Geometry | `111.5(b)(6)` |
| 30038 | Measurement & Data | `111.5(b)(7)` |
| 30039 | Phonics & Word Study | `110.5(b)(2)` |
| 30040 | Reading Comprehension: Fiction | `110.5(b)(6)` |
| 30041 | Reading Comprehension: Non-Fiction | `110.5(b)(8)` |
| 30042 | Vocabulary Development | `110.5(b)(3)` |
| 30043 | Grammar & Mechanics | `110.5(b)(11)` |
| 30044 | Writing: Narrative | `110.5(b)(10)` |
| 30045 | Writing: Informational & Opinion | `110.5(b)(10)` |
| 30046 | Matter & Its Properties | `112.14(b)(5)` |
| 30047 | Energy: Heat, Light & Sound | `112.14(b)(6)` |
| 30048 | Force & Motion | `112.14(b)(7)` |
| 30049 | Life Science: Plants | `112.14(b)(9)` |
| 30050 | Life Science: Animals | `112.14(b)(10)` |
| 30051 | Earth Science: Weather & Climate | `112.14(b)(8)` |
| 30052 | Scientific Investigation | `112.14(b)(2)` |
| 30053 | Communities & Culture | `113.14(b)(1)` |
| 30106 | Geography & Maps | `113.14(b)(4)` |
| 30107 | Texas History & Government | `113.14(b)(2)` |
| 30108 | Economics: Goods & Services | `113.14(b)(5)` |
| 30109 | Citizenship & Civics | `113.14(b)(3)` |
| 30110 | American History & Symbols | `113.14(b)(2)` |
| 60001 | Atomic Structure & Properties | `112.35(c)(2)` |
| 60003 | Molecular & Ionic Compound Structure | `112.35(c)(3)` |
| 60004 | Intermolecular Forces & Properties | `112.35(c)(4)` |
| 60005 | Chemical Reactions | `112.35(c)(5)` |
| 60006 | Kinetics | `112.35(c)(6)` |
| 60007 | Thermodynamics | `112.35(c)(7)` |
| 60008 | Equilibrium | `112.35(c)(8)` |
| 60009 | Acids & Bases | `112.35(c)(9)` |
| 60010 | Electrochemistry | `112.35(c)(10)` |
| 60011 | Organic Chemistry Fundamentals | `112.35(c)(11)` |
| 60026 | Exploring One-Variable Data | `111.47(c)(1)` |
| 60027 | Exploring Two-Variable Data | `111.47(c)(2)` |
| 60028 | Collecting Data | `111.47(c)(3)` |
| 60029 | Probability & Random Variables | `111.47(c)(4)` |
| 60030 | Sampling Distributions | `111.47(c)(5)` |
| 60031 | Inference for Categorical Data: Proportions | `111.47(c)(6)` |
| 60032 | Inference for Quantitative Data: Means | `111.47(c)(7)` |
| 60033 | Inference for Categorical Data: Chi-Square | `111.47(c)(8)` |
| 60034 | Inference for Quantitative Data: Slopes | `111.47(c)(9)` |
| 60035 | Normal & Binomial Distributions | `111.47(c)(10)` |
| 60050 | Close Reading & Textual Evidence | `110.39(c)(1)` |
| 60051 | Character, Conflict & Narrative Structure | `110.39(c)(2)` |
| 60052 | Setting, Atmosphere & Symbolism | `110.39(c)(3)` |
| 60053 | Point of View & Narrative Voice | `110.39(c)(4)` |
| 60054 | Poetry Analysis: Form & Structure | `110.39(c)(5)` |
| 60055 | Poetry Analysis: Figurative Language & Imagery | `110.39(c)(6)` |
| 60056 | Drama & Dramatic Conventions | `110.39(c)(7)` |
| 60057 | Thematic Analysis & Interpretation | `110.39(c)(8)` |
| 60062 | Personal Finance Foundations | `118.44(c)(1)` |
| 60063 | Banking, Credit & Debt Management | `118.44(c)(2)` |
| 60064 | Investing & Wealth Building | `118.44(c)(3)` |
| 60065 | Insurance & Risk Management | `118.44(c)(4)` |
| 60066 | Taxes & Government Finance | `118.44(c)(5)` |
| 60067 | Entrepreneurship & Business Planning | `118.44(c)(6)` |
| 60068 | Marketing & Consumer Behavior | `118.44(c)(7)` |
| 60069 | Business Operations & Management | `118.44(c)(8)` |
| 60070 | Accounting & Financial Statements | `118.44(c)(9)` |
| 60071 | Economics & Business Cycles | `118.44(c)(10)` |
| 60072 | Business Ethics & Social Responsibility | `118.44(c)(11)` |
| 60073 | Capstone: Business Plan Presentation | `118.44(c)(12)` |

---
*This file is auto-generated by `server/seed-phase1c-backfill.mjs`. Re-run after adding standards to update.*
