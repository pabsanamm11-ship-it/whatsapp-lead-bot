import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Hidden test account
  const hashedPassword = await bcrypt.hash('l$1AksaP84', 12)
  await prisma.user.upsert({
    where: { email: 'abacus-364566f6@example.com' },
    update: {},
    create: {
      email: 'abacus-364566f6@example.com',
      password: hashedPassword,
      name: 'Admin',
    },
  })

  // Sample template
  await prisma.template.upsert({
    where: { id: 'default-template' },
    update: {},
    create: {
      id: 'default-template',
      name: 'Saludo inicial',
      content: 'Hola {{name}}, le saluda EUKAL. Nos gustaría presentarle nuestros productos de limpieza natural. ¿Podemos agendar una llamada?',
    },
  })

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
