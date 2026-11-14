const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PARCEL_STATUSES } = require('../constants/parcelleStatus');

const ValidationStatusSync = sequelize.define('ValidationStatusSync', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  parcel_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  statut: {
    type: DataTypes.ENUM(...PARCEL_STATUSES),
    allowNull: false,
  },
  actor_role: {
    type: DataTypes.ENUM('CADASTRE', 'NOTAIRE'),
    allowNull: false,
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  last_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'validation_status_syncs',
  timestamps: true,
  underscored: true,
});

module.exports = ValidationStatusSync;
