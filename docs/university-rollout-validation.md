# CGPA+ Rivers State Rollout Research

**Research date:** 11 October 2026  
**Scope decision:** Focus CGPA+ on public universities located in Rivers State instead of researching public universities across Nigeria. Private universities remain outside the product directory. Being public does not automatically qualify a university: CGPA+ should target institutions where students have a genuine unmet need for GPA/CGPA calculation or academic planning.

## Rivers State public-university landscape

The NUC's Nigerian University System directory lists these public universities in Rivers State: University of Port Harcourt (federal), Rivers State University (state), Ignatius Ajuru University of Education (state), and Federal University of Environment and Technology (federal). The NUC directory also lists private institutions in Rivers State, but they are out of scope under the product decision.

Official source: https://enuc.nuc.edu.ng/nus

## Candidate decisions

| University | What was verified | Current decision |
|---|---|---|
| University of Port Harcourt (UniPort) | This is CGPA+'s existing launch institution. | **Supported.** Keep existing features working and treat UniPort as the reference implementation. |
| Rivers State University (RSU) | The user confirms RSU can calculate its own GPA/CGPA. A September 2025 report also describes the RSU eCAMPUS Aspire app as including CGPA prediction. | **Skip for now.** Do not spend rollout effort here unless RSU students later identify a specific unmet need beyond the existing tool. |
| Ignatius Ajuru University of Education (IAUE) | IAUE has an official university website and a student/enterprise portal that accepts email, matriculation/registration number, phone number or UIN for login. Publicly accessible pages reviewed do not establish whether students can calculate GPA/CGPA themselves inside the authenticated portal. | **First candidate to investigate.** Ask current IAUE students whether the portal calculates semester GPA and cumulative CGPA, whether it supports what-if/future-grade planning, and what is missing. Do not enable calculations until need, rules and course data are verified. |
| Federal University of Environment and Technology (FUET), Koroma/Saakpenwa | FUET is a federal public university in Rivers State. Its official website lists undergraduate programmes and academic sessions; its ARIS portal supports student login, clearance, fees and course registration. Public pages reviewed do not confirm whether it provides a student-facing GPA/CGPA calculator. The institution is new, so cohort and catalogue coverage require special care. | **Second candidate to investigate.** First confirm current enrolled cohorts, available programmes, grading policy, results availability and whether its student portal already computes GPA/CGPA. Do not enable calculations until all evidence is complete. |

## Official sources

### National university list
- National Universities Commission (NUC), Nigerian University System directory, including university ownership and state: https://enuc.nuc.edu.ng/nus

### UniPort
- Official University of Port Harcourt website: https://www.uniport.edu.ng/
- CGPA+ remains the active implementation for UniPort: https://www.cgpaplus.name.ng/

### RSU
- Official Rivers State University website: https://www.rsu.edu.ng/
- Report on RSU's eCAMPUS Aspire app, published 1 September 2025 (secondary reporting): https://myschoolnews.ng/rivers-state-university-launches-ecampus-aspire-mobile-app

### IAUE
- Official IAUE website and undergraduate programmes: https://iaue.edu.ng/admissions/undergraduate-studies/
- Official IAUE student/enterprise portal: https://www.enterpriseschoolsportal.iaue.edu.ng/Account/Login
- Official IAUE contact details for academic/ICT enquiries: https://iaue.edu.ng/contact-us/

### FUET
- Official FUET website and undergraduate programmes: https://fuet.edu.ng/
- Official FUET student ARIS portal: https://aris.fuet.edu.ng/index
- Official FUET about page describing its campuses and public-university status: https://fuet.edu.ng/about/

## Research plan for IAUE and FUET

1. **Ask students directly:** Does your official portal calculate semester GPA and cumulative CGPA automatically? Can you calculate a projected CGPA before taking exams? What do you still calculate manually? Which features would make CGPA+ useful?
2. **Check official portal access:** Review public help pages and ask the university ICT/student support desk when authenticated features cannot be verified from public pages. Do not infer that a feature is absent simply because it is not visible without login.
3. **Verify academic rules:** Obtain current, authoritative undergraduate regulations for each university and confirm grading scale, grade boundaries, credit weighting, repeat/carry-over rules, rounding, degree classification and programme/cohort exceptions.
4. **Build the course catalogue:** Use official handbooks and programme documents to verify faculties, departments, programmes, course codes, course titles, credit units, semester/level and academic-session validity. Do not invent missing courses.
5. **Validate calculations:** Compare sample GPA/CGPA calculations and edge cases with official examples or independently verified results.
6. **Release gate:** Keep IAUE and FUET marked coming-soon until student need, grading rules, catalogue coverage and calculation tests are all approved. Do not let either institution fall back to UniPort data.

## Current rollout decision

- **Enabled:** UniPort only.
- **Skip:** RSU, because the user confirms its own GPA/CGPA calculation is available.
- **Investigate next:** IAUE, then FUET.
- **Excluded:** Private universities in Rivers State, in line with the product scope.

This is initial desk research, not proof that IAUE or FUET lack official calculators. The student-facing features behind their portals must be confirmed before making a final decision or enabling calculations.
