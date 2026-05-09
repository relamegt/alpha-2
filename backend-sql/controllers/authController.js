const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const crypto = require('crypto');
const { getRedis } = require('../config/redis');
const { OAuth2Client } = require('google-auth-library');
const UAParser = require('ua-parser-js');
const prisma = require('../config/db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// OTP helpers — stored in Redis for multi-instance safety (TTL: 10 minutes)
const OTP_TTL_SECONDS = 10 * 60;
const getOtpKey = (email) => `otp:reset:${email}`;

// Generate device fingerprint
const generateFingerprint = (req) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        return crypto.createHash('sha256').update(`${userAgent}${ip}`).digest('hex');
    } catch (error) {
        console.error('Generate fingerprint error:', error);
        return crypto.randomBytes(32).toString('hex');
    }
};

// Mock email service (replace with actual service later)
const sendOTP = async (email, otp) => {
    console.log(`📧 OTP for ${email}: ${otp}`);
    // TODO: Implement actual email service
    return true;
};

const sendPasswordChangeConfirmation = async (email, name) => {
    console.log(`📧 Password change confirmation sent to ${email}`);
    // TODO: Implement actual email service
    return true;
};

const sendSessionLogoutNotification = async (email, name, deviceInfo) => {
    console.log(`📧 Session logout notification sent to ${email}: Your previous session on ${deviceInfo} was logged out automatically.`);
    // TODO: Implement actual email service
    return true;
};

// Login with optimized token versioning
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check active status
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated.'
            });
        }

        const tokenVersion = user.tokenVersion || 0;

        // Generate session record
        const userAgent = req.headers['user-agent'] || '';
        const parser = new UAParser(userAgent);
        const uaResults = parser.getResult();
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';

        const session = await prisma.session.create({
            data: {
                userId: user.id.toString(),
                tokenVersion: tokenVersion,
                deviceFingerprint: generateFingerprint(req),
                userAgent,
                browser: uaResults.browser.name || 'Unknown',
                os: uaResults.os.name || 'Unknown',
                ipAddress: ip,
                location: null,
            }
        });

        // Generate tokens with version and sessionId
        const accessToken = jwt.sign(
            { 
                userId: user.id.toString(), 
                email: user.email, 
                role: user.role, 
                studentType: user.studentType || 'ONLINE', 
                tokenVersion,
                sessionId: session.id 
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id.toString(), tokenVersion, sessionId: session.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Check if first login
        const isFirstLogin = user.isFirstLogin === true;

        res.json({
            success: true,
            message: 'Login successful',
            isFirstLogin,
            requiresProfileCompletion: isFirstLogin,
            tokens: {
                accessToken,
                refreshToken
            },
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                batchId: user.batchId,
                batchName: user.batchName,
                studentType: user.studentType || 'ONLINE',
                isOnline: user.isOnline || false,
                assignedBatches: user.assignedBatches || [],
                profile: user.profile,
                education: user.education,
                skills: user.skills || [],
                profileCompleted: user.profileCompleted || false,
                isPublicProfile: user.isPublicProfile !== false, // defaults to true if undefined
                isFirstLogin: user.isFirstLogin || false,
                isSpotUser: false
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Signup for manual account creation
const signup = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const newUser = await User.create({
            email,
            password,
            firstName,
            lastName,
            role: role || 'student',
            studentType: 'ONLINE',
            isFirstLogin: false, // Online students skip profile completion flow
            profileCompleted: true
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully. Please login.',
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Signup failed',
            error: error.message
        });
    }
};

// Google Login/Signup
const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: profilePicture } = payload;

        // Find user by Google ID or Email
        let user = await User.findByGoogleId(googleId);
        
        if (!user) {
            // Check if user exists with same email but was created manually
            user = await User.findByEmail(email);
            
            if (user) {
                // Link Google account to existing manual account
                await User.update(user.id, { googleId });
            } else {
                // Generate a temporary unique username for Google users
                const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const randomStr = crypto.randomBytes(2).toString('hex');
                const tempUsername = `${baseUsername.slice(0, 5)}${randomStr}`;

                // Create new user via Google
                user = await User.create({
                    email,
                    googleId,
                    username: tempUsername,
                    firstName,
                    lastName,
                    role: 'student',
                    studentType: 'ONLINE',
                    isFirstLogin: false, // Online students skip profile completion flow
                    profileCompleted: true,
                    profile: { profilePicture }
                });
            }
        }

        // Check active status
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated.'
            });
        }

        const tokenVersion = user.tokenVersion || 0;

        // Generate session record
        const userAgent = req.headers['user-agent'] || '';
        const parser = new UAParser(userAgent);
        const uaResults = parser.getResult();
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';

        const session = await prisma.session.create({
            data: {
                userId: user.id.toString(),
                tokenVersion: tokenVersion,
                deviceFingerprint: generateFingerprint(req),
                userAgent,
                browser: uaResults.browser.name || 'Unknown',
                os: uaResults.os.name || 'Unknown',
                ipAddress: ip,
                location: null,
            }
        });

        // Generate tokens
        const accessToken = jwt.sign(
            { 
                userId: user.id.toString(), 
                email: user.email, 
                role: user.role, 
                studentType: user.studentType || 'ONLINE', 
                tokenVersion,
                sessionId: session.id
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id.toString(), tokenVersion, sessionId: session.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful via Google',
            tokens: {
                accessToken,
                refreshToken
            },
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                batchId: user.batchId,
                batchName: user.batchName,
                studentType: user.studentType || 'ONLINE',
                isOnline: user.isOnline || false,
                googleId: user.googleId,
                profileCompleted: user.profileCompleted,
                isFirstLogin: user.isFirstLogin || false
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({
            success: false,
            message: 'Google login failed',
            error: error.message
        });
    }
};

// Complete first login profile
const completeFirstLoginProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            username,
            firstName,
            lastName,
            newPassword,
            profilePicture,
            phone,
            whatsapp,
            dob,
            gender,
            tshirtSize,
            address,
        } = req.body;


        // Validate required fields
        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required'
            });
        }

        // Get current user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isGoogleUser = !!user.googleId;

        if (!newPassword && !isGoogleUser) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            });
        }

        // Validate password strength if provided
        if (newPassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
                });
            }
        }

        // Educational fields validation for students
        if (user.role === 'student') {
            const { rollNumber, branch, institution, degree } = req.body;
            if (!rollNumber || !branch || !institution || !degree) {
                return res.status(400).json({
                    success: false,
                    message: 'All educational fields (Roll Number, Branch, Institution, Degree) are required for students'
                });
            }
        }

        // Validate username
        if (!username || username.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Username must be at least 3 characters long'
            });
        }
        if (username.trim().length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Username cannot be longer than 10 characters'
            });
        }
        const validUsernameRegex = /^[a-z0-9_.]+$/;
        if (!validUsernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username can only contain lowercase letters, numbers, dots and underscores'
            });
        }
        if (!/^[a-z]/.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username must start with a letter'
            });
        }

        let existingUser = await User.findByUsernameExact(username);
        // Exclude self if found (just in case they already claimed it somehow)
        if (existingUser && existingUser.id.toString() !== userId) {
            return res.status(400).json({
                success: false,
                message: 'Username is already taken'
            });
        }

        // Hash new password if provided
        let hashedPassword = user.password;
        if (newPassword) {
            hashedPassword = await bcrypt.hash(newPassword, 10);
        }

        // Validate address if provided (optional)
        if (address && typeof address !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Address data structure is invalid'
            });
        }
        // Prepare update data
        const updateData = {
            username: username.toLowerCase().trim(),
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            password: hashedPassword,
            isFirstLogin: false,
            profileCompleted: true,
            profile: {
                ...user.profile,
                profilePicture: profilePicture || user.profile?.profilePicture,
                phone: phone || user.profile?.phone,
                whatsapp: whatsapp || user.profile?.whatsapp,
                dob: dob || user.profile?.dob,
                gender: gender || user.profile?.gender,
                tshirtSize: tshirtSize || user.profile?.tshirtSize,
                address: {
                    ...user.profile?.address,
                    ...address
                }
            },
            education: user.role === 'student' ? {
                rollNumber: req.body.rollNumber,
                institution: req.body.institution,
                degree: req.body.degree,
                branch: req.body.branch,
                startYear: req.body.startYear,
                endYear: req.body.endYear
            } : user.education,
            updatedAt: new Date()
        };

        // Update user
        await User.update(userId, updateData);

        res.json({
            success: true,
            message: 'Profile completed successfully. Please login again with your new password.'
        });
    } catch (error) {
        console.error('Complete first login profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete profile',
            error: error.message
        });
    }
};

// Refresh access token (No DB writes, just version check)
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token required' });
        }

        // Verify signature
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        // Verify Token Version (Single session enforcement)
        // If versions don't match, it means another login happened later (invalidating this one)
        if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({
                success: false,
                message: 'Session valid elsewhere. Please login again.',
                code: 'SESSION_REPLACED'
            });
        }

        // Success: Issue new Access Token with SAME version
        // No DB update needed here -> Optimized!
        const newAccessToken = jwt.sign(
            {
                userId: user.id.toString(),
                email: user.email,
                role: user.role,
                studentType: user.studentType || 'ONLINE',
                tokenVersion: user.tokenVersion // Keep existing version
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '24h' }
        );

        // Reuse refresh token (it's valid until expiry or version bump)
        // We don't rotate refresh tokens to avoid write conflicts
        res.json({
            success: true,
            tokens: {
                accessToken: newAccessToken,
                refreshToken: refreshToken // Send back same refresh token (optional but clean)
            }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
            code: 'SESSION_EXPIRED'
        });
    }
};

// Logout (Invalidate current session version)
const logout = async (req, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.user.sessionId;

        // Delete specific session if sessionId is available
        if (sessionId) {
            await prisma.session.deleteMany({
                where: { id: sessionId, userId }
            });
        } else {
            // Fallback: Clear all sessions for this user (old behavior)
            await prisma.session.deleteMany({
                where: { userId }
            });
            await User.incrementTokenVersion(userId);
        }

        // Bust Redis auth cache
        try { await getRedis().del(`user:auth:${userId}`); } catch (e) { }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        // BUG #12 FIX: verifyToken middleware already validated the token using Redis cache
        // (no DB call for auth). This is the only DB call needed per /me request \u2014
        // one full findById for profile data. cachedAuthUser is auth-only (isActive etc.),
        // so we still fetch the full user document here for the profile response.
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                batchId: user.batchId,
                batchName: user.batchName,
                studentType: user.studentType || 'ONLINE',
                isOnline: user.isOnline || false,
                assignedBatches: user.assignedBatches || [],
                profile: user.profile,
                education: user.education,
                skills: user.skills,
                isActive: user.isActive,
                profileCompleted: user.profileCompleted || false,
                isPublicProfile: user.isPublicProfile !== false, // defaults to true if undefined
                isFirstLogin: user.isFirstLogin || false,
                isSpotUser: req.user.isSpotUser || false,
                registeredForContest: user.registeredForContest,
                planInstance: user.planInstance,
                dailyAiTokensUsed: user.dailyAiTokensUsed,
                dailyCompilerUsed: user.dailyCompilerUsed,
                dailySubmissionsUsed: user.dailySubmissionsUsed,
                dailyAiInterviewsUsed: user.dailyAiInterviewsUsed,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user data',
            error: error.message
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.updatePassword(userId, hashedPassword);

        // Clear all sessions (force re-login)
        await User.clearSession(userId);

        // Send confirmation email
        await sendPasswordChangeConfirmation(user.email, `${user.firstName} ${user.lastName}`);

        res.json({
            success: true,
            message: 'Password changed successfully. Please login again with your new password.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
};

// Forgot password - Send OTP
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            return res.json({
                success: true,
                message: 'If the email exists, an OTP has been sent'
            });
        }

        const redis = getRedis();

        // BUG #15 FIX: Check if a valid OTP already exists before generating a new one.
        const emailRateLimitKey = `ratelimit:otp:email:${email}`;
        const recentRequest = await redis.get(emailRateLimitKey);
        if (recentRequest) {
            return res.json({
                success: true,
                message: 'If the email exists, an OTP has been sent'
            });
        }

        // Mark this email as recently requested (60-second quiet period)
        await redis.setex(emailRateLimitKey, 60, '1');

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in Redis with 10-minute TTL
        await redis.setex(getOtpKey(email), OTP_TTL_SECONDS, otp);

        // Send OTP via email
        await sendOTP(email, otp);

        res.json({
            success: true,
            message: 'OTP sent to your email address. Valid for 10 minutes.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
};


// Reset password with OTP
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Verify OTP from Redis
        const redis = getRedis();
        const storedOtp = await redis.get(getOtpKey(email));
        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.updatePassword(user.id.toString(), hashedPassword);

        // Clear OTP from Redis
        await redis.del(getOtpKey(email));

        // Clear all sessions
        await User.clearSession(user.id.toString());

        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// Verify session
const verifySession = async (req, res) => {
    try {
        const user = req.cachedAuthUser || await User.findById(req.user.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session'
            });
        }

        res.json({
            success: true,
            message: 'Session is valid',
            user: {
                id: user.id,
                email: req.user.email,
                username: user.username,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Verify session error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid session',
            error: error.message
        });
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    getCurrentUser,
    changePassword,
    forgotPassword,
    resetPassword,
    verifySession,
    getSessions: async (req, res) => {
        try {
            const userId = req.user.userId;
            const sessionId = req.user.sessionId;

            let sessions = await prisma.session.findMany({
                where: { userId },
                orderBy: { lastActive: 'desc' }
            });

            // If the current request's session is not in the list (legacy token or missing record)
            const currentSessionExists = sessions.find(s => s.id === sessionId);
            
            if (!currentSessionExists) {
                // Create a record for this "legacy" or "missing" session
                const userAgent = req.headers['user-agent'] || '';
                const parser = new UAParser(userAgent);
                const uaResults = parser.getResult();
                const ip = req.ip || req.connection?.remoteAddress || 'unknown';

                try {
                    const newSession = await prisma.session.create({
                        data: {
                            userId,
                            tokenVersion: 0, 
                            deviceFingerprint: 'legacy-session',
                            userAgent,
                            browser: uaResults.browser.name || 'Unknown',
                            os: uaResults.os.name || 'Unknown',
                            ipAddress: ip,
                            location: null,
                        }
                    });
                    sessions = [newSession, ...sessions];
                } catch (createErr) {
                    console.error('Failed to create legacy session record:', createErr);
                }
            }

            res.json({ success: true, sessions });
        } catch (error) {
            console.error('Get sessions error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
        }
    },
    revokeSession: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.session.delete({
                where: { id, userId: req.user.userId }
            });
            res.json({ success: true, message: 'Session revoked' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to revoke session' });
        }
    },
    completeFirstLoginProfile,
    signup,
    googleLogin
};
