export class AirtableService {
    static getInstance() {
        console.warn('⚠️ Service Airtable désactivé - Migration vers Backend API');
        return {
            authenticate: () => Promise.reject(new Error('Airtable désactivé')),
            getRecords: () => Promise.reject(new Error('Airtable désactivé')),
            createRecord: () => Promise.reject(new Error('Airtable désactivé')),
            updateRecord: () => Promise.reject(new Error('Airtable désactivé')),
        };
    }
}

export default AirtableService;