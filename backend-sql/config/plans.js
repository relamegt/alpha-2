const PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Free Plan',
        price: 0,
        durationMonths: 0,
        features: {
            aiTokensPerDay: 5000,
            compilerPerDay: 20,
            submissionsPerDay: 20,
            aiInterviewsLimit: 0,
            allCourseAccess: false
        },
        displayFeatures: [
            'Access to 5,000 AI Tokens daily',
            '20 Compiler runs per day',
            '20 Code submissions per day',
            'Access to Free courses',
            'Community Support'
        ]
    },
    BASIC: {
        id: 'BASIC',
        name: 'Basic Plan',
        price: 499,
        durationMonths: 1,
        features: {
            aiTokensPerDay: 25000,
            compilerPerDay: 50,
            submissionsPerDay: 50,
            aiInterviewsLimit: 1,
            allCourseAccess: true
        },
        displayFeatures: [
            'Access to 25,000 AI Tokens daily',
            '50 Compiler runs per day',
            '50 Code submissions per day',
            'Unlock all premium courses',
            'Priority Community Support',
            'Course completion certificates'
        ]
    },
    PLUS: {
        id: 'PLUS',
        name: 'Plus Plan',
        price: 4999,
        durationMonths: 12,
        features: {
            aiTokensPerDay: 50000,
            compilerPerDay: 100,
            submissionsPerDay: 100,
            aiInterviewsLimit: 2,
            allCourseAccess: true
        },
        displayFeatures: [
            'Access to 50,000 AI Tokens daily',
            '100 Compiler runs per day',
            '100 Code submissions per day',
            'Unlock all premium courses for 1 year',
            'Exclusive workshop access',
            'Verified Profile badge'
        ]
    },
    PRO: {
        id: 'PRO',
        name: 'Pro Plan',
        price: 6999,
        durationMonths: 24,
        features: {
            aiTokensPerDay: 75000,
            compilerPerDay: 300,
            submissionsPerDay: 300,
            aiInterviewsLimit: 3,
            allCourseAccess: true
        },
        displayFeatures: [
            'Access to 75,000 AI Tokens daily',
            '300 Compiler runs per day',
            '300 Code submissions per day',
            'Full course access for 2 years',
            '1-on-1 Mentorship sessions',
            'Job referral assistance',
            'Pro verified profile badge'
        ]
    }
};

module.exports = { PLANS };
