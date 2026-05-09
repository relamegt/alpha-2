const prisma = require('./config/db');

const DEFAULT_PLANS = [
    {
        name: "Basic Plan",
        price: 499,
        durationInDays: 30,
        description: "Monthly paid plan.",
        features: [
            "Access to all courses",
            "DSA sheets & resources",
            "Contest participation",
            "Interview experiences",
            "Articles & tutorials",
            "Community support"
        ],
        excludedFeatures: [
            "New course access",
            "Priority support"
        ],
        aiTokensLimit: 25000,
        compilerLimit: 50,
        submissionsLimit: 50,
        isPopular: false,
        gstEnabled: false,
        pricingOptions: [
            { label: "1 Month", duration: 30, price: 499, originalPrice: 999 }
        ]
    },
    {
        name: "Plus Plan",
        price: 4999,
        durationInDays: 365,
        description: "Yearly paid plan.",
        features: [
            "Access to all courses",
            "DSA sheets & resources",
            "Contest participation",
            "Interview experiences",
            "Articles & tutorials",
            "Community support",
            "Priority support"
        ],
        excludedFeatures: [
            "New course access"
        ],
        aiTokensLimit: 50000,
        compilerLimit: 100,
        submissionsLimit: 100,
        isPopular: true,
        gstEnabled: false,
        pricingOptions: [
            { label: "1 Year", duration: 365, price: 4999, originalPrice: 5999 },
            { label: "2 Years", duration: 730, price: 8999, originalPrice: 11999 }
        ]
    },
    {
        name: "Pro Plan",
        price: 6999,
        durationInDays: 730,
        description: "Two Year paid plan.",
        features: [
            "Access to all courses",
            "New course access",
            "DSA sheets & resources",
            "Contest participation",
            "Interview experiences",
            "Articles & tutorials",
            "Community support",
            "Priority support"
        ],
        excludedFeatures: [],
        aiTokensLimit: 75000,
        compilerLimit: 300,
        submissionsLimit: 300,
        isPopular: false,
        gstEnabled: false,
        pricingOptions: [
            { label: "2 Years", duration: 730, price: 6999, originalPrice: 9999 },
            { label: "Lifetime", duration: 3650, price: 14999, originalPrice: 24999 }
        ]
    }
];

async function main() {
    console.log('Seeding default plans...');
    for (const planData of DEFAULT_PLANS) {
        const existing = await prisma.subscriptionPlan.findFirst({
            where: { name: planData.name }
        });

        if (existing) {
            console.log(`Updating ${planData.name}...`);
            await prisma.subscriptionPlan.update({
                where: { id: existing.id },
                data: planData
            });
        } else {
            console.log(`Creating ${planData.name}...`);
            await prisma.subscriptionPlan.create({
                data: planData
            });
        }
    }
    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
