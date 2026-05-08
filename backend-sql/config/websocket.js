const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { getRedis, getNewRedisClient } = require('./redis');

let wss;
const contestRooms = new Map();
let pubClient;
let subClient;

const REDIS_WS_CHANNEL = 'ALPHALEARN_WS_EVENTS';
const LEADERBOARD_THROTTLE_S = 3;
const SUBMISSION_THROTTLE_MS = 5000;

const initWebSocket = (server) => {
    wss = new WebSocket.Server({
        server,
        path: '/ws',
    });

    pubClient = getNewRedisClient();
    subClient = getNewRedisClient();

    subClient.subscribe(REDIS_WS_CHANNEL, (err) => {
        if (err) console.error('❌ Redis sub error:', err);
    });

    subClient.on('message', (channel, message) => {
        if (channel === REDIS_WS_CHANNEL) {
            try {
                const { contestId, data } = JSON.parse(message);
                broadcastToLocalContest(contestId, data);
            } catch (err) {
                console.error('❌ WS Message Error:', err);
            }
        }
    });

    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', () => ws.isAlive = true);
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleWebSocketMessage(ws, data);
            } catch (e) {}
        });

        ws.on('close', () => {
            if (ws.contestId && contestRooms.has(ws.contestId)) {
                contestRooms.get(ws.contestId).delete(ws);
            }
        });
    });

    setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    return wss;
};

const handleWebSocketMessage = async (ws, data) => {
    const { type, contestId: idOrSlug, token } = data;
    if (type === 'join' && token) {
        try {
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_ACCESS_SECRET);
            ws.userId = decoded.userId || decoded.id;
            
            // Resolve slug to UUID if necessary to ensure consistent room keys
            let contestId = idOrSlug;
            if (idOrSlug && idOrSlug !== 'global' && !/^[0-9a-fA-F-]{36}$/.test(idOrSlug)) {
                const Contest = require('../models/Contest');
                const contest = await Contest.findById(idOrSlug);
                if (contest) contestId = contest.id.toString();
            }

            ws.contestId = contestId;
            if (!contestRooms.has(contestId)) contestRooms.set(contestId, new Set());
            contestRooms.get(contestId).add(ws);
            ws.send(JSON.stringify({ type: 'joined', contestId }));
        } catch (e) {
            console.error('WebSocket join error:', e);
        }
    }
};

const broadcastToContest = (contestId, data) => {
    if (pubClient) {
        pubClient.publish(REDIS_WS_CHANNEL, JSON.stringify({ contestId: contestId.toString(), data }));
    }
};

const broadcastToLocalContest = (contestId, data) => {
    if (!contestRooms.has(contestId)) return;
    const message = JSON.stringify(data);
    contestRooms.get(contestId).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            if (data.targetUserId && String(client.userId) !== String(data.targetUserId)) return;
            client.send(message);
        }
    });
};

const notifyLeaderboardUpdate = async (contestId) => {
    broadcastToContest(contestId, { type: 'leaderboardRefetch', timestamp: new Date().toISOString() });
};

const notifySubmission = async (contestId, submission) => {
    broadcastToContest(contestId, { type: 'batchSubmissions', latestSubmission: submission, timestamp: new Date().toISOString() });
};

const notifyViolation = (contestId, userId, violation) => {
    broadcastToContest(contestId, { type: 'violation', targetUserId: userId.toString(), violation, timestamp: new Date().toISOString() });
};

const notifyExecutionResult = (contestId, userId, result) => {
    broadcastToContest(contestId, { 
        type: 'executionResult', 
        targetUserId: userId?.toString(), 
        result, 
        timestamp: new Date().toISOString() 
    });
};

const notifyViolationReset = (contestId, userId) => {
    broadcastToContest(contestId, { 
        type: 'violationReset', 
        targetUserId: userId.toString(), 
        timestamp: new Date().toISOString() 
    });
};

module.exports = {
    initWebSocket,
    broadcastToContest,
    notifyLeaderboardUpdate,
    notifySubmission,
    notifyViolation,
    notifyExecutionResult,
    notifyViolationReset
};
