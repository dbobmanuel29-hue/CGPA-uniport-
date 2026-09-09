/**
 * Backend payload contracts. These describe shapes, not seed data.
 * All IDs are backend-generated strings; dates crossing the boundary are ISO strings.
 * Collections may be returned as T[] or { items: T[] }.
 */

/** @typedef {{id:'UNIPORT', name:string, shortName:string, location:string, locked:true}} University */
/** @typedef {{id:string, universityId:'UNIPORT', name:string, code:string, status:string}} Faculty */
/** @typedef {{id:string, facultyId:string, facultyName?:string, name:string, code:string, status:string}} Department */
/** @typedef {{id:string, facultyId:string, departmentId:string, departmentName?:string, name:string, code:string, award:string, durationYears:number, status:string}} Programme */
/** @typedef {{id:string, programmeId:string, name:string, code:string, effectiveSessionId:string, status:string}} AcademicVersion */
/** @typedef {{id:string, academicVersionId:string, name:string, code:string, order:number, status:string}} Level */
/** @typedef {{id:string, academicVersionId:string, name:string, code:string, order:number, status:string}} Semester */
/** @typedef {{id:string, name:string, code:string, startDate:string, endDate:string, status:string}} AcademicSession */
/** @typedef {{id:string, code:string, title:string, credits:number, programmeId:string, academicVersionId:string, levelId:string, semesterId:string, status:string}} Course */
/** @typedef {{maxPoint:number, source:string, classifications:Array<{min:number,label:string}>}} GradingPolicy */

/** @typedef {{id:string, fullName:string, email:string, phone?:string, photoUrl?:string, accountStatus:string, emailVerified:boolean, onboardingComplete:boolean, role?:string, createdAt:string}} UserAccount */
/** @typedef {{universityId:'UNIPORT', facultyId:string, facultyName?:string, departmentId:string, departmentName?:string, programmeId:string, programmeName?:string, academicVersionId?:string, admissionSessionId:string, admissionSessionName?:string, currentLevelId:string, currentLevelName?:string, currentSessionId:string, currentSessionName?:string, currentSemesterId:string, currentSemesterName?:string, matriculationNumber?:string, phone?:string}} AcademicProfile */
/** @typedef {{code:string,title:string,credits:number,grade:string,points:number,sessionId:string,semesterId:string,levelId:string}} ResultInput */
/** @typedef {ResultInput & {id:string,sessionName:string,semesterName:string,levelName:string,qualityPoints:number,status:string}} AcademicResult */
/** @typedef {{cgpa:number,gpa:number,totalCredits:number,qualityPoints:number,maxPoint:number,classification?:string}} AcademicSummary */
/** @typedef {{id:string,title:string,message:string,type:string,read:boolean,createdAt:string}} Notification */
/** @typedef {{id:string,authorName:string,authorRole:string,message:string,createdAt:string,internal?:boolean}} SupportMessage */
/** @typedef {{id:string,studentName?:string,subject:string,category:string,description:string,priority:string,status:'open'|'in_progress'|'resolved'|'closed',createdAt:string,messages:SupportMessage[],internalNotes?:SupportMessage[],assigneeId?:string}} SupportTicket */
/** @typedef {{id:string,studentName:string,amount:number,currency:string,type:string,status:'pending'|'successful'|'failed'|'refunded',createdAt:string,providerReference?:string}} Transaction */
/** @typedef {{id:string,actorName:string,action:string,resource:string,resourceId:string,status:string,createdAt:string,ipAddress?:string,device?:string,description?:string}} AuditEvent */
/** @typedef {{id:string,studentName:string,sessionName?:string,createdAt:string,summary:AcademicSummary,courses:AcademicResult[]}} AcademicReportPreview */
/** @typedef {{periodLabel:string,metrics:Array<{label:string,value:string|number}>,columns:Array<{key:string,label:string}>,rows:Object[]}} PlatformReportPreview */

export {};