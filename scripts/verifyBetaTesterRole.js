require('dotenv').config();
const { sequelize } = require('../common/database');
const User = require('../common/models/User');

async function verifyBetaTesterRole() {
    console.log('🧪 Starting verification for beta_tester role...');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Sync User model to ensure columns exist (fixes missing stripe_customer_id error if present)
        console.log('🔄 Syncing User model...');
        await User.sync({ alter: true });
        console.log('✅ User model synced');

        const testEmail = `test_beta_${Date.now()}@example.com`;
        const testUsername = `beta_tester_${Date.now()}`;

        console.log(`creating user with role: 'beta_tester'...`);

        let user;
        try {
            user = await User.create({
                email: testEmail,
                username: testUsername,
                password: 'password123',
                firstName: 'Test',
                lastName: 'Beta',
                role: 'beta_tester',
                isActive: true,
                isVerified: true
            });
        } catch (createError) {
            console.error("❌ CREATE FAILED");
            console.error("Name:", createError.name);
            console.error("Message:", createError.message);
            if (createError.errors) {
                createError.errors.forEach(e => console.error(` - ${e.message} (value: ${e.value})`));
            }
            process.exit(1);
        }

        if (user.role === 'beta_tester') {
            console.log('✅ User created successfully with role: beta_tester');
        } else {
            console.error(`❌ User created but role is: ${user.role}`);
            process.exit(1);
        }

        // 2. Fetch user from DB to be sure
        const fetchedUser = await User.findByPk(user.id);
        if (fetchedUser.role === 'beta_tester') {
            console.log('✅ Persisted user has correct role: beta_tester');
        } else {
            console.error(`❌ Persisted user role mismatch: ${fetchedUser.role}`);
            process.exit(1);
        }

        // 3. Clean up
        await user.destroy();
        console.log('✅ Test user cleaned up');

        console.log('🎉 Verification SUCCESS!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed (General):', error.message);
        process.exit(1);
    }
}

verifyBetaTesterRole();
