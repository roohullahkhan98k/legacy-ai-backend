const { sequelize } = require('../common/database');
const User = require('../common/models/User');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function createBetaTesters() {
    console.log('🚀 Starting bulk creation of 12 Beta Testers...');

    try {
        await sequelize.authenticate();
        // Sync to ensure latest schema
        await User.sync({ alter: true });

        const users = [];
        const password = 'betaPassword123!'; // Common password for easy testing

        for (let i = 1; i <= 12; i++) {
            const uniqueId = crypto.randomBytes(4).toString('hex');
            const user = {
                email: `beta.tester.${i}.${uniqueId}@legacyai.com`,
                username: `beta_user_${i}_${uniqueId}`,
                password: password,
                firstName: 'Beta',
                lastName: `Tester ${i}`,
                role: 'beta_tester',
                isActive: true,
                isVerified: true
            };
            users.push(user);
        }

        console.log('\nCreating users...');
        const createdUsers = [];

        for (const userData of users) {
            try {
                const user = await User.create(userData);
                createdUsers.push({
                    email: userData.email,
                    username: userData.username,
                    password: userData.password,
                    role: user.role,
                    id: user.id
                });
                process.stdout.write('.'); // Progress indicator
            } catch (err) {
                console.error(`\n❌ Failed to create ${userData.email}:`, err.message);
            }
        }

        const outputPath = path.join(__dirname, '..', 'beta_users.json');
        fs.writeFileSync(outputPath, JSON.stringify(createdUsers, null, 2));
        console.log(`\n\n✅ Credentials saved to: ${outputPath}`);

        // Verification step
        const count = await User.count({ where: { role: 'beta_tester' } });
        console.log(`\n🔎 Total 'beta_tester' users in database: ${count}`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    }
}

createBetaTesters();
