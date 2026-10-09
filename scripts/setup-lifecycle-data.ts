import { connectDb } from '../src/server/db/connection'
import { Department, Lead, RateLimit, User } from '../src/server/db/models'
import { hashPassword } from '../src/server/auth/password'

async function setup() {
  await connectDb()
  console.log('Connected to DB')

  // 1. Clear rate limits
  await RateLimit.deleteMany({})
  console.log('Cleared rate limits')

  // 2. Fetch Trading Department
  const tradingDept = await Department.findOne({ code: 'TRADING' })
  if (!tradingDept) {
    console.error('Trading department not found!')
    process.exit(1)
  }

  // 3. Super Admin
  const admin = await User.findOne({ email: 'tulaib@gmail.com' })
  if (admin) {
    admin.passwordHash = await hashPassword('Tulaib123')
    admin.mustChangePassword = false
    await admin.save()
    console.log('Super Admin tulaib@gmail.com ready (pwd: Tulaib123)')
  }

  // 4. Trading Manager (Hamza Farooq)
  let manager = await User.findOne({ username: 'hamza.trading' })
  if (!manager) {
    manager = await User.create({
      name: 'Hamza Farooq',
      username: 'hamza.trading',
      email: 'trading.manager@volton.com',
      phone: '+923001234567',
      role: 'manager',
      departmentId: tradingDept._id,
      passwordHash: await hashPassword('HamzaManager@Volt2026'),
      mustChangePassword: false,
      isActive: true,
    })
    console.log('Created Trading Manager hamza.trading')
  } else {
    manager.passwordHash = await hashPassword('HamzaManager@Volt2026')
    manager.mustChangePassword = false
    manager.role = 'manager'
    manager.departmentId = tradingDept._id
    await manager.save()
    console.log('Updated Trading Manager hamza.trading')
  }

  // 5. Call Agent (Bilal Ahmed)
  let agent = await User.findOne({ username: 'bilal.agent' })
  if (!agent) {
    agent = await User.create({
      name: 'Bilal Ahmed',
      username: 'bilal.agent',
      email: 'bilal.agent@volton.com',
      phone: '+923007654321',
      role: 'agent',
      departmentId: tradingDept._id,
      managerId: manager._id,
      passwordHash: await hashPassword('BilalAgent@Volt2026'),
      mustChangePassword: false,
      isActive: true,
    })
    console.log('Created Agent bilal.agent')
  } else {
    agent.passwordHash = await hashPassword('BilalAgent@Volt2026')
    agent.mustChangePassword = false
    agent.role = 'agent'
    agent.departmentId = tradingDept._id
    agent.managerId = manager._id
    await agent.save()
    console.log('Updated Agent bilal.agent')
  }

  // 6. Remove any test lead for Kashif Abbasi
  await Lead.deleteMany({ 'source.rowKey': 'kashif-lifecycle-test' })
  console.log('Setup complete!')
  process.exit(0)
}

setup().catch((err) => {
  console.error(err)
  process.exit(1)
})
