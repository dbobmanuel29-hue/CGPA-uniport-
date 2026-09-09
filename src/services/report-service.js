import { createService } from './adapter.js';
export const reportService = createService('report', ['getReports', 'getReportPreview', 'generateReport', 'downloadReport', 'printReport']);