import apiClient from './apiClient';

export async function parseResumePdf(file) {
    const form = new FormData();
    form.append('resume', file);

    const { data } = await apiClient.post('/interview/resume/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.message || 'Failed to parse resume');
    return data.text;
}

export async function createInterviewSession(payload) {
    const { data } = await apiClient.post('/interview/sessions', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create session');
    return data.session;
}

export async function listInterviewSessions() {
    const { data } = await apiClient.get('/interview/sessions');
    if (!data.success) throw new Error(data.message || 'Failed to load sessions');
    return data.sessions;
}

export async function getInterviewSession(id) {
    const { data } = await apiClient.get(`/interview/sessions/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to load session');
    return data.session;
}

export async function patchInterviewSession(id, payload) {
    const { data } = await apiClient.patch(`/interview/sessions/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update session');
    return data.session;
}
