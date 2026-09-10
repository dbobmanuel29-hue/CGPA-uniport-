import { useEffect, useState } from 'react';
import { PageHeader, Button } from '../../components/ui';
import ExcelResultImporter from '../../components/ExcelResultImporter';
import { academicService } from '../../services/academic-service';

export default function ImportResults() {
  const [profile, setProfile] = useState(null);
  useEffect(() => { academicService.getProfile().then(setProfile).catch(() => {}); }, []);
  return <>
    <PageHeader eyebrow="IMPORT YOUR ACADEMIC HISTORY" title="Bring your results with you." description="Already keeping your GPA or CGPA data in Excel? Upload it and CGPA+ will translate the spreadsheet into academic results you can review and save." actions={<Button variant="outline" href="#/app/academic" endIcon="arrow">Back to academic record</Button>} />
    <ExcelResultImporter context={{ levelId: profile?.currentLevelId || '', sessionId: profile?.currentSessionId || '', semesterId: profile?.currentSemesterId || '' }} onImported={() => {}} />
  </>;
}
