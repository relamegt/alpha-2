const prisma           = require('../config/db');
const evaluationService = require('../services/evaluationService');
const githubService    = require('../services/githubService');
const crypto           = require('crypto');
const axios            = require('axios');
const AdmZip           = require('adm-zip');

// ── List all assignments ───────────────────────────────────
exports.list = async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      select: { id:true, title:true, type:true, difficulty:true, description:true }
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single assignment ──────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const a = await prisma.assignment.findUnique({
      where: { id: req.params.id }
    });
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get starter template (called by IDE container) ────────
exports.getTemplate = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).json({ error: 'No token' });

    const session = await prisma.iDESession.findFirst({ where: { token } });
    if (!session) return res.status(401).json({ error: 'Invalid token' });

    const a = await prisma.assignment.findUnique({
      where: { id: req.params.id }
    });
    if (!a) return res.status(404).json({ error: 'Not found' });

    const githubUrl = a.templateFiles?.githubUrl;
    if (!githubUrl) return res.status(404).json({ error: 'No template' });

    const response = await axios.get(githubUrl, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create IDE session token ───────────────────────────────
exports.createIDESession = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const token = crypto
      .createHmac('sha256', process.env.JWT_ACCESS_SECRET || 'secret')
      .update(`${req.user.userId}:${assignmentId}:${Date.now()}`)
      .digest('hex');

    await prisma.iDESession.upsert({
      where:  { userId_assignmentId: { userId: req.user.userId, assignmentId: assignmentId } },
      update: { token, createdAt: new Date() },
      create: { userId: req.user.userId, assignmentId: assignmentId, token }
    });

    res.json({ token, assignmentId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Validate IDE token (called from IDE container) ─────────
exports.validateIDEToken = async (req, res) => {
  try {
    const { token } = req.body;
    const session = await prisma.iDESession.findFirst({
      where: { token },
      include: { 
        user: { select: { id:true, username:true, email:true } },
        assignment: { select: { type: true, serviceStructure: true, defaultPorts: true } }
      }
    });
    if (!session) return res.json({ valid: false });
    res.json({ 
      valid: true, 
      userId: session.user.id, 
      username: session.user.username,
      assignmentType: session.assignment.type,
      serviceStructure: session.assignment.serviceStructure,
      defaultPorts: session.assignment.defaultPorts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Submit inline (HTML/CSS/JS) ────────────────────────────
exports.submitInline = async (req, res) => {
  try {
    const { html, css, js } = req.body;
    const assignmentId      = req.params.id;
    const assignment        = await prisma.assignment.findUnique({ where: { id: assignmentId } });

    const testResults = await evaluationService.evaluateInline({
      html, css, js,
      testCases: assignment.testCases
    });

    const score = testResults.filter(t => t.passed).length;
    const total = testResults.length;

    const submission = await prisma.assignmentSubmission.create({
      data: {
        userId:      req.user.userId,
        assignmentId,
        code:        { html, css, js },
        score:       total > 0 ? Math.round((score / total) * 100) : 0,
        passed:      score === total && total > 0,
        testResults
      }
    });

    res.json({ submissionId: submission.id, score: submission.score, passed: submission.passed, testResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Submit IDE (zip upload) ────────────────────────────────
exports.submitIDE = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const zip         = new AdmZip(req.file.buffer);
    const zipEntries  = zip.getEntries();
    const files       = {};
    zipEntries.forEach(e => {
      if (!e.isDirectory) files[e.entryName] = e.getData().toString('utf8');
    });

    const assignment  = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    const testResults = await evaluationService.evaluateIDE({ files, testCases: assignment.testCases });

    const score = testResults.filter(t => t.passed).length;
    const total = testResults.length;

    const submission = await prisma.assignmentSubmission.create({
      data: {
        userId:      req.user.userId,
        assignmentId,
        code:        files,
        score:       total > 0 ? Math.round((score / total) * 100) : 0,
        passed:      score === total && total > 0,
        testResults
      }
    });

    res.json({ submissionId: submission.id, score: submission.score, passed: submission.passed, testResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description = "", type, difficulty, templateFiles, testCases = [], serviceStructure, defaultPorts, readmeUrl } = req.body;
    const a = await prisma.assignment.create({
      data: { title, description, type, difficulty, templateFiles, testCases, serviceStructure, defaultPorts, readmeUrl }
    });
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Partial Update ─────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const a = await prisma.assignment.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Publish to GitHub ─────────────────────────────────────
exports.publishToGithub = async (req, res) => {
  try {
    const { id } = req.params;
    const { files, repoName } = req.body;

    // 1. Publish to Real GitHub
    const githubResult = await githubService.publishProject(repoName, files);

    // 2. Update assignment with the new GitHub URL and files
    await prisma.assignment.update({
      where: { id },
      data: {
        templateFiles: { 
          files, 
          githubUrl: githubResult.zipUrl,
          repoUrl: githubResult.repoUrl,
          publishedAt: new Date()
        }
      }
    });

    res.json({ success: true, url: githubResult.zipUrl });
  } catch (err) {
    console.error('[GitHub Publish Error]:', err.response?.data || err.message);
    res.status(500).json({ error: 'GitHub Sync Failed: ' + (err.response?.data?.message || err.message) });
  }
};

// ── Get Template (for IDE) ────────────────────────────────
exports.getTemplate = async (req, res) => {
  try {
    const a = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'Assignment not found' });
    
    // Return all template info (files or githubUrl)
    res.json(a.templateFiles || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
