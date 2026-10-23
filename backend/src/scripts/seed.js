const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/db');
const User = require('../models/User');

const seedDatabase = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    const defaultPassword = process.env.SEED_PASSWORD || 'Fonciersur2026!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const users = [
      { nom: 'Diatta', prenom: 'Carla', email: 'promoteur@fonciersur.sn', role: 'PROMOTEUR' },
      { nom: 'Cadastre', prenom: 'Agent', email: 'cadastre@fonciersur.sn', role: 'CADASTRE' },
      { nom: 'Notaire', prenom: 'Maitre', email: 'notaire@fonciersur.sn', role: 'NOTAIRE' },
    ];

    for (const userData of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: {
          nom: userData.nom,
          prenom: userData.prenom,
          password: hashedPassword,
          role: userData.role,
        },
      });

      if (created) {
        console.log(`[SEED] Utilisateur ${userData.role} créé : ${userData.email}`);
      } else {
        console.log(`[SEED] Utilisateur ${userData.role} existe déjà : ${userData.email}`);
      }
    }

    console.log('Peuplement (Seed) de la base de données terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du seed :', error);
    process.exit(1);
  }
};

seedDatabase();