import { configureServices } from '../services/adapter.js';
import { academicService } from '../services/academic-service.js';
import { FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue.js';

const lookup = (rows, id) => rows.find(row => row.id === id)?.name || '';
const normalize = row => ({
  ...row,
  sessionName: row.sessionName || lookup(FALLBACK_SESSIONS, row.sessionId),
  semesterName: row.semesterName || lookup(FALLBACK_SEMESTERS, row.semesterId),
  levelName: row.levelName || lookup(FALLBACK_LEVELS, row.levelId),
});

export async function registerStudentResultFixes() {
  const originalGetResults = academicService.getResults;
  const originalGetResult = academicService.getResult;
  configureServices({
    academic: {
      getResults: async filters => (await originalGetResults(filters)).map(normalize),
      getResult: async resultId => {
        const result = await originalGetResult(resultId);
        return result ? normalize(result) : result;
      },
    },
  });
}
