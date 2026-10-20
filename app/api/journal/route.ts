import {journalApi} from '../../lib/journal-api';
export const runtime='nodejs';
export const GET=(request:Request)=>journalApi(request);
export const PUT=(request:Request)=>journalApi(request);
