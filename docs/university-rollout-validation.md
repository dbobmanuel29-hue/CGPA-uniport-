# CGPA+ Rivers State Rollout Research

**Research date:** 11 October 2026  
**Scope decision:** Focus CGPA+ on public universities located in Rivers State instead of researching public universities across Nigeria. Private universities remain outside the product directory. Being public does not automatically qualify a university: CGPA+ should target institutions where students have a genuine unmet need for GPA/CGPA calculation or academic planning.

## Rivers State public-university landscape

The NUC's Nigerian University System directory lists these public universities in Rivers State: University of Port Harcourt (federal), Rivers State University (state), Ignatius Ajuru University of Education (state), and Federal University of Environment and Technology (federal). Private institutions in Rivers State remain out of scope under the product decision.

Official source: https://enuc.nuc.edu.ng/nus

## Candidate decisions

| University | What was verified | Current decision |
|---|---|---|
| University of Port Harcourt (UniPort) | This is CGPA+'s existing launch institution. | **Supported.** Keep existing features working and treat UniPort as the reference implementation. |
| Rivers State University (RSU) | The user confirms RSU can calculate its own GPA/CGPA. Secondary reporting also describes the RSU eCAMPUS Aspire app as including CGPA prediction. | **Skip for now.** Do not spend rollout effort here unless RSU students later identify a specific unmet need beyond the existing tool. |
| Ignatius Ajuru University of Education (IAUE) | IAUE has an official student/enterprise portal. Publicly accessible student-result artifacts hosted by third parties show semester GPA, cumulative CGPA and degree classification, suggesting that the university's result workflow already computes or displays these values. However, these artifacts are not official policy documentation, and the authenticated portal's current functionality could not be inspected without a student login. The official English Department page gives some grading-process details but does not establish a university-wide current grading scale. | **Do not enable as a basic GPA/CGPA calculator yet.** Treat IAUE as *needs validation / likely not a basic-calculator fit*. Verify with current students or IAUE ICT whether the live portal calculates GPA/CGPA and whether students lack useful planning tools such as what-if projections. Do not copy a grading scale from a third-party result artifact into CGPA+. |
| Federal University of Environment and Technology (FUET), Koroma/Saakpenwa | FUET's official ARIS portal has an “About ARIS” page that explicitly lists computation of grades, grade points and students' CGPA among the system's functions. Its portal also supports student registration and academic records. The university is new, so cohort and catalogue coverage still require special care. | **Skip as a basic GPA/CGPA calculator unless a specific gap is proven.** The official portal description indicates CGPA computation is already part of ARIS. Investigate only if FUET students identify an unmet need beyond official result calculation, such as projected CGPA/what-if planning. Do not enable calculations until rules, catalogue coverage and tests are complete. |

## Evidence and confidence

### IAUE
- Official IAUE website and undergraduate programmes: https://iaue.edu.ng/admissions/undergraduate-studies/
- Official IAUE student/enterprise portal: https://www.enterpriseschoolsportal.iaue.edu.ng/Account/Login
- Official IAUE English Department page contains a section titled “Grading System” and some graduation requirements, but it is department-specific and does not establish the current university-wide grade-point scale: https://iaue.edu.ng/english_department/
- Third-party-hosted IAUE student result examples display semester GPA, CGPA, and classification. These are useful clues about the result format, not an authoritative source for academic policy: https://www.scribd.com/document/939523998/IAUOE-Portal-Login and https://www.scribd.com/document/988423832/UE-2018-POL-B-SC-ED4-0989
- Official IAUE contact page for ICT/academic enquiries: https://iaue.edu.ng/contact-us/

**IAUE conclusion:** The evidence does not support claiming that IAUE has no GPA/CGPA calculation. Student results appear to include GPA/CGPA, but current authenticated portal behavior and any planning gap remain unconfirmed. Validate directly before investing in integration.

### FUET
- Official FUET website and undergraduate programmes: https://fuet.edu.ng/
- Official FUET student ARIS portal: https://aris.fuet.edu.ng/index
- Official ARIS “About ARIS” page explicitly lists “computation of grades, grade points, and CGPA of students” as a system function: https://aris.fuet.edu.ng/office/about_aris
- Official FUET contact page: https://fuet.edu.ng/contact/

**FUET conclusion:** The official portal's own description is evidence that CGPA computation is part of ARIS. A second basic CGPA calculator is not yet justified. Any potential CGPA+ value should be validated around planning and projections, not assumed from the absence of a public calculator page.

### Other Rivers State institutions
- National Universities Commission (NUC), Nigerian University System directory, including ownership and state: https://enuc.nuc.edu.ng/nus
- Official University of Port Harcourt website: https://www.uniport.edu.ng/
- CGPA+ active implementation for UniPort: https://www.cgpaplus.name.ng/
- Official Rivers State University website: https://www.rsu.edu.ng/
- Secondary reporting on RSU's eCAMPUS Aspire app: https://myschoolnews.ng/rivers-state-university-launches-ecampus-aspire-mobile-app

## Next research steps

1. **Validate IAUE with current students and ICT:** Ask whether the live portal calculates semester GPA and cumulative CGPA, and whether students need projected CGPA, what-if grades, target planning, repeat-course scenarios or another feature the official portal does not provide.
2. **Validate FUET's actual student experience:** ARIS documents CGPA computation, so ask whether its results/CGPA function is available and reliable for students and whether projected CGPA or what-if planning is missing.
3. **Verify official academic rules before any build:** Obtain current authoritative undergraduate regulations for the relevant university and cohort. Confirm grade boundaries, grade points, credit weighting, repeat/carry-over rules, rounding, degree classification and programme/cohort exceptions. Do not rely on screenshots or third-party calculator sites for these rules.
4. **Build a verified course catalogue only if justified:** Use official handbooks and programme documents to verify faculties, departments, programmes, course codes, titles, credit units, semester/level and session validity. Do not invent missing courses.
5. **Validate calculations:** Compare sample GPA/CGPA calculations and edge cases with official examples or independently verified student results.
6. **Release gate:** Keep IAUE and FUET marked coming-soon until a specific unmet need, authoritative grading rules, verified catalogue coverage and calculation tests are all approved. Do not let either institution fall back to UniPort data.

## Current rollout decision

- **Enabled:** UniPort only.
- **Skip for basic calculation:** RSU, based on the user's confirmation; FUET, because its official ARIS description includes CGPA computation.
- **Needs validation / likely skip for basic calculation:** IAUE, because publicly available result artifacts show GPA/CGPA but the current authenticated portal functionality and student planning needs are not fully confirmed.
- **Potential future product angle:** If students at IAUE or FUET already receive GPA/CGPA in official results, test whether they still need CGPA+ for projected CGPA, what-if grades, target planning or easier academic tracking. Do not build or enable these institution-specific features until demand and the rules are verified.
- **Excluded:** Private universities in Rivers State.

This is desk research, not a claim that every student-facing portal feature has been independently tested. Portal login is restricted; direct student/ICT confirmation is still required before a final product decision.
