# CGPA+ Public-University Rollout Validation

**Research date:** 11 October 2026  
**Product rule:** A university must not become calculation-enabled just because it is public or uses a familiar grading scale. Enable it only after (1) genuine student need is evidenced, (2) official grading rules are verified for the relevant programme/cohort/session, and (3) its course catalogue has been reviewed. Private universities are intentionally outside CGPA+'s target directory.

## Candidate review

| Candidate | Evidence about existing calculator/tools | Current decision |
|---|---|---|
| Rivers State University (RSU) | The user confirms RSU can calculate its own GPA/CGPA. A September 2025 report also describes RSU's eCAMPUS Aspire app as including CGPA prediction. | **Skip for now.** Do not prioritize unless students identify a meaningful gap the official tool does not address. |
| University of Nigeria, Nsukka (UNN) | The official Google Play listing for the UNN PRIDE app says students can view published results together with GPA and CGPA. The official QA unit links to undergraduate academic regulations, but the accessible PDF is labelled 2013/2014. | **Skip as a primary target for now.** Its official app already exposes GPA/CGPA. Revisit only if students report missing features such as what-if forecasting or course planning. |
| University of Lagos (UNILAG) | UNILAG has an official student portal and 2025 Student Life Cycle Guidelines covering grading, GPA and academic standing. Public sources reviewed do not conclusively establish whether students can calculate/forecast GPA/CGPA inside the authenticated portal. | **Unresolved.** Ask current UNILAG students about the portal before deciding whether there is a gap. Do not enable calculations yet. |
| Obafemi Awolowo University (OAU) | OAU has an official student information portal and published examination regulations explaining GPA calculation. The public pages reviewed do not prove whether students have an independent calculator or useful forecasting tools inside the authenticated portal. | **Next candidate to investigate.** Verify actual student-facing functionality and student need before spending time on catalogue/rules implementation. Do not enable calculations yet. |
| University of Ibadan (UI) | UI has an official student portal and an official Result Management System page that explicitly lists CGPA computation. The result system appears staff-facing behind sign-in, so that does not prove students have a calculator themselves. | **Do not prioritize without further evidence.** Ask students whether their student portal displays calculated GPA/CGPA and whether they need a separate planning tool. |

## Sources

### RSU
- Official RSU website: https://www.rsu.edu.ng/
- Report on RSU's eCAMPUS Aspire app, published 1 September 2025: https://myschoolnews.ng/rivers-state-university-launches-ecampus-aspire-mobile-app

### UNN
- Official UNN PRIDE app listing (says students can see results with GPA and CGPA): https://play.google.com/store/apps/details?id=ng.edu.unn.pride
- Official Quality Assurance Unit undergraduate regulations page: https://qau.unn.edu.ng/undergraduate-academic-regulations/
- Regulation PDF linked by the official QA unit (labelled 2013/2014): https://qau.unn.edu.ng/wp-content/uploads/sites/92/2023/12/010-Undergraduate-Academic-Regulation-1.pdf

### UNILAG
- Official 2025 Student Life Cycle Guidelines: https://unilag.edu.ng/wp-content/uploads/2025/04/Student-Life-Cycle-GUIDELINES-Hyperlinked.pdf
- Official student portal: https://studentportal.unilag.edu.ng/index.html

### OAU
- Official OAU student information portal: https://eportal.oauife.edu.ng/home.php
- Official OAU Examination Regulations PDF (published GPA calculation rules; older document, so confirm current policy): https://eportal.oauife.edu.ng/downloads/ExaminationREgulations.pdf

### UI
- Official UI student portal: https://student-portal.ui.edu.ng/login
- Official UI Result Management System (lists CGPA Computation; appears to be an authenticated results-management system): https://uirms.ui.edu.ng/

## Required release gate

1. **Need validation:** Ask students whether their own university portal calculates semester GPA and cumulative CGPA, whether it supports future-grade/what-if forecasting, and what is missing. Do not infer absence from a web search alone.
2. **Official rules:** Obtain current authoritative regulations for the relevant programme/cohort/session. Record grade boundaries, grade points, credit weighting, repeats/carry-overs, rounding and classification thresholds.
3. **Catalogue:** Verify faculties, departments, programmes, levels, semesters, course codes, titles, credit units and session validity from official sources. Never invent course rows.
4. **Testing:** Compare GPA/CGPA, failed/repeated courses, rounding and classification boundaries with independently verified examples.
5. **Release gate:** Keep a university marked coming-soon until need, rules, catalogue and tests are all approved. UniPort remains the only calculation-enabled university.

## Evidence limitations

This is desk research, not a guarantee that every student-facing portal feature has been identified. A university's staff result-management system or published grading rules do not prove that students have a useful self-service calculator. Third-party calculators do not prove the official portal is inadequate. No new university has been enabled by this research.
