const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.timeSlot.findMany()
  const currentTimes = [...new Set(existing.map(s => `${s.startTime}-${s.endTime}`))]

  const requiredDays = ['Wed', 'Thu', 'Fri']
  let added = 0
  
  for (const day of requiredDays) {
    for (const cur of currentTimes) {
      const [start, end] = cur.split('-')
      const exists = existing.find(s => s.day === day && s.startTime === start)
      if (!exists) {
        await prisma.timeSlot.create({
          data: {
            day,
            startTime: start,
            endTime: end,
          }
        })
        added++
      }
    }
  }

  console.log(`Added ${added} timeslots for Wed, Thu, Fri!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
