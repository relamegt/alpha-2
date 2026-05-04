const prisma = require('../config/db');
const pdfParse = require('pdf-parse');

function serializeSession(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.studentId,
        studentId: row.studentId,
        companyName: row.companyName,
        website: row.website,
        jobDescription: row.jobDescription,
        interviewType: row.interviewType,
        difficulty: row.difficulty,
        plannedDuration: row.plannedDuration,
        voiceName: row.voiceName,
        resumeUrl: row.resumeUrl,
        resumeText: row.resumeText,
        status: row.status,
        transcript: row.transcript ?? [],
        debrief: row.debrief ?? null,
        createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
        updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
}

exports.createSession = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const {
            companyName = '',
            website = '',
            jobDescription = '',
            interviewType = 'HR',
            difficulty = 'Medium',
            plannedDuration = 30,
            voiceName = 'Puck',
            resumeUrl = '',
            resumeText = '',
        } = req.body || {};

        const row = await prisma.interviewSession.create({
            data: {
                studentId,
                companyName: companyName || null,
                website: website || null,
                jobDescription: jobDescription || null,
                interviewType: String(interviewType),
                difficulty: String(difficulty),
                plannedDuration: Math.min(120, Math.max(5, Number(plannedDuration) || 30)),
                voiceName: voiceName || 'Puck',
                resumeUrl: resumeUrl || null,
                resumeText: resumeText || null,
                status: 'pending',
                transcript: [],
            },
        });

        res.status(201).json({ success: true, session: serializeSession(row) });
    } catch (err) {
        console.error('[interview] createSession', err);
        const msg = err?.message || 'Failed to create session';

        // Common when schema was edited but Prisma client wasn't regenerated / migrated.
        if (typeof msg === 'string' && msg.includes('Unknown argument `companyName`')) {
            return res.status(500).json({
                success: false,
                message:
                    'Backend Prisma client is out of date. Run: `npm run prisma:generate` and apply migrations (`npx prisma migrate deploy` for production, or `npx prisma migrate dev` locally). Then restart the backend.',
                debug: msg,
            });
        }

        res.status(500).json({ success: false, message: msg });
    }
};

exports.listSessions = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const rows = await prisma.interviewSession.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        res.json({ success: true, sessions: rows.map(serializeSession) });
    } catch (err) {
        console.error('[interview] listSessions', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to list sessions' });
    }
};

exports.getSession = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { id } = req.params;
        const row = await prisma.interviewSession.findFirst({
            where: { id, studentId },
        });
        if (!row) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        res.json({ success: true, session: serializeSession(row) });
    } catch (err) {
        console.error('[interview] getSession', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to load session' });
    }
};

exports.updateSession = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const { id } = req.params;
        const body = req.body || {};

        const existing = await prisma.interviewSession.findFirst({
            where: { id, studentId },
        });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const data = {};
        if (body.transcript !== undefined) data.transcript = body.transcript;
        if (body.debrief !== undefined) data.debrief = body.debrief;
        if (body.status !== undefined) data.status = String(body.status);
        if (body.resumeUrl !== undefined) data.resumeUrl = body.resumeUrl || null;
        if (body.feedbackSummary !== undefined) data.feedbackSummary = body.feedbackSummary;
        if (body.score !== undefined) data.score = body.score != null ? Number(body.score) : null;
        if (body.durationSeconds !== undefined) data.durationSeconds = body.durationSeconds != null ? Number(body.durationSeconds) : null;

        const row = await prisma.interviewSession.update({
            where: { id },
            data,
        });

        res.json({ success: true, session: serializeSession(row) });
    } catch (err) {
        console.error('[interview] updateSession', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to update session' });
    }
};

exports.parseResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const file = req.file;
        const name = (file.originalname || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase();

        const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
        if (!isPdf) {
            return res.status(400).json({
                success: false,
                message: 'Only PDF resumes are supported here. Please upload a .pdf file.',
            });
        }

        const parsed = await pdfParse(file.buffer);
        const text = (parsed.text || '').replace(/\s+\n/g, '\n').trim();

        if (!text) {
            return res.status(422).json({
                success: false,
                message: 'Could not extract text from this PDF (it may be scanned). Try exporting as text.',
            });
        }

        // Keep it bounded for prompt safety
        const clipped = text.slice(0, 15000);
        res.json({ success: true, text: clipped });
    } catch (err) {
        console.error('[interview] parseResume', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to parse resume PDF' });
    }
};
